-- Evita ambiguidade com o novo alias profiles.user_id.
CREATE OR REPLACE FUNCTION public.verify_email_phone(p_email text,p_phone text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE v_user_id uuid; v_phone text;
BEGIN
 SELECT u.id INTO v_user_id FROM auth.users u WHERE u.email=p_email LIMIT 1;
 IF v_user_id IS NULL THEN RETURN 'email_not_found'; END IF;
 SELECT p.phone INTO v_phone FROM public.profiles p WHERE p.id=v_user_id LIMIT 1;
 IF v_phone IS NULL THEN RETURN 'phone_not_found'; END IF;
 IF regexp_replace(v_phone,'\D','','g')<>regexp_replace(p_phone,'\D','','g') THEN RETURN 'mismatch'; END IF;
 RETURN 'ok';
END $$;
