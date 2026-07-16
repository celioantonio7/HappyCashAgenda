-- Adiciona política para barbeiros poderem atualizar (cancelar) seus próprios agendamentos
CREATE POLICY "Barbers can update own appointments" 
ON public.appointments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM barbers
    WHERE barbers.id = appointments.barber_id 
    AND barbers.user_id = auth.uid()
  )
);

-- Cria RPC para barbeiros logados via sessão cancelarem agendamentos
-- (bypassa RLS para barbeiros autenticados via pgcrypto/sessão)
CREATE OR REPLACE FUNCTION public.barber_cancel_appointment(
  p_barber_id uuid,
  p_appointment_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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
    RAISE EXCEPTION 'Você não tem permissão para cancelar este agendamento.';
  END IF;
  
  -- Atualizar status para cancelado
  UPDATE public.appointments
  SET status = 'cancelled', updated_at = now()
  WHERE id = p_appointment_id;
  
  RETURN true;
END;
$$;