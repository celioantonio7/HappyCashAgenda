BEGIN;
-- Owner-only history. Never restore deleted records or bypass booking constraints.
CREATE TABLE public.agenda_audit_log (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 store_account_id uuid NOT NULL REFERENCES public.store_accounts(id),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 actor_user_id uuid,
 table_name text NOT NULL,
 record_id uuid NOT NULL,
 operation text NOT NULL CHECK (operation IN ('INSERT','UPDATE','DELETE')),
 before_data jsonb,
 after_data jsonb,
 changed_fields text[] NOT NULL DEFAULT '{}',
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 reverts_audit_id uuid REFERENCES public.agenda_audit_log(id),
 reason text
);
CREATE INDEX agenda_audit_store_time ON public.agenda_audit_log(store_account_id,created_at DESC);
ALTER TABLE public.agenda_audit_log ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agenda_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.agenda_audit_log TO authenticated;
CREATE POLICY audit_owner_read ON public.agenda_audit_log FOR SELECT TO authenticated
 USING (owner_user_id = (SELECT auth.uid()) AND agenda_private.owns_store(store_account_id));

CREATE FUNCTION agenda_private.audit_snapshot(p_data jsonb) RETURNS jsonb
LANGUAGE sql IMMUTABLE SET search_path = '' AS $$
 SELECT coalesce(jsonb_object_agg(key,CASE WHEN key ~* '(password|token|secret|credential|pix_key|session)' THEN to_jsonb('[valor protegido]'::text) ELSE value END),'{}'::jsonb)
 FROM jsonb_each(p_data);
$$;
REVOKE ALL ON FUNCTION agenda_private.audit_snapshot(jsonb) FROM PUBLIC;

CREATE FUNCTION agenda_private.capture_audit() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE old_data jsonb; new_data jsonb; row_data jsonb; fields text[]; raw_old jsonb; raw_new jsonb;
BEGIN
 IF TG_OP <> 'INSERT' THEN raw_old := to_jsonb(OLD); old_data := agenda_private.audit_snapshot(raw_old); END IF;
 IF TG_OP <> 'DELETE' THEN raw_new := to_jsonb(NEW); new_data := agenda_private.audit_snapshot(raw_new); END IF;
 row_data := coalesce(new_data,old_data);
 IF row_data->>'store_account_id' IS NULL OR row_data->>'owner_user_id' IS NULL THEN RETURN coalesce(NEW,OLD); END IF;
 SELECT array_agg(key ORDER BY key) INTO fields FROM (
  SELECT key FROM jsonb_object_keys(coalesce(raw_old,'{}') || coalesce(raw_new,'{}')) AS keys(key)
  WHERE raw_old->key IS DISTINCT FROM raw_new->key AND key <> 'updated_at'
 ) changes;
 IF TG_OP = 'UPDATE' AND fields IS NULL THEN RETURN NEW; END IF;
 INSERT INTO public.agenda_audit_log(store_account_id,owner_user_id,actor_user_id,table_name,record_id,operation,before_data,after_data,changed_fields,reverts_audit_id,reason)
 VALUES ((row_data->>'store_account_id')::uuid,(row_data->>'owner_user_id')::uuid,auth.uid(),TG_TABLE_NAME,(row_data->>'id')::uuid,TG_OP,old_data,new_data,coalesce(fields,'{}'),
 nullif(current_setting('agenda.audit_revert_id',true),'')::uuid,nullif(current_setting('agenda.audit_reason',true),''));
 RETURN coalesce(NEW,OLD);
END $$;
REVOKE ALL ON FUNCTION agenda_private.capture_audit() FROM PUBLIC;

DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['agenda_business_settings','appointments','appointment_services','services','barbers','business_hours','business_locations','agenda_clients','agenda_feed_posts'] LOOP
  IF to_regclass('public.' || t) IS NOT NULL THEN
   EXECUTE format('CREATE TRIGGER agenda_capture_audit AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION agenda_private.capture_audit()',t);
  END IF;
 END LOOP;
END $$;

