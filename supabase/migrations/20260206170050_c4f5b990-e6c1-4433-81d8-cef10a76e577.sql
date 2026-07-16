
-- =============================================
-- 1. LOYALTY PROGRAMS (Metas de Fidelidade)
-- =============================================
CREATE TABLE public.loyalty_programs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  goal_count integer NOT NULL DEFAULT 10,
  reward_description text NOT NULL DEFAULT 'Serviço grátis',
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active loyalty programs"
  ON public.loyalty_programs FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage loyalty programs"
  ON public.loyalty_programs FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 2. LOYALTY PROGRESS (Progresso dos Clientes)
-- =============================================
CREATE TABLE public.loyalty_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  program_id uuid NOT NULL REFERENCES public.loyalty_programs(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_phone text,
  current_count integer NOT NULL DEFAULT 0,
  completed boolean NOT NULL DEFAULT false,
  reward_claimed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view loyalty progress"
  ON public.loyalty_progress FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage loyalty progress"
  ON public.loyalty_progress FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- =============================================
-- 3. BUSINESS LOCATIONS (Localizações)
-- =============================================
CREATE TABLE public.business_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  address text NOT NULL,
  latitude double precision,
  longitude double precision,
  google_maps_embed_url text,
  phone text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active locations"
  ON public.business_locations FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage locations"
  ON public.business_locations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_loyalty_programs_updated_at
  BEFORE UPDATE ON public.loyalty_programs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loyalty_progress_updated_at
  BEFORE UPDATE ON public.loyalty_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_locations_updated_at
  BEFORE UPDATE ON public.business_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
