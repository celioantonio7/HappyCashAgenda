-- Run only in a disposable database restored from the production schema.
BEGIN;
GRANT USAGE ON SCHEMA public,auth,agenda_private,extensions TO anon,authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon,authenticated;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES
 ('71000000-0000-0000-0000-000000000001','owner-a@example.invalid','{"full_name":"Loja A"}'),
 ('71000000-0000-0000-0000-000000000002','owner-b@example.invalid','{"full_name":"Loja B"}');
INSERT INTO public.user_roles(user_id,role) VALUES('71000000-0000-0000-0000-000000000001','admin'),('71000000-0000-0000-0000-000000000002','admin');
INSERT INTO public.store_accounts(id,owner_user_id,test_access_ends_at) VALUES
 ('72000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001',now()+interval '30 days'),
 ('72000000-0000-0000-0000-000000000002','71000000-0000-0000-0000-000000000002',now()+interval '30 days');
INSERT INTO public.agenda_business_settings(owner_user_id,store_account_id,slug,display_name,service_mode,public_queue_visible) VALUES
 ('71000000-0000-0000-0000-000000000001','72000000-0000-0000-0000-000000000001','journey-a','Loja A','both',true),
 ('71000000-0000-0000-0000-000000000002','72000000-0000-0000-0000-000000000002','journey-b','Loja B','both',true);
DO $$BEGIN
 UPDATE public.agenda_business_settings SET slug='journey-a-new' WHERE slug='journey-a';
 IF public.resolve_public_business_slug('journey-a')<>'journey-a-new' THEN RAISE EXCEPTION 'Old slug did not resolve'; END IF;
 INSERT INTO public.agenda_business_settings(owner_user_id,store_account_id,slug,display_name)
 VALUES('71000000-0000-0000-0000-000000000001','72000000-0000-0000-0000-000000000001','journey-a','Loja A')
 ON CONFLICT(owner_user_id) DO UPDATE SET slug=excluded.slug;
 IF public.resolve_public_business_slug('journey-a-new')<>'journey-a' THEN RAISE EXCEPTION 'Own alias reclaim failed'; END IF;
 BEGIN
  UPDATE public.agenda_business_settings SET slug='journey-a-new' WHERE slug='journey-b';
  RAISE EXCEPTION 'Other shop stole alias';
 EXCEPTION WHEN unique_violation THEN NULL; END;
 IF public.resolve_public_business_slug('unknown-shop') IS NOT NULL THEN RAISE EXCEPTION 'Unknown slug opened another business'; END IF;
END $$;
INSERT INTO auth.users(id,email,raw_user_meta_data) VALUES('71000000-0000-0000-0000-000000000003','customer@example.invalid','{"full_name":"Cliente A","agenda_business_slug":"journey-a-new"}');
DO $$BEGIN
 IF (SELECT count(*) FROM public.agenda_clients WHERE user_id='71000000-0000-0000-0000-000000000003' AND store_account_id='72000000-0000-0000-0000-000000000001')<>1 THEN RAISE EXCEPTION 'Signup wrong shop'; END IF;
 IF (SELECT count(*) FROM public.agenda_notifications WHERE event_type='new_client' AND recipient_id='71000000-0000-0000-0000-000000000001')<>1 THEN RAISE EXCEPTION 'Missing owner new-client notification'; END IF;
END $$;
INSERT INTO public.barbers(id,name,store_account_id,owner_user_id) VALUES('73000000-0000-0000-0000-000000000001','Profissional','72000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001');
INSERT INTO public.services(id,name,price,duration_minutes,store_account_id,owner_user_id) VALUES('74000000-0000-0000-0000-000000000001','Corte',30,30,'72000000-0000-0000-0000-000000000001','71000000-0000-0000-0000-000000000001');
INSERT INTO public.business_hours(day_of_week,open_time,close_time,is_open,store_account_id,owner_user_id)
 SELECT day,'00:00','23:59',true,'72000000-0000-0000-0000-000000000001'::uuid,'71000000-0000-0000-0000-000000000001'::uuid FROM generate_series(0,6) day;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000003',true);
DO $$DECLARE apt uuid; queue_id uuid;BEGIN
 PERFORM public.register_agenda_client('journey-a');
 IF (SELECT count(*) FROM public.agenda_clients WHERE user_id=auth.uid())<>1 THEN RAISE EXCEPTION 'Duplicate client'; END IF;
 apt:=public.create_appointment_with_services('73000000-0000-0000-0000-000000000001','2035-01-02','10:00',ARRAY['74000000-0000-0000-0000-000000000001'::uuid],'Cliente A');
 BEGIN
  PERFORM public.create_appointment_with_services('73000000-0000-0000-0000-000000000001','2035-01-02','23:45',ARRAY['74000000-0000-0000-0000-000000000001'::uuid],'Cliente A');
  RAISE EXCEPTION 'Accepted service past close';
 EXCEPTION WHEN check_violation THEN NULL;END;
 queue_id:=public.create_walk_in_queue_entry('73000000-0000-0000-0000-000000000001',ARRAY['74000000-0000-0000-0000-000000000001'::uuid],'Cliente A');
 IF NOT EXISTS(SELECT 1 FROM public.appointments WHERE id=queue_id AND appointment_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date AND appointment_type='queue') THEN RAISE EXCEPTION 'Queue date not BRT'; END IF;
 IF (SELECT count(*) FROM public.get_public_waiting_queue('72000000-0000-0000-0000-000000000001'))<>1 THEN RAISE EXCEPTION 'Future appointment mixed with queue';END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','71000000-0000-0000-0000-000000000001',true);
DO $$DECLARE audit_id uuid;BEGIN
 UPDATE public.agenda_business_settings SET address='Endereço novo' WHERE slug='journey-a';
 SELECT id INTO audit_id FROM public.agenda_audit_log WHERE table_name='agenda_business_settings' AND changed_fields=ARRAY['address'] ORDER BY created_at DESC LIMIT 1;
 PERFORM public.agenda_revert_audit(audit_id,'Teste de reversão do endereço');
 IF NOT EXISTS(SELECT 1 FROM public.agenda_audit_log WHERE reverts_audit_id=audit_id) THEN RAISE EXCEPTION 'Reversal not audited';END IF;
END $$;
DO $$BEGIN RAISE NOTICE 'PASS full production schema: slug aliases/upsert isolation, signup enrollment/native event, hours, BRT queue, future exclusion and audited reversal'; END $$;
ROLLBACK;
