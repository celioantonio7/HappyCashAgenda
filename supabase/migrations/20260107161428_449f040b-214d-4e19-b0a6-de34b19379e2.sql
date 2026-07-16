-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Recreate the set_barber_password function with proper schema reference
CREATE OR REPLACE FUNCTION public.set_barber_password(p_barber_id uuid, p_username text, p_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE barbers 
  SET username = p_username, 
      password_hash = extensions.crypt(p_password, extensions.gen_salt('bf'))
  WHERE id = p_barber_id;
  RETURN FOUND;
END;
$$;

-- Recreate the authenticate_barber function with proper schema reference
CREATE OR REPLACE FUNCTION public.authenticate_barber(p_username text, p_password text)
RETURNS TABLE(barber_id uuid, barber_name text, user_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT b.id, b.name, b.user_id
  FROM barbers b
  WHERE b.username = p_username 
    AND b.password_hash = extensions.crypt(p_password, b.password_hash)
    AND b.is_active = true;
END;
$$;