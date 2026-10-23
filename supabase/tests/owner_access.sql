-- Execute em um banco de testes com a migration aplicada. Todas as fixtures sao revertidas.
BEGIN;
INSERT INTO auth.users(id,email) VALUES
 ('00000000-0000-4000-a000-000000000001','owner-a@agenda.test'),
 ('00000000-0000-4000-a000-000000000002','owner-b@agenda.test'),
 ('00000000-0000-4000-a000-000000000003','client@agenda.test');
INSERT INTO public.user_roles(user_id,role) VALUES('00000000-0000-4000-a000-000000000001','admin'),('00000000-0000-4000-a000-000000000002','admin');
INSERT INTO public.store_accounts(id,owner_user_id,test_access_ends_at) VALUES
 ('10000000-0000-4000-a000-000000000001','00000000-0000-4000-a000-000000000001',now()+interval '1 day'),
 ('10000000-0000-4000-a000-000000000002','00000000-0000-4000-a000-000000000002',now()+interval '1 day');
INSERT INTO public.agenda_business_settings(owner_user_id,store_account_id,slug,display_name) VALUES
 ('00000000-0000-4000-a000-000000000001','10000000-0000-4000-a000-000000000001','test-a','A'),
 ('00000000-0000-4000-a000-000000000002','10000000-0000-4000-a000-000000000002','test-b','B');
INSERT INTO public.barbers(id,name,store_account_id) VALUES('20000000-0000-4000-a000-000000000001','Profissional A','10000000-0000-4000-a000-000000000001');
INSERT INTO public.services(id,name,price,duration_minutes,store_account_id) VALUES
 ('30000000-0000-4000-a000-000000000001','Corte',40,30,'10000000-0000-4000-a000-000000000001'),
 ('30000000-0000-4000-a000-000000000002','Servico B',80,30,'10000000-0000-4000-a000-000000000002');
INSERT INTO public.agenda_clients(name,store_account_id) VALUES('Privado A','10000000-0000-4000-a000-000000000001'),('Privado B','10000000-0000-4000-a000-000000000002');
INSERT INTO public.agenda_products(id,name,price,stock_quantity,store_account_id) VALUES('40000000-0000-4000-a000-000000000001','Pomada',25,5,'10000000-0000-4000-a000-000000000001');
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.agenda_clients)<>1 THEN RAISE EXCEPTION 'FAIL: isolamento entre donos'; END IF;
 IF NOT agenda_private.owns_store('10000000-0000-4000-a000-000000000001') THEN RAISE EXCEPTION 'FAIL: dono sem acesso'; END IF;
 IF agenda_private.owns_store('10000000-0000-4000-a000-000000000002') THEN RAISE EXCEPTION 'FAIL: acesso a outra empresa'; END IF;
END $$;
INSERT INTO public.agenda_clients(name) VALUES('Criado pelo dono');
SELECT public.set_barber_password('20000000-0000-4000-a000-000000000001','test-professional','TestPassword!2026');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000003',true);
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.agenda_clients) THEN RAISE EXCEPTION 'FAIL: cliente lendo lista privada'; END IF;
 BEGIN INSERT INTO public.user_roles(user_id,role) VALUES(auth.uid(),'admin'); RAISE EXCEPTION 'FAIL: cliente virou admin'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN INSERT INTO public.agenda_clients(name,store_account_id) VALUES('Invasao','10000000-0000-4000-a000-000000000001'); RAISE EXCEPTION 'FAIL: cliente escreveu no painel'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN UPDATE public.store_accounts SET test_access_ends_at=now()+interval '1 year'; RAISE EXCEPTION 'FAIL: cliente liberou teste'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.create_appointment_with_services('20000000-0000-4000-a000-000000000001',current_date+2,'10:00',ARRAY['30000000-0000-4000-a000-000000000002']::uuid[],'Cliente'); RAISE EXCEPTION 'FAIL: servico de outra empresa aceito'; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
END $$;
SELECT public.create_appointment_with_services('20000000-0000-4000-a000-000000000001',current_date+2,'10:00',ARRAY['30000000-0000-4000-a000-000000000001']::uuid[],'Cliente');
SELECT public.reschedule_client_appointment(id,current_date+3,'11:00') FROM public.appointments;
SELECT public.create_agenda_product_order('10000000-0000-4000-a000-000000000001','[{"product_id":"40000000-0000-4000-a000-000000000001","quantity":2,"price":0.01}]','Cliente');
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claim.sub','',true);
DO $$ DECLARE token text; BEGIN
 BEGIN PERFORM password_hash FROM public.barbers; RAISE EXCEPTION 'FAIL: hash publico'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM public.get_barber_appointments('20000000-0000-4000-a000-000000000001',NULL); RAISE EXCEPTION 'FAIL: funcionario sem sessao'; EXCEPTION WHEN raise_exception THEN IF SQLERRM LIKE 'FAIL:%' THEN RAISE; END IF; END;
 SELECT session_token INTO token FROM public.authenticate_barber('test-professional','TestPassword!2026');
 IF token IS NULL OR NOT public.verify_barber_session('20000000-0000-4000-a000-000000000001',token) THEN RAISE EXCEPTION 'FAIL: login profissional'; END IF;
 IF (SELECT count(*) FROM public.get_barber_appointments('20000000-0000-4000-a000-000000000001',token))<>1 THEN RAISE EXCEPTION 'FAIL: agenda profissional'; END IF;
END $$;
SET LOCAL ROLE postgres;
DO $$ BEGIN
 IF (SELECT total_amount FROM public.agenda_product_orders WHERE client_name='Cliente')<>50 THEN RAISE EXCEPTION 'FAIL: preco nao veio do banco'; END IF;
 IF (SELECT stock_quantity FROM public.agenda_products WHERE id='40000000-0000-4000-a000-000000000001')<>3 THEN RAISE EXCEPTION 'FAIL: estoque'; END IF;
END $$;
UPDATE public.store_accounts SET test_access_ends_at=now()-interval '1 day' WHERE id='10000000-0000-4000-a000-000000000001';
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-a000-000000000001',true);
DO $$ BEGIN IF agenda_private.owns_store('10000000-0000-4000-a000-000000000001') THEN RAISE EXCEPTION 'FAIL: teste expirado liberou painel'; END IF; END $$;
ROLLBACK;
\echo 'PASS: dono, cliente, isolamento entre empresas, profissional, pedidos e expiracao'
