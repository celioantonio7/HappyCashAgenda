BEGIN;
-- Device keys and delivery state stay outside the exposed API schema.
CREATE TABLE agenda_private.push_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
 barber_id uuid REFERENCES public.barbers(id) ON DELETE CASCADE,
 store_account_id uuid NOT NULL REFERENCES public.store_accounts(id) ON DELETE CASCADE,
 endpoint text NOT NULL CHECK (length(endpoint)<4096), subscription jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz,
 UNIQUE(endpoint,store_account_id),
 CHECK ((user_id IS NOT NULL) <> (barber_id IS NOT NULL))
);
ALTER TABLE agenda_private.push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON agenda_private.push_subscriptions FROM PUBLIC,anon,authenticated;
CREATE TABLE agenda_private.push_deliveries (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 subscription_id uuid NOT NULL REFERENCES agenda_private.push_subscriptions(id) ON DELETE CASCADE,
 notification_id uuid NOT NULL REFERENCES public.agenda_notifications(id) ON DELETE CASCADE,
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 sent_at timestamptz, failed_at timestamptz, last_error text,
 UNIQUE(subscription_id,notification_id)
);
ALTER TABLE agenda_private.push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON agenda_private.push_deliveries FROM PUBLIC,anon,authenticated;
CREATE INDEX push_pending ON agenda_private.push_deliveries(available_at) WHERE sent_at IS NULL AND failed_at IS NULL;