CREATE FUNCTION public.agenda_revert_audit(p_audit_id uuid,p_reason text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE entry public.agenda_audit_log; current_data jsonb; assignments text; reverted_id uuid; allowed_fields text[];
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para continuar.'; END IF;
 IF length(trim(coalesce(p_reason,''))) < 5 OR length(p_reason) > 500 THEN RAISE EXCEPTION 'Informe um motivo de 5 a 500 caracteres.'; END IF;
 SELECT * INTO entry FROM public.agenda_audit_log WHERE id=p_audit_id FOR UPDATE;
 IF entry.id IS NULL OR entry.owner_user_id <> auth.uid() OR NOT agenda_private.owns_store(entry.store_account_id) THEN
  RAISE EXCEPTION 'Alteração indisponível para esta conta.';
 END IF;
 IF entry.reverts_audit_id IS NOT NULL THEN RAISE EXCEPTION 'Reversões não podem ser desfeitas automaticamente.'; END IF;
 IF entry.operation <> 'UPDATE' THEN RAISE EXCEPTION 'Criações e exclusões exigem correção manual para preservar vínculos e histórico.'; END IF;
 IF entry.table_name NOT IN ('agenda_business_settings','appointments','appointment_services','services','barbers','business_hours','business_locations','agenda_clients','agenda_feed_posts') THEN RAISE EXCEPTION 'Tipo de registro não suportado.'; END IF;
 IF EXISTS(SELECT 1 FROM public.agenda_audit_log WHERE reverts_audit_id=entry.id) THEN RAISE EXCEPTION 'Esta alteração já foi revertida.'; END IF;
 EXECUTE format('SELECT agenda_private.audit_snapshot(to_jsonb(t)) FROM public.%I t WHERE id=$1 AND store_account_id=$2 AND owner_user_id=$3 FOR UPDATE',entry.table_name)
 INTO current_data USING entry.record_id,entry.store_account_id,entry.owner_user_id;
 IF current_data IS NULL OR current_data IS DISTINCT FROM entry.after_data OR EXISTS (SELECT 1 FROM public.agenda_audit_log later WHERE later.table_name=entry.table_name AND later.record_id=entry.record_id AND later.created_at > entry.created_at) THEN
  RAISE EXCEPTION 'Este registro mudou depois desta ação. Revise a alteração mais recente.';
 END IF;
 -- Changes to identity, ownership and system timestamps are never replayed.
 SELECT array_agg(field) INTO allowed_fields
 FROM unnest(entry.changed_fields) field
 WHERE field NOT IN ('id','store_account_id','owner_user_id','created_at','updated_at','user_id','created_by')
 AND (entry.table_name = 'agenda_business_settings' OR
 (entry.table_name = 'appointments' AND field IN ('status','appointment_date','appointment_time','barber_id','service_id','notes','payment_method','payment_status')) OR
 (entry.table_name = 'appointment_services' AND field = 'service_id') OR
 (entry.table_name = 'services' AND field IN ('name','description','price','duration','duration_minutes','is_active','image_url')) OR
 (entry.table_name = 'barbers' AND field IN ('name','phone','email','photo_url','bio','is_active','commission','username')) OR
 (entry.table_name = 'business_hours' AND field IN ('day_of_week','opening_time','closing_time','is_open','break_start','break_end','opens_at','closes_at','open_time','close_time')) OR
 (entry.table_name = 'business_locations' AND field IN ('name','address','phone','google_maps_embed_url','is_active')) OR
 (entry.table_name = 'agenda_clients' AND field IN ('name','phone','email','notes')) OR
 (entry.table_name = 'agenda_feed_posts' AND field IN ('title','body','category','image_url','published','deleted_at'))) AND field !~* '(password|token|secret|credential|pix_key|session)';
 IF cardinality(allowed_fields) IS DISTINCT FROM cardinality(entry.changed_fields) THEN RAISE EXCEPTION 'Esta ação inclui campos protegidos. Faça a correção manualmente.'; END IF;
 SELECT string_agg(format('%1$I = restored.%1$I',field),', ') INTO assignments FROM unnest(allowed_fields) field;
 IF assignments IS NULL THEN RAISE EXCEPTION 'Esta alteração não possui campos reversíveis.'; END IF;
 PERFORM set_config('agenda.audit_revert_id',entry.id::text,true);
 PERFORM set_config('agenda.audit_reason',trim(p_reason),true);
 EXECUTE format('UPDATE public.%1$I target SET %2$s FROM jsonb_populate_record(NULL::public.%1$I,$1) restored WHERE target.id=$2 AND target.store_account_id=$3 AND target.owner_user_id=$4',entry.table_name,assignments)
 USING entry.before_data,entry.record_id,entry.store_account_id,entry.owner_user_id;
 PERFORM set_config('agenda.audit_revert_id','',true);
 PERFORM set_config('agenda.audit_reason','',true);
 SELECT id INTO reverted_id FROM public.agenda_audit_log WHERE reverts_audit_id=entry.id ORDER BY created_at DESC LIMIT 1;
 RETURN reverted_id;
END $$;
REVOKE ALL ON FUNCTION public.agenda_revert_audit(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.agenda_revert_audit(uuid,text) TO authenticated;

COMMIT;
