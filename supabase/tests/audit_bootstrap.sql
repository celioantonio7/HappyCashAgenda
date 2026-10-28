CREATE SCHEMA auth;
CREATE SCHEMA agenda_private;
CREATE TABLE auth.users(id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.store_accounts(id uuid PRIMARY KEY, owner_user_id uuid);
CREATE FUNCTION agenda_private.owns_store(uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT EXISTS(SELECT 1 FROM public.store_accounts WHERE id=$1 AND owner_user_id=auth.uid()) $$;
CREATE TABLE public.services(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),store_account_id uuid,owner_user_id uuid,name text,price numeric CHECK(price >= 0),password_hash text);

GRANT USAGE ON SCHEMA auth, agenda_private TO authenticated;
