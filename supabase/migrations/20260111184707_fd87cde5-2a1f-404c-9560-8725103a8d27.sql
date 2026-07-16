-- Retry migration (fix: parameters after defaults must also have defaults)
-- =============================================================
-- Prevent overlapping appointments (by barber) considering total duration
-- + Provide RPC helpers for consistent slot calculation & atomic booking
-- =============================================================

-- 1) Total duration for an appointment (base service + extra services)
CREATE OR REPLACE FUNCTION public.appointment_total_duration_minutes(p_appointment_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SET search_path TO public
AS $$
  SELECT
    COALESCE(s.duration_minutes, 0)
    + COALESCE((
      SELECT SUM(s2.duration_minutes)
      FROM public.appointment_services aps
      JOIN public.services s2 ON s2.id = aps.service_id
      WHERE aps.appointment_id = p_appointment_id
    ), 0)
  FROM public.appointments a
  JOIN public.services s ON s.id = a.service_id
  WHERE a.id = p_appointment_id;
$$;

-- 2) Core overlap assertion helper
CREATE OR REPLACE FUNCTION public.assert_no_appointment_overlap(
  p_barber_id uuid,
  p_appointment_date date,
  p_start_time time,
  p_duration_minutes integer,
  p_ignore_appointment_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
DECLARE
  new_start_min integer;
  new_end_min integer;
  conflict_id uuid;
BEGIN
  IF p_barber_id IS NULL OR p_appointment_date IS NULL OR p_start_time IS NULL THEN
    RAISE EXCEPTION 'Dados insuficientes para validar horário.';
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
    RAISE EXCEPTION 'Duração inválida para validar horário.';
  END IF;

  new_start_min := FLOOR(EXTRACT(EPOCH FROM p_start_time) / 60);
  new_end_min := new_start_min + p_duration_minutes;

  SELECT a.id
    INTO conflict_id
  FROM public.appointments a
  WHERE a.barber_id = p_barber_id
    AND a.appointment_date = p_appointment_date
    AND a.status <> 'cancelled'
    AND (p_ignore_appointment_id IS NULL OR a.id <> p_ignore_appointment_id)
    AND (
      new_start_min < (FLOOR(EXTRACT(EPOCH FROM a.appointment_time) / 60) + public.appointment_total_duration_minutes(a.id))
      AND new_end_min > FLOOR(EXTRACT(EPOCH FROM a.appointment_time) / 60)
    )
  LIMIT 1;

  IF conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'Horário indisponível: já existe outro agendamento neste intervalo.';
  END IF;
END;
$$;

-- 3) Trigger on appointments
CREATE OR REPLACE FUNCTION public.trg_appointments_prevent_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
DECLARE
  duration_min integer;
  extras_min integer;
BEGIN
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(duration_minutes, 0)
    INTO duration_min
  FROM public.services
  WHERE id = NEW.service_id;

  SELECT COALESCE(SUM(s2.duration_minutes), 0)
    INTO extras_min
  FROM public.appointment_services aps
  JOIN public.services s2 ON s2.id = aps.service_id
  WHERE aps.appointment_id = NEW.id;

  duration_min := COALESCE(duration_min, 0) + COALESCE(extras_min, 0);

  PERFORM public.assert_no_appointment_overlap(
    NEW.barber_id,
    NEW.appointment_date,
    NEW.appointment_time,
    duration_min,
    NEW.id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_overlap_on_appointments ON public.appointments;
CREATE TRIGGER prevent_overlap_on_appointments
BEFORE INSERT OR UPDATE OF barber_id, appointment_date, appointment_time, service_id, status
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.trg_appointments_prevent_overlap();

-- 4) Trigger on appointment_services
CREATE OR REPLACE FUNCTION public.trg_appointment_services_prevent_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
DECLARE
  apt_id uuid;
  a record;
  duration_min integer;
BEGIN
  apt_id := COALESCE(NEW.appointment_id, OLD.appointment_id);

  SELECT id, barber_id, appointment_date, appointment_time, status
    INTO a
  FROM public.appointments
  WHERE id = apt_id;

  IF a.id IS NULL OR a.status = 'cancelled' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  duration_min := public.appointment_total_duration_minutes(apt_id);

  PERFORM public.assert_no_appointment_overlap(
    a.barber_id,
    a.appointment_date,
    a.appointment_time,
    duration_min,
    apt_id
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS prevent_overlap_on_appointment_services ON public.appointment_services;
CREATE TRIGGER prevent_overlap_on_appointment_services
AFTER INSERT OR UPDATE OR DELETE
ON public.appointment_services
FOR EACH ROW
EXECUTE FUNCTION public.trg_appointment_services_prevent_overlap();

-- 5) Helper RPC to fetch booked slots with correct duration
CREATE OR REPLACE FUNCTION public.get_barber_booked_slots(
  p_barber_id uuid,
  p_appointment_date date
)
RETURNS TABLE(
  appointment_time time,
  duration_minutes integer
)
LANGUAGE sql
STABLE
SET search_path TO public
AS $$
  SELECT
    a.appointment_time,
    public.appointment_total_duration_minutes(a.id) AS duration_minutes
  FROM public.appointments a
  WHERE a.barber_id = p_barber_id
    AND a.appointment_date = p_appointment_date
    AND a.status <> 'cancelled';
$$;

-- 6) Atomic booking (client selects multiple services) in a single transaction
CREATE OR REPLACE FUNCTION public.create_appointment_with_services(
  p_barber_id uuid,
  p_appointment_date date,
  p_appointment_time time,
  p_service_ids uuid[],
  p_client_name text,
  p_client_phone text DEFAULT NULL,
  p_payment_method text DEFAULT 'local',
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  new_id uuid;
  first_service uuid;
  total_duration integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL OR array_length(p_service_ids, 1) < 1 THEN
    RAISE EXCEPTION 'Selecione ao menos 1 serviço.';
  END IF;

  first_service := p_service_ids[1];

  SELECT COALESCE(SUM(s.duration_minutes), 0)
    INTO total_duration
  FROM public.services s
  WHERE s.id = ANY(p_service_ids);

  IF total_duration <= 0 THEN
    RAISE EXCEPTION 'Serviço(s) inválido(s).';
  END IF;

  PERFORM public.assert_no_appointment_overlap(
    p_barber_id,
    p_appointment_date,
    p_appointment_time,
    total_duration,
    NULL
  );

  INSERT INTO public.appointments (
    client_id,
    client_name,
    client_phone,
    barber_id,
    service_id,
    appointment_date,
    appointment_time,
    created_by,
    notes,
    payment_method,
    payment_status,
    status
  )
  VALUES (
    auth.uid(),
    p_client_name,
    NULLIF(p_client_phone, ''),
    p_barber_id,
    first_service,
    p_appointment_date,
    p_appointment_time,
    auth.uid(),
    p_notes,
    p_payment_method,
    'pending',
    'scheduled'
  )
  RETURNING id INTO new_id;

  IF array_length(p_service_ids, 1) > 1 THEN
    INSERT INTO public.appointment_services (appointment_id, service_id, added_by_barber)
    SELECT new_id, unnest(p_service_ids[2:array_length(p_service_ids, 1)]), false;
  END IF;

  RETURN new_id;
END;
$$;
