-- Criar RPC para barbeiros adicionarem serviço a agendamentos (bypassa RLS para sessão)
CREATE OR REPLACE FUNCTION public.add_service_to_appointment(
  p_barber_id uuid,
  p_appointment_id uuid,
  p_service_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  apt_barber_id uuid;
BEGIN
  -- Validar que o agendamento pertence ao barbeiro
  SELECT barber_id INTO apt_barber_id
  FROM public.appointments
  WHERE id = p_appointment_id;
  
  IF apt_barber_id IS NULL THEN
    RAISE EXCEPTION 'Agendamento não encontrado.';
  END IF;
  
  IF apt_barber_id <> p_barber_id THEN
    RAISE EXCEPTION 'Você não tem permissão para modificar este agendamento.';
  END IF;
  
  -- Verificar se o serviço já foi adicionado
  IF EXISTS (
    SELECT 1 FROM public.appointment_services
    WHERE appointment_id = p_appointment_id AND service_id = p_service_id
  ) THEN
    RAISE EXCEPTION 'Este serviço já foi adicionado.';
  END IF;
  
  -- Verificar se o serviço existe
  IF NOT EXISTS (SELECT 1 FROM public.services WHERE id = p_service_id AND is_active = true) THEN
    RAISE EXCEPTION 'Serviço não encontrado ou inativo.';
  END IF;
  
  -- Inserir o serviço extra
  INSERT INTO public.appointment_services (appointment_id, service_id, added_by_barber)
  VALUES (p_appointment_id, p_service_id, true);
  
  RETURN true;
END;
$$;