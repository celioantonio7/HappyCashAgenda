-- Drop restrictive policies and create permissive ones for public viewing
DROP POLICY IF EXISTS "Anyone can view active barbers" ON public.barbers;
DROP POLICY IF EXISTS "Anyone can view active services" ON public.services;
DROP POLICY IF EXISTS "Anyone can view business hours" ON public.business_hours;

-- Create permissive policies for public access
CREATE POLICY "Public can view active barbers" ON public.barbers
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated admins can view all barbers" ON public.barbers
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view active services" ON public.services
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY "Authenticated admins can view all services" ON public.services
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Public can view business hours" ON public.business_hours
  FOR SELECT TO anon, authenticated
  USING (true);