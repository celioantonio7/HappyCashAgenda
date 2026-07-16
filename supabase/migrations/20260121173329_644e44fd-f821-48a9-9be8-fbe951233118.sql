-- RPC segura para barbeiro (login via sessão) obter serviços extras dos próprios agendamentos
-- Evita depender de auth.uid() e contorna RLS, validando por barber_id.

CREATE OR REPLACE FUNCTION public.get_barber_appointment_extra_services(
  p_barber_id uuid,
  p_appointment_ids uuid[]
)
RETURNS TABLE(
  appointment_id uuid,
  service_id uuid,
  service_name text,
  service_price numeric,
  service_duration integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    aps.appointment_id,
    aps.service_id,
    s.name AS service_name,
    s.price AS service_price,
    s.duration_minutes AS service_duration
  FROM public.appointment_services aps
  JOIN public.appointments a ON a.id = aps.appointment_id
  JOIN public.services s ON s.id = aps.service_id
  WHERE a.barber_id = p_barber_id
    AND aps.appointment_id = ANY(p_appointment_ids)
  ORDER BY aps.added_at;
$$;