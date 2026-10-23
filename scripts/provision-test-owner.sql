-- Executar apenas pelo operador do banco, depois de aplicar agenda_owner_access.
-- Nao altera senha, nao registra pagamento e nao envia email.
DO $$
DECLARE owner_id uuid; store_id uuid;
BEGIN
 SELECT id INTO STRICT owner_id FROM auth.users WHERE lower(email)='celioantonio.dev@gmail.com';
 INSERT INTO public.store_accounts(owner_user_id,test_access_ends_at)
 VALUES(owner_id,now()+interval '7 days')
 ON CONFLICT(owner_user_id,product_context) DO UPDATE SET test_access_ends_at=EXCLUDED.test_access_ends_at
 RETURNING id INTO store_id;
 UPDATE public.profiles SET owner_user_id=owner_id WHERE id=owner_id;
 INSERT INTO public.user_roles(user_id,role) VALUES(owner_id,'admin') ON CONFLICT(user_id,role) DO NOTHING;
 INSERT INTO public.agenda_business_settings(owner_user_id,store_account_id,slug,display_name)
 VALUES(owner_id,store_id,'barbearia-celio-teste','Barbearia de Teste')
 ON CONFLICT(owner_user_id) DO NOTHING;
 INSERT INTO public.business_hours(day_of_week,open_time,close_time,is_open,owner_user_id,store_account_id)
 SELECT d,'09:00','19:30',d<>0,owner_id,store_id FROM generate_series(0,6) d
 ON CONFLICT(store_account_id,day_of_week) DO NOTHING;
END $$;
