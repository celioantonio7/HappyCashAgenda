DO $$
DECLARE owner_id uuid := gen_random_uuid(); other_id uuid := gen_random_uuid(); store_id uuid := gen_random_uuid(); row_id uuid := gen_random_uuid(); edit_id uuid; reversal_id uuid; stale_id uuid;
BEGIN
 INSERT INTO auth.users VALUES(owner_id),(other_id);
 INSERT INTO public.store_accounts VALUES(store_id,owner_id);
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 INSERT INTO public.services(id,store_account_id,owner_user_id,name,price,password_hash) VALUES(row_id,store_id,owner_id,'Corte',30,'NEVER_LOG');
 UPDATE public.services SET price=40 WHERE id=row_id;
 SELECT id INTO edit_id FROM public.agenda_audit_log WHERE record_id=row_id AND operation='UPDATE';
 IF EXISTS(SELECT 1 FROM public.agenda_audit_log WHERE coalesce(before_data::text,'') || coalesce(after_data::text,'') LIKE '%NEVER_LOG%') THEN RAISE EXCEPTION 'Secret leaked'; END IF;
 PERFORM set_config('request.jwt.claim.sub',other_id::text,true);
 SET LOCAL ROLE authenticated;
 IF EXISTS(SELECT 1 FROM public.agenda_audit_log) THEN RAISE EXCEPTION 'Audit RLS leaked another tenant'; END IF;
 RESET ROLE;
 BEGIN PERFORM public.agenda_revert_audit(edit_id,'Corrigir preço'); RAISE EXCEPTION 'Wrong owner permitted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Wrong owner permitted' THEN RAISE; END IF; END;
 PERFORM set_config('request.jwt.claim.sub',owner_id::text,true);
 SET LOCAL ROLE authenticated;
 IF NOT EXISTS(SELECT 1 FROM public.agenda_audit_log) THEN RAISE EXCEPTION 'Owner cannot read history'; END IF;
 RESET ROLE;
 reversal_id := public.agenda_revert_audit(edit_id,'Corrigir preço');
 IF (SELECT price FROM public.services WHERE id=row_id) <> 30 THEN RAISE EXCEPTION 'Price not restored'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.agenda_audit_log WHERE id=reversal_id AND reverts_audit_id=edit_id AND reason='Corrigir preço' AND actor_user_id=owner_id) THEN RAISE EXCEPTION 'Missing reversal trace'; END IF;
 IF (SELECT password_hash FROM public.services WHERE id=row_id) <> 'NEVER_LOG' THEN RAISE EXCEPTION 'Secret overwritten'; END IF;
 BEGIN PERFORM public.agenda_revert_audit(reversal_id,'Undo reversal'); RAISE EXCEPTION 'Reversal reversed'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Reversal reversed' THEN RAISE; END IF; END;
 UPDATE public.services SET price=60 WHERE id=row_id;
 SELECT id INTO stale_id FROM public.agenda_audit_log WHERE record_id=row_id ORDER BY created_at DESC LIMIT 1;
 UPDATE public.services SET name='Corte novo' WHERE id=row_id;
 BEGIN PERFORM public.agenda_revert_audit(stale_id,'Stale action'); RAISE EXCEPTION 'Stale permitted'; EXCEPTION WHEN raise_exception THEN IF SQLERRM='Stale permitted' THEN RAISE; END IF; END;
 UPDATE public.services SET price=0 WHERE id=row_id;
 SELECT id INTO edit_id FROM public.agenda_audit_log WHERE record_id=row_id ORDER BY created_at DESC LIMIT 1;
 -- A new business constraint must be respected during reversal too.
 ALTER TABLE public.services ADD CONSTRAINT test_max_price CHECK(price <= 40);
 BEGIN PERFORM public.agenda_revert_audit(edit_id,'Constraint test'); RAISE EXCEPTION 'Constraint bypass'; EXCEPTION WHEN check_violation THEN NULL; END;
 IF (SELECT price FROM public.services WHERE id=row_id) <> 0 THEN RAISE EXCEPTION 'Failed reversal partially applied'; END IF;
 RAISE NOTICE 'PASS owner isolation, secret redaction, update reversal, trace/reason/actor, reversal recursion, stale action, constraints and atomic failure';
END $$;
