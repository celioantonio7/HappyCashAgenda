BEGIN;
-- A photo can be published without a caption; existing posts remain unchanged.
ALTER TABLE public.agenda_feed_posts
 DROP CONSTRAINT agenda_feed_posts_body_check,
 ADD CONSTRAINT agenda_feed_posts_body_check CHECK (char_length(body) <= 5000);
COMMIT;
