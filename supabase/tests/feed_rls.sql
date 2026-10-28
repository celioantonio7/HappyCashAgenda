-- Run in a disposable database after fixture + migration. All writes roll back.
BEGIN;
INSERT INTO auth.users(id) VALUES ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
INSERT INTO public.store_accounts(id,owner_user_id) VALUES ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001'),('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002');
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
SET LOCAL ROLE authenticated;
INSERT INTO public.agenda_feed_posts(store_account_id,owner_user_id,title,body,image_url,published)
VALUES ('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Published','Post body','https://example.com/photo.jpg',true),
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001','Draft','Draft body','https://example.com/photo.jpg',false);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.agenda_feed_posts)<>2 THEN RAISE EXCEPTION 'Owner cannot see own draft'; END IF;
 BEGIN
  INSERT INTO public.agenda_feed_posts(store_account_id,owner_user_id,title,body,image_url,published) VALUES ('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000002','Intruder','Body','https://example.com/a.jpg',true);
  RAISE EXCEPTION 'Cross tenant insert unexpectedly allowed';
 EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN IF (SELECT count(*) FROM public.agenda_feed_posts)<>1 THEN RAISE EXCEPTION 'Public can see draft or cannot see published'; END IF; END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
DO $$ BEGIN
 IF (SELECT count(*) FROM public.agenda_feed_posts)<>1 THEN RAISE EXCEPTION 'Other owner can see draft'; END IF;
 UPDATE public.agenda_feed_posts SET title='Stolen' WHERE title='Published';
 IF FOUND THEN RAISE EXCEPTION 'Other owner modified publication'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
UPDATE public.agenda_feed_posts SET deleted_at=now() WHERE title='Published';
SET LOCAL ROLE anon;
DO $$ BEGIN IF EXISTS (SELECT 1 FROM public.agenda_feed_posts) THEN RAISE EXCEPTION 'Deleted post visible'; END IF; END $$;
ROLLBACK;
