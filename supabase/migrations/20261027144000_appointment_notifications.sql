BEGIN;
-- Durable recipient inbox. Only trusted appointment triggers create events.
CREATE TABLE public.agenda_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  barber_recipient_id uuid REFERENCES public.barbers(id) ON DELETE CASCADE,
  store_account_id uuid NOT NULL REFERENCES public.store_accounts(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES public.appointments(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('scheduled','rescheduled','cancelled','completed','new_client','reminder')),
  title text NOT NULL,
  description text NOT NULL,
  read_at timestamptz,
  event_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (recipient_id IS NOT NULL OR barber_recipient_id IS NOT NULL)
);
CREATE INDEX agenda_notifications_recipient_date ON public.agenda_notifications(recipient_id, created_at DESC);
ALTER TABLE public.agenda_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agenda_notifications FROM anon, authenticated;
GRANT SELECT ON public.agenda_notifications TO authenticated;
GRANT UPDATE(read_at) ON public.agenda_notifications TO authenticated;
CREATE POLICY recipient_reads ON public.agenda_notifications FOR SELECT TO authenticated
  USING (recipient_id = (SELECT auth.uid()));
CREATE POLICY recipient_marks_read ON public.agenda_notifications FOR UPDATE TO authenticated
  USING (recipient_id = (SELECT auth.uid())) WITH CHECK (recipient_id = (SELECT auth.uid()));

CREATE OR REPLACE FUNCTION agenda_private.notify_appointment_event()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE event_name text; event_title text; barber_user uuid; former_barber_user uuid;
BEGIN
  IF NEW.store_account_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW.status::text <> 'scheduled' THEN RETURN NEW; END IF;
    event_name := 'scheduled'; event_title := 'Agendamento confirmado';
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status::text = 'cancelled' THEN event_name := 'cancelled'; event_title := 'Agendamento cancelado';
    ELSIF NEW.status::text = 'completed' THEN event_name := 'completed'; event_title := 'Atendimento concluído';
    ELSIF NEW.status::text = 'scheduled' THEN event_name := 'scheduled'; event_title := 'Agendamento confirmado';
    ELSE RETURN NEW; END IF;
  ELSIF NEW.status::text = 'scheduled' AND
    (NEW.appointment_date IS DISTINCT FROM OLD.appointment_date OR NEW.appointment_time IS DISTINCT FROM OLD.appointment_time OR NEW.barber_id IS DISTINCT FROM OLD.barber_id) THEN
    event_name := 'rescheduled'; event_title := 'Agendamento remarcado';
  ELSE RETURN NEW;
  END IF;
  SELECT user_id INTO barber_user FROM public.barbers WHERE id = NEW.barber_id;
  IF TG_OP = 'UPDATE' AND NEW.barber_id IS DISTINCT FROM OLD.barber_id THEN
    SELECT user_id INTO former_barber_user FROM public.barbers WHERE id = OLD.barber_id;
  END IF;
  INSERT INTO public.agenda_notifications(recipient_id,store_account_id,appointment_id,event_type,title,description)
  SELECT DISTINCT recipient, NEW.store_account_id, NEW.id, event_name, event_title,
    COALESCE(NEW.client_name,'Cliente') || ' · ' || to_char(NEW.appointment_date,'DD/MM/YYYY') || ' às ' || to_char(NEW.appointment_time,'HH24:MI')
  FROM unnest(ARRAY[NEW.client_id, (SELECT owner_user_id FROM public.store_accounts WHERE id=NEW.store_account_id), barber_user, former_barber_user]) recipient
  WHERE recipient IS NOT NULL;
  -- Password-based professionals have no auth.users identity; route their push
  -- through a validated barber-session subscription without exposing inbox rows.
  INSERT INTO public.agenda_notifications(barber_recipient_id,store_account_id,appointment_id,event_type,title,description)
  SELECT b.id, NEW.store_account_id, NEW.id, event_name, event_title,
    COALESCE(NEW.client_name,'Cliente') || ' · ' || to_char(NEW.appointment_date,'DD/MM/YYYY') || ' às ' || to_char(NEW.appointment_time,'HH24:MI')
  FROM public.barbers b WHERE b.user_id IS NULL AND (b.id=NEW.barber_id OR b.id=CASE WHEN TG_OP='UPDATE' THEN OLD.barber_id END);
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION agenda_private.notify_appointment_event() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER agenda_appointment_notification AFTER INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION agenda_private.notify_appointment_event();
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname='supabase_realtime') THEN
   ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_notifications;
 END IF;
END $$;

CREATE FUNCTION agenda_private.notify_new_client() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  INSERT INTO public.agenda_notifications(recipient_id,store_account_id,event_type,title,description)
  SELECT a.owner_user_id,NEW.store_account_id,'new_client','Novo cliente',NEW.name || ' entrou na barbearia'
  FROM public.store_accounts a WHERE a.id=NEW.store_account_id;
  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION agenda_private.notify_new_client() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER agenda_new_client_notification AFTER INSERT ON public.agenda_clients
FOR EACH ROW EXECUTE FUNCTION agenda_private.notify_new_client();

COMMIT;