CREATE FUNCTION public.register_agenda_push(p_store_account_id uuid,p_subscription jsonb,p_barber_id uuid DEFAULT NULL,p_session_token text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result uuid; who uuid := auth.uid(); endpoint_value text := p_subscription->>'endpoint'; session_expires timestamptz;
BEGIN
 IF p_barber_id IS NOT NULL THEN
   IF NOT EXISTS(SELECT 1 FROM public.barbers WHERE id=p_barber_id AND store_account_id=p_store_account_id AND is_active)
      OR NOT agenda_private.can_work(p_barber_id,p_session_token) THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
   -- Authenticated professionals share the same recipient identity as their inbox.
   SELECT user_id INTO who FROM public.barbers WHERE id=p_barber_id;
   IF auth.uid() IS DISTINCT FROM who OR who IS NULL THEN
     SELECT expires_at INTO session_expires FROM agenda_private.barber_sessions
       WHERE barber_id=p_barber_id AND token_hash=encode(extensions.digest(p_session_token,'sha256'),'hex') AND expires_at>now();
     IF session_expires IS NULL THEN RAISE EXCEPTION 'Sessão expirada.'; END IF;
   END IF;
 ELSE
   IF who IS NULL OR NOT (EXISTS(SELECT 1 FROM public.store_accounts WHERE id=p_store_account_id AND owner_user_id=who)
      OR EXISTS(SELECT 1 FROM public.agenda_clients WHERE store_account_id=p_store_account_id AND user_id=who)
      OR EXISTS(SELECT 1 FROM public.barbers WHERE store_account_id=p_store_account_id AND user_id=who AND is_active))
     THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
 END IF;
 -- Limit endpoints to actual HTTPS push services; avoids service-role sender SSRF.
 IF endpoint_value IS NULL OR endpoint_value !~ '^https://(fcm\.googleapis\.com|updates\.push\.services\.mozilla\.com|[a-zA-Z0-9.-]+\.notify\.windows\.com|web\.push\.apple\.com)/'
 OR length(endpoint_value)>4096 OR length(p_subscription::text)>8192
 OR length(COALESCE(p_subscription#>>'{keys,p256dh}','')) NOT BETWEEN 80 AND 128
 OR length(COALESCE(p_subscription#>>'{keys,auth}','')) NOT BETWEEN 16 AND 64
 THEN RAISE EXCEPTION 'Assinatura de notificações inválida.'; END IF;
 -- Keep the same signed-in user's memberships on this device. Switching
 -- identity removes all old endpoint bindings and pending private deliveries.
 DELETE FROM agenda_private.push_subscriptions WHERE endpoint=endpoint_value AND
   (user_id IS DISTINCT FROM who OR barber_id IS DISTINCT FROM CASE WHEN who IS NULL THEN p_barber_id END);
 INSERT INTO agenda_private.push_subscriptions(user_id,barber_id,store_account_id,endpoint,subscription,expires_at)
 VALUES(who,CASE WHEN who IS NULL THEN p_barber_id END,p_store_account_id,endpoint_value,p_subscription,session_expires)
 ON CONFLICT(endpoint,store_account_id) DO UPDATE SET user_id=EXCLUDED.user_id,barber_id=EXCLUDED.barber_id,
 store_account_id=EXCLUDED.store_account_id,subscription=EXCLUDED.subscription,expires_at=EXCLUDED.expires_at,updated_at=now() RETURNING id INTO result;
 RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.register_agenda_push(uuid,jsonb,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_agenda_push(uuid,jsonb,uuid,text) TO anon,authenticated;

CREATE FUNCTION public.unregister_agenda_push(p_endpoint text,p_barber_id uuid DEFAULT NULL,p_session_token text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 DELETE FROM agenda_private.push_subscriptions s WHERE s.endpoint=p_endpoint AND
 ((s.user_id IS NOT NULL AND s.user_id=auth.uid()) OR
 (s.barber_id=p_barber_id AND public.verify_barber_session(p_barber_id,p_session_token)));
END; $$;
REVOKE ALL ON FUNCTION public.unregister_agenda_push(text,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.unregister_agenda_push(text,uuid,text) TO anon,authenticated;

CREATE FUNCTION agenda_private.enqueue_notification_push() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO agenda_private.push_deliveries(subscription_id,notification_id)
 SELECT s.id,NEW.id FROM agenda_private.push_subscriptions s WHERE s.store_account_id=NEW.store_account_id
 AND (s.expires_at IS NULL OR s.expires_at>now())
 AND ((NEW.recipient_id IS NOT NULL AND s.user_id=NEW.recipient_id) OR (NEW.barber_recipient_id IS NOT NULL AND s.barber_id=NEW.barber_recipient_id));
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION agenda_private.enqueue_notification_push() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enqueue_agenda_notification_push AFTER INSERT ON public.agenda_notifications
FOR EACH ROW EXECUTE FUNCTION agenda_private.enqueue_notification_push();

CREATE FUNCTION public.claim_agenda_push_batch(p_limit integer DEFAULT 50)
RETURNS TABLE(delivery_id uuid,subscription jsonb,title text,body text,tag text,store_slug text,destination text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 RETURN QUERY WITH candidates AS (
 SELECT d.id FROM agenda_private.push_deliveries d WHERE d.sent_at IS NULL AND d.failed_at IS NULL
 AND d.available_at<=now() AND d.attempts<5 ORDER BY d.available_at FOR UPDATE SKIP LOCKED LIMIT least(greatest(p_limit,1),100)
 ), claimed AS (
 UPDATE agenda_private.push_deliveries d SET attempts=d.attempts+1, available_at=now()+interval '5 minutes'
 FROM candidates c WHERE d.id=c.id RETURNING d.*)
 SELECT c.id,s.subscription,n.title,n.description,'agenda-'||n.id::text,
   (SELECT slug FROM public.agenda_business_settings WHERE store_account_id=n.store_account_id LIMIT 1),
   CASE WHEN EXISTS(SELECT 1 FROM public.store_accounts a WHERE a.id=n.store_account_id AND a.owner_user_id=n.recipient_id) THEN 'painel'
        WHEN n.barber_recipient_id IS NOT NULL OR EXISTS(SELECT 1 FROM public.barbers b WHERE b.store_account_id=n.store_account_id AND b.user_id=n.recipient_id) THEN 'painel-profissional'
        ELSE 'meus-agendamentos' END
 FROM claimed c JOIN agenda_private.push_subscriptions s ON s.id=c.subscription_id JOIN public.agenda_notifications n ON n.id=c.notification_id
 WHERE (s.expires_at IS NULL OR s.expires_at>now()) AND s.store_account_id=n.store_account_id AND (s.user_id=n.recipient_id OR s.barber_id=n.barber_recipient_id)
 AND (n.event_type<>'reminder' OR EXISTS(SELECT 1 FROM public.appointments a WHERE a.id=n.appointment_id AND a.status::text='scheduled'
   AND n.event_key LIKE 'reminder:'||a.id::text||':'||a.appointment_date::text||':'||a.appointment_time::text||':%'
   AND (a.appointment_date+a.appointment_time) AT TIME ZONE 'America/Sao_Paulo'>now()));
END; $$;
REVOKE ALL ON FUNCTION public.claim_agenda_push_batch(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_agenda_push_batch(integer) TO service_role;

CREATE FUNCTION public.finish_agenda_push(p_delivery_id uuid,p_status integer,p_error text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_status IN (404,410) THEN
   DELETE FROM agenda_private.push_subscriptions WHERE id=(SELECT subscription_id FROM agenda_private.push_deliveries WHERE id=p_delivery_id);
 ELSE
   UPDATE agenda_private.push_deliveries SET sent_at=CASE WHEN p_status BETWEEN 200 AND 299 THEN now() END,
    failed_at=CASE WHEN attempts>=5 OR (p_status BETWEEN 400 AND 499 AND p_status NOT IN (408,429)) THEN now() END,
    last_error=left(p_error,500),available_at=now()+interval '1 minute'*power(2,attempts)
   WHERE id=p_delivery_id;
 END IF;
END; $$;
REVOKE ALL ON FUNCTION public.finish_agenda_push(uuid,integer,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_agenda_push(uuid,integer,text) TO service_role;

-- The worker runs this before claiming deliveries. Unique keys make repeated cron
-- invocations safe; the date/time in the key allows reminders after rescheduling.
CREATE FUNCTION public.enqueue_agenda_reminders() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE inserted integer;
BEGIN
 INSERT INTO public.agenda_notifications(recipient_id,barber_recipient_id,store_account_id,appointment_id,event_type,title,description,event_key)
 SELECT DISTINCT recipients.user_id,recipients.barber_id,a.store_account_id,a.id,'reminder','Lembrete de atendimento',
   COALESCE(a.client_name,'Cliente')||' · '||to_char(a.appointment_date,'DD/MM/YYYY')||' às '||to_char(a.appointment_time,'HH24:MI'),
   'reminder:'||a.id::text||':'||a.appointment_date::text||':'||a.appointment_time::text||':'||reminder_window.minutes::text||':'||COALESCE(recipients.user_id,recipients.barber_id)::text
 FROM public.appointments a JOIN public.agenda_business_settings settings ON settings.store_account_id=a.store_account_id
 JOIN public.store_accounts store ON store.id=a.store_account_id JOIN public.barbers barber ON barber.id=a.barber_id
 CROSS JOIN LATERAL (VALUES (1440,settings.reminder_24h_enabled),(120,settings.reminder_2h_enabled),(30,settings.reminder_30m_enabled)) reminder_window(minutes,enabled)
 CROSS JOIN LATERAL (SELECT DISTINCT user_id,barber_id FROM (VALUES(a.client_id,NULL::uuid),(store.owner_user_id,NULL::uuid),(barber.user_id,CASE WHEN barber.user_id IS NULL THEN barber.id END)) r(user_id,barber_id)) recipients
 WHERE a.status::text='scheduled' AND settings.reminder_enabled AND reminder_window.enabled
 AND (recipients.user_id IS NOT NULL OR recipients.barber_id IS NOT NULL)
 AND (a.appointment_date+a.appointment_time) AT TIME ZONE 'America/Sao_Paulo' <= now()+make_interval(mins=>reminder_window.minutes)
 AND (a.appointment_date+a.appointment_time) AT TIME ZONE 'America/Sao_Paulo' > now()+make_interval(mins=>reminder_window.minutes)-interval '5 minutes'
 ON CONFLICT(event_key) DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 RETURN inserted;
END; $$;
REVOKE ALL ON FUNCTION public.enqueue_agenda_reminders() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_agenda_reminders() TO service_role;

COMMIT;
