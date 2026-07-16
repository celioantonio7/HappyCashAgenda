-- Enable realtime for appointments table to support real-time notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;