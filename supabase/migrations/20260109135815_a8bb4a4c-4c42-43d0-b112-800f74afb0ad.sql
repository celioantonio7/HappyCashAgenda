-- Tabela para múltiplos serviços por agendamento
CREATE TABLE public.appointment_services (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id uuid NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
  service_id uuid NOT NULL,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  added_by_barber boolean NOT NULL DEFAULT false
);

-- Index para performance
CREATE INDEX idx_appointment_services_appointment ON public.appointment_services(appointment_id);
CREATE INDEX idx_appointment_services_service ON public.appointment_services(service_id);

-- Enable RLS
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view appointment services for their appointments"
ON public.appointment_services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments a 
    WHERE a.id = appointment_id 
    AND (a.client_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
  )
);

CREATE POLICY "Barbers can view their appointment services"
ON public.appointment_services
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM appointments a 
    JOIN barbers b ON a.barber_id = b.id
    WHERE a.id = appointment_id AND b.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can manage appointment services"
ON public.appointment_services
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Barbers can add services to their appointments"
ON public.appointment_services
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM appointments a 
    JOIN barbers b ON a.barber_id = b.id
    WHERE a.id = appointment_id AND b.user_id = auth.uid()
  )
);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointment_services;