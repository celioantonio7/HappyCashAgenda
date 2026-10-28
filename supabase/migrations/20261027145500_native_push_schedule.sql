BEGIN;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
REVOKE ALL ON net.http_request_queue FROM PUBLIC,anon,authenticated;
REVOKE ALL ON net._http_response FROM PUBLIC,anon,authenticated;
-- Secrets are provisioned separately into Vault, never committed to source.
CREATE FUNCTION agenda_private.dispatch_native_push() RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE endpoint text; secret text; request_id bigint;
BEGIN
 SELECT decrypted_secret INTO endpoint FROM vault.decrypted_secrets WHERE name='agenda_push_dispatch_url' LIMIT 1;
 SELECT decrypted_secret INTO secret FROM vault.decrypted_secrets WHERE name='agenda_push_cron_secret' LIMIT 1;
 IF endpoint IS NULL OR secret IS NULL THEN RETURN NULL; END IF;
 SELECT net.http_post(url:=endpoint,headers:=jsonb_build_object('Content-Type','application/json','x-agenda-cron-secret',secret),body:='{}'::jsonb,timeout_milliseconds:=10000) INTO request_id;
 RETURN request_id;
END $$;
REVOKE ALL ON FUNCTION agenda_private.dispatch_native_push() FROM PUBLIC,anon,authenticated;
SELECT cron.schedule('agenda-native-push-dispatch','* * * * *','select agenda_private.dispatch_native_push();');
COMMIT;
