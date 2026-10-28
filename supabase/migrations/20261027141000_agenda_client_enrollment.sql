BEGIN;
-- Associate only an authenticated identity with its own client enrollment.
-- Email is display/contact data, never a key for linking a pre-existing client.
ALTER TABLE public.agenda_clients
 ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 ADD COLUMN user_email_confirmed boolean NOT NULL DEFAULT false;
CREATE UNIQUE INDEX agenda_clients_store_user_unique
 ON public.agenda_clients(store_account_id,user_id) WHERE user_id IS NOT NULL;

CREATE FUNCTION agenda_private.enroll_agenda_client(p_user_id uuid,p_slug text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE business public.agenda_business_settings; identity_row auth.users; canonical_slug text; client_name text; client_phone text;
BEGIN
 IF p_user_id IS NULL OR p_slug IS NULL OR length(p_slug)>63 OR p_slug !~ '^[a-z0-9][a-z0-9-]{1,62}$' THEN RETURN; END IF;
 canonical_slug := public.resolve_public_business_slug(p_slug);
 SELECT * INTO business FROM public.agenda_business_settings WHERE slug=canonical_slug AND public_booking_enabled;
 IF business.id IS NULL THEN RETURN; END IF;
 -- A professional visiting their own public page must not become a client.
 IF business.owner_user_id=p_user_id OR EXISTS(SELECT 1 FROM public.barbers WHERE store_account_id=business.store_account_id AND user_id=p_user_id) THEN RETURN; END IF;
 SELECT * INTO identity_row FROM auth.users WHERE id=p_user_id;
 IF identity_row.id IS NULL THEN RETURN; END IF;
 client_name := left(coalesce(nullif(trim(identity_row.raw_user_meta_data->>'full_name'),''),nullif(split_part(identity_row.email,'@',1),''),'Cliente'),200);
 client_phone := left(coalesce(identity_row.raw_user_meta_data->>'phone',identity_row.phone,''),40);
 INSERT INTO public.agenda_clients(name,phone,email,user_id,user_email_confirmed,owner_user_id,store_account_id)
 VALUES(client_name,client_phone,identity_row.email,identity_row.id,identity_row.email_confirmed_at IS NOT NULL,business.owner_user_id,business.store_account_id)
 ON CONFLICT(store_account_id,user_id) WHERE user_id IS NOT NULL DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION agenda_private.enroll_agenda_client(uuid,text) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.register_agenda_client(p_slug text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta para continuar.'; END IF;
 PERFORM agenda_private.enroll_agenda_client(auth.uid(),p_slug);
END $$;
REVOKE ALL ON FUNCTION public.register_agenda_client(text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.register_agenda_client(text) TO authenticated;

CREATE FUNCTION agenda_private.enroll_agenda_client_on_signup() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 -- Metadata selects a public business only; it never grants any authorization.
 PERFORM agenda_private.enroll_agenda_client(NEW.id,NEW.raw_user_meta_data->>'agenda_business_slug');
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION agenda_private.enroll_agenda_client_on_signup() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER zz_agenda_client_signup AFTER INSERT ON auth.users
 FOR EACH ROW EXECUTE FUNCTION agenda_private.enroll_agenda_client_on_signup();

CREATE FUNCTION agenda_private.sync_agenda_client_email_confirmation() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.agenda_clients SET user_email_confirmed=NEW.email_confirmed_at IS NOT NULL
 WHERE user_id=NEW.id AND user_email_confirmed IS DISTINCT FROM (NEW.email_confirmed_at IS NOT NULL);
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION agenda_private.sync_agenda_client_email_confirmation() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER agenda_client_email_confirmation AFTER UPDATE OF email_confirmed_at ON auth.users
 FOR EACH ROW WHEN (OLD.email_confirmed_at IS DISTINCT FROM NEW.email_confirmed_at)
 EXECUTE FUNCTION agenda_private.sync_agenda_client_email_confirmation();

COMMIT;
