-- Atualizar a função get_barber_booked_slots para retornar APENAS agendamentos 'scheduled'
-- Agendamentos 'completed' e 'cancelled' devem liberar os slots imediatamente
CREATE OR REPLACE FUNCTION public.get_barber_booked_slots(p_barber_id uuid, p_appointment_date date)
 RETURNS TABLE(appointment_time time without time zone, duration_minutes integer)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    a.appointment_time,
    public.appointment_total_duration_minutes(a.id) AS duration_minutes
  FROM public.appointments a
  WHERE a.barber_id = p_barber_id
    AND a.appointment_date = p_appointment_date
    AND a.status = 'scheduled';  -- APENAS agendamentos pendentes bloqueiam slots
$function$;

-- Atualizar assert_no_appointment_overlap para considerar apenas 'scheduled'
CREATE OR REPLACE FUNCTION public.assert_no_appointment_overlap(p_barber_id uuid, p_appointment_date date, p_start_time time without time zone, p_duration_minutes integer, p_ignore_appointment_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
    AND a.status = 'scheduled'  -- APENAS agendamentos pendentes geram conflito
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
$function$;