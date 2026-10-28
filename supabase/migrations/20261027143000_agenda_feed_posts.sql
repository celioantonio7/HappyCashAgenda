BEGIN;
CREATE TABLE public.agenda_feed_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 store_account_id uuid NOT NULL REFERENCES public.store_accounts(id),
 owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 1 AND 120),
 body text NOT NULL CHECK (char_length(trim(body)) BETWEEN 1 AND 5000),
 category text NOT NULL DEFAULT 'Novidades' CHECK (char_length(category) BETWEEN 1 AND 40),
 image_url text NOT NULL CHECK (image_url ~ '^https://'),
 published boolean NOT NULL DEFAULT false,
 deleted_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX agenda_feed_store_date_idx ON public.agenda_feed_posts(store_account_id,created_at DESC);
ALTER TABLE public.agenda_feed_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agenda_feed_posts FROM anon, authenticated;
GRANT SELECT ON public.agenda_feed_posts TO anon, authenticated;
GRANT INSERT, UPDATE ON public.agenda_feed_posts TO authenticated;
CREATE POLICY agenda_feed_owner_select ON public.agenda_feed_posts FOR SELECT TO authenticated USING (agenda_private.owns_store(store_account_id));
CREATE POLICY agenda_feed_public_select ON public.agenda_feed_posts FOR SELECT TO anon, authenticated USING (published AND deleted_at IS NULL AND agenda_private.store_is_public(store_account_id));
CREATE POLICY agenda_feed_owner_insert ON public.agenda_feed_posts FOR INSERT TO authenticated WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
CREATE POLICY agenda_feed_owner_update ON public.agenda_feed_posts FOR UPDATE TO authenticated USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
CREATE TRIGGER agenda_feed_tenant BEFORE INSERT OR UPDATE ON public.agenda_feed_posts FOR EACH ROW EXECUTE FUNCTION agenda_private.fill_store();

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
VALUES ('agenda-feed','agenda-feed',true,5242880,ARRAY['image/jpeg','image/png','image/webp']) ON CONFLICT (id) DO NOTHING;
-- Public image URLs load through the public bucket endpoint; object listing is owner-only.
CREATE POLICY agenda_feed_image_read ON storage.objects FOR SELECT TO authenticated USING (
 bucket_id='agenda-feed' AND EXISTS (SELECT 1 FROM public.store_accounts a WHERE a.id::text=(storage.foldername(name))[1] AND agenda_private.owns_store(a.id))
);
CREATE POLICY agenda_feed_image_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (
 bucket_id='agenda-feed' AND EXISTS (SELECT 1 FROM public.store_accounts a WHERE a.id::text=(storage.foldername(name))[1] AND agenda_private.owns_store(a.id))
);
-- Images use unique immutable object keys. Publication removal is reversible and retains its image.

COMMIT;
