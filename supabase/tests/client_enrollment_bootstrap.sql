-- Minimal schema for disposable test database only.
CREATE SCHEMA auth;
CREATE SCHEMA agenda_private;
CREATE TABLE auth.users(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text,phone text,raw_user_meta_data jsonb DEFAULT '{}',email_confirmed_at timestamptz);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE TABLE public.store_accounts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),owner_user_id uuid);
CREATE TABLE public.agenda_business_settings(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),slug text UNIQUE,owner_user_id uuid,store_account_id uuid,public_booking_enabled boolean DEFAULT true);
CREATE TABLE public.barbers(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid,store_account_id uuid);
CREATE TABLE public.agenda_clients(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),name text NOT NULL,phone text NOT NULL DEFAULT '',email text,owner_user_id uuid,store_account_id uuid);
CREATE FUNCTION public.resolve_public_business_slug(p_slug text) RETURNS text LANGUAGE sql STABLE AS $$ SELECT CASE WHEN p_slug='old-a' THEN 'barber-a' ELSE p_slug END $$;
GRANT USAGE ON SCHEMA public, auth TO authenticated;
