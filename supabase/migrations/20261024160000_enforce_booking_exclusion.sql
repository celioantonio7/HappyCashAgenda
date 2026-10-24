BEGIN;
-- Enforce reservations in PostgreSQL, including concurrent direct writes.
-- Existing conflicting appointments abort this migration; none are deleted.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public, extensions, pg_catalog;

CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions;
LOCK TABLE public.services, public.appointments, public.appointment_services
  IN SHARE ROW EXCLUSIVE MODE;

ALTER TABLE public.appointments ADD COLUMN booked_duration_minutes integer;

CREATE OR REPLACE FUNCTION public.trg_appointments_prevent_overlap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE duration_min integer;
BEGIN
  -- Prevent concurrent catalogue edits from leaving a stale stored duration.
  PERFORM s.id FROM public.services s
  WHERE s.id = NEW.service_id OR EXISTS (
    SELECT 1 FROM public.appointment_services aps
    WHERE aps.appointment_id = NEW.id AND aps.service_id = s.id
  ) ORDER BY s.id FOR SHARE;
  SELECT coalesce(s.duration_minutes, 0) INTO duration_min
  FROM public.services s WHERE s.id = NEW.service_id;
  SELECT coalesce(duration_min, 0) + coalesce(sum(s.duration_minutes), 0)
  INTO duration_min
  FROM public.appointment_services aps
  JOIN public.services s ON s.id = aps.service_id
  WHERE aps.appointment_id = NEW.id;

  IF NEW.status <> 'cancelled'
     AND coalesce(NEW.appointment_type, 'appointment') = 'appointment'
     AND coalesce(duration_min, 0) <= 0 THEN
    RAISE EXCEPTION 'Duracao invalida para reservar horario.' USING ERRCODE = '23514';
  END IF;
  -- Always derive the duration on the server, ignoring client-supplied values.
  NEW.booked_duration_minutes := greatest(coalesce(duration_min, 0), 1);
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS prevent_overlap_on_appointments ON public.appointments;
CREATE TRIGGER prevent_overlap_on_appointments
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW EXECUTE FUNCTION public.trg_appointments_prevent_overlap();

UPDATE public.appointments SET booked_duration_minutes = 1;
ALTER TABLE public.appointments
  ALTER COLUMN booked_duration_minutes SET NOT NULL,
  ADD CONSTRAINT appointments_positive_duration CHECK (booked_duration_minutes > 0),
  ADD CONSTRAINT appointments_no_overlap EXCLUDE USING gist (
    barber_id WITH =,
    (tsrange(
      appointment_date + appointment_time,
      appointment_date + appointment_time + make_interval(mins => booked_duration_minutes),
      '[)'
    )) WITH &&
  ) WHERE (status <> 'cancelled' AND coalesce(appointment_type, 'appointment') = 'appointment');

-- Serialize changes to extras through the parent row; the BEFORE trigger
-- recalculates duration after obtaining that row's write lock.
CREATE OR REPLACE FUNCTION public.trg_appointment_services_prevent_overlap()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE apt_ids uuid[]; apt_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN apt_ids := ARRAY[NEW.appointment_id];
  ELSIF TG_OP = 'DELETE' THEN apt_ids := ARRAY[OLD.appointment_id];
  ELSE apt_ids := ARRAY[OLD.appointment_id, NEW.appointment_id];
  END IF;
  FOR apt_id IN SELECT DISTINCT id FROM unnest(apt_ids) AS ids(id)
    WHERE id IS NOT NULL ORDER BY id
  LOOP
    UPDATE public.appointments SET booked_duration_minutes = booked_duration_minutes
    WHERE id = apt_id;
  END LOOP;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS prevent_overlap_on_appointment_services ON public.appointment_services;
CREATE TRIGGER prevent_overlap_on_appointment_services
AFTER INSERT OR UPDATE OR DELETE ON public.appointment_services
FOR EACH ROW EXECUTE FUNCTION public.trg_appointment_services_prevent_overlap();

-- Catalogue duration edits must not silently invalidate the reservation index.
CREATE FUNCTION public.trg_services_refresh_booking_duration()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE apt_id uuid;
BEGIN
  FOR apt_id IN
    SELECT a.id FROM public.appointments a
    WHERE a.service_id = NEW.id OR EXISTS (
      SELECT 1 FROM public.appointment_services aps
      WHERE aps.appointment_id = a.id AND aps.service_id = NEW.id
    ) ORDER BY a.id
  LOOP
    UPDATE public.appointments SET booked_duration_minutes = booked_duration_minutes
    WHERE id = apt_id;
  END LOOP;
  RETURN NEW;
END $$;
CREATE TRIGGER refresh_booking_duration_on_services
AFTER UPDATE OF duration_minutes ON public.services
FOR EACH ROW WHEN (OLD.duration_minutes IS DISTINCT FROM NEW.duration_minutes)
EXECUTE FUNCTION public.trg_services_refresh_booking_duration();

REVOKE ALL ON FUNCTION public.trg_services_refresh_booking_duration() FROM PUBLIC, anon, authenticated;
COMMENT ON CONSTRAINT appointments_no_overlap ON public.appointments IS
  'Reject overlapping active reservations for a professional, even across concurrent transactions.';

COMMIT;
