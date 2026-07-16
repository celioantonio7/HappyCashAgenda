-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add barber credentials columns
ALTER TABLE public.barbers 
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS password_hash TEXT;

-- Add payment method to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS payment_method TEXT CHECK (payment_method IN ('local', 'pix', NULL)),
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid'));

-- Create clients table for admin-managed clients
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients table
CREATE POLICY "Admins can manage clients" 
ON public.clients 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view clients" 
ON public.clients 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Function to authenticate barber with username/password
CREATE OR REPLACE FUNCTION public.authenticate_barber(p_username TEXT, p_password TEXT)
RETURNS TABLE(barber_id UUID, barber_name TEXT, user_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.name, b.user_id
  FROM barbers b
  WHERE b.username = p_username 
    AND b.password_hash = crypt(p_password, b.password_hash)
    AND b.is_active = true;
END;
$$;

-- Function to set barber password (admin only)
CREATE OR REPLACE FUNCTION public.set_barber_password(p_barber_id UUID, p_username TEXT, p_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE barbers 
  SET username = p_username, 
      password_hash = crypt(p_password, gen_salt('bf'))
  WHERE id = p_barber_id;
  RETURN FOUND;
END;
$$;

-- Create trigger for clients updated_at
CREATE TRIGGER update_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();