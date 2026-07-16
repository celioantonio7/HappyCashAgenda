-- Fix 1: Add RLS policy for barbers to view their own appointments
CREATE POLICY "Barbers can view own appointments"
ON public.appointments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.barbers
    WHERE barbers.id = appointments.barber_id
    AND barbers.user_id = auth.uid()
  )
);

-- Fix 2: Create validation trigger for appointments (safer than CHECK constraints)
CREATE OR REPLACE FUNCTION public.validate_appointment_input()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Validate client_name length
  IF length(NEW.client_name) < 2 OR length(NEW.client_name) > 100 THEN
    RAISE EXCEPTION 'client_name must be between 2 and 100 characters';
  END IF;
  
  -- Validate client_phone format (if provided and not empty)
  IF NEW.client_phone IS NOT NULL AND NEW.client_phone != '' THEN
    IF NOT NEW.client_phone ~ '^\+?[0-9]{8,15}$' THEN
      RAISE EXCEPTION 'client_phone must be a valid phone number (8-15 digits, optional + prefix)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_appointment_input_trigger
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.validate_appointment_input();