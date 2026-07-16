
-- Trigger: auto-insert new profiles into the clients table
CREATE OR REPLACE FUNCTION public.sync_profile_to_clients()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.clients (name, phone, email)
  VALUES (NEW.full_name, NEW.phone, NULL)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Fire after a new profile is created
CREATE TRIGGER on_profile_created_sync_client
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_to_clients();
