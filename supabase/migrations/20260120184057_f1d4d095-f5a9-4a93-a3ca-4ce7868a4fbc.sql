-- Drop e recriar a função para incluir a duração
DROP FUNCTION IF EXISTS public.get_appointment_extra_services(uuid[]);

CREATE FUNCTION public.get_appointment_extra_services(p_appointment_ids uuid[])
RETURNS TABLE (
  appointment_id uuid,
  service_id uuid,
  service_name text,
  service_price numeric,
  service_duration integer
)
LANGUAGE sql
STABLE
SET search_path TO public
AS $$
  SELECT 
    aps.appointment_id,
    aps.service_id,
    s.name AS service_name,
    s.price AS service_price,
    s.duration_minutes AS service_duration
  FROM appointment_services aps
  JOIN services s ON s.id = aps.service_id
  WHERE aps.appointment_id = ANY(p_appointment_ids)
  ORDER BY aps.added_at
$$;