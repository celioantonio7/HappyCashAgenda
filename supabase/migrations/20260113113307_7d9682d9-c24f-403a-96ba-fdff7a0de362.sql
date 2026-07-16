-- Criar função RPC para buscar agendamentos de um barbeiro específico (bypass RLS)
-- Esta função é usada pelo painel do barbeiro quando logado via sessão (username/password)
CREATE OR REPLACE FUNCTION public.get_barber_appointments(p_barber_id uuid)
RETURNS TABLE (
  id uuid,
  client_name text,
  client_phone text,
  appointment_date date,
  appointment_time time,
  status public.appointment_status,
  payment_method text,
  payment_status text,
  service_id uuid,
  service_name text,
  service_price numeric,
  service_duration integer
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    a.id,
    a.client_name,
    a.client_phone,
    a.appointment_date,
    a.appointment_time,
    a.status,
    a.payment_method,
    a.payment_status,
    s.id as service_id,
    s.name as service_name,
    s.price as service_price,
    s.duration_minutes as service_duration
  FROM public.appointments a
  JOIN public.services s ON s.id = a.service_id
  WHERE a.barber_id = p_barber_id
  ORDER BY a.appointment_date DESC, a.appointment_time DESC;
$$;

-- Criar função RPC para buscar serviços extras de agendamentos
CREATE OR REPLACE FUNCTION public.get_appointment_extra_services(p_appointment_ids uuid[])
RETURNS TABLE (
  appointment_id uuid,
  service_id uuid,
  service_name text,
  service_price numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    aps.appointment_id,
    s.id as service_id,
    s.name as service_name,
    s.price as service_price
  FROM public.appointment_services aps
  JOIN public.services s ON s.id = aps.service_id
  WHERE aps.appointment_id = ANY(p_appointment_ids);
$$;