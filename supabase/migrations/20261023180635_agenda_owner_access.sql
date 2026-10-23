-- Complemento aditivo para o banco existente. Preserva tabelas e registros antigos.
CREATE SCHEMA IF NOT EXISTS agenda_private;
REVOKE ALL ON SCHEMA agenda_private FROM PUBLIC;
GRANT USAGE ON SCHEMA agenda_private TO anon, authenticated;
CREATE TABLE public.store_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 product_context text NOT NULL DEFAULT 'happycashagenda' CHECK (product_context = 'happycashagenda'),
 test_access_ends_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(owner_user_id, product_context)
);
CREATE TABLE public.store_subscriptions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL REFERENCES auth.users(id),
 product_context text NOT NULL DEFAULT 'happycashagenda' CHECK (product_context = 'happycashagenda'),
 plan_id text NOT NULL CHECK (plan_id IN ('fiado','completo','pro')), status text NOT NULL DEFAULT 'pending',
 current_period_ends_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ADD COLUMN user_id uuid GENERATED ALWAYS AS (id) STORED UNIQUE,
 ADD COLUMN owner_user_id uuid REFERENCES auth.users(id), ADD COLUMN username text;
CREATE TABLE public.agenda_business_settings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), owner_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
 store_account_id uuid NOT NULL UNIQUE REFERENCES public.store_accounts(id),
 slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'), display_name text NOT NULL,
 business_type text NOT NULL DEFAULT 'Barbearia', professional_label text NOT NULL DEFAULT 'Barbeiro',
 service_label text NOT NULL DEFAULT 'Servico', tagline text NOT NULL DEFAULT '',
 primary_hsl text NOT NULL DEFAULT '258 84% 58%', accent_hsl text NOT NULL DEFAULT '44 96% 56%', success_hsl text NOT NULL DEFAULT '151 74% 43%',
 public_booking_enabled boolean NOT NULL DEFAULT true,
 service_mode text NOT NULL DEFAULT 'appointment' CHECK (service_mode IN ('appointment','walk_in','both')),
 public_queue_visible boolean NOT NULL DEFAULT false,
 reschedule_notice_hours numeric NOT NULL DEFAULT 2 CHECK (reschedule_notice_hours BETWEEN 0 AND 72),
 cancellation_notice_hours numeric NOT NULL DEFAULT 0 CHECK (cancellation_notice_hours BETWEEN 0 AND 72)
, logo_url text
, hero_image_url text
, about_image_url text
, team_image_url text
, location_image_url text
, hero_title text
, hero_subtitle text
, closed_message text
, about_title text
, about_text text
, address text
, whatsapp text
, admin_whatsapp text
, facebook_url text
, instagram_url text
, pix_key text
, pix_merchant_name text
, logo_size numeric NOT NULL DEFAULT 36
, hero_image_position_x numeric NOT NULL DEFAULT 50
, hero_image_position_y numeric NOT NULL DEFAULT 50
, hero_image_scale numeric NOT NULL DEFAULT 1.1
, about_image_position_x numeric NOT NULL DEFAULT 50
, about_image_position_y numeric NOT NULL DEFAULT 50
, about_image_scale numeric NOT NULL DEFAULT 1
, reminder_enabled boolean NOT NULL DEFAULT false
, reminder_24h_enabled boolean NOT NULL DEFAULT false
, reminder_2h_enabled boolean NOT NULL DEFAULT false
, reminder_30m_enabled boolean NOT NULL DEFAULT false
, sound_notifications_enabled boolean NOT NULL DEFAULT true
, sound_new_appointment_enabled boolean NOT NULL DEFAULT true
, sound_reschedule_enabled boolean NOT NULL DEFAULT true
, sound_cancellation_enabled boolean NOT NULL DEFAULT true
, sound_completion_enabled boolean NOT NULL DEFAULT true
 );
ALTER TABLE public.barbers ADD COLUMN owner_user_id uuid REFERENCES auth.users(id), ADD COLUMN store_account_id uuid REFERENCES public.store_accounts(id);
CREATE INDEX barbers_agenda_store_idx ON public.barbers(store_account_id);
ALTER TABLE public.services ADD COLUMN owner_user_id uuid REFERENCES auth.users(id), ADD COLUMN store_account_id uuid REFERENCES public.store_accounts(id);
CREATE INDEX services_agenda_store_idx ON public.services(store_account_id);
ALTER TABLE public.appointments ADD COLUMN owner_user_id uuid REFERENCES auth.users(id), ADD COLUMN store_account_id uuid REFERENCES public.store_accounts(id);
CREATE INDEX appointments_agenda_store_idx ON public.appointments(store_account_id);
ALTER TABLE public.appointment_services ADD COLUMN owner_user_id uuid REFERENCES auth.users(id), ADD COLUMN store_account_id uuid REFERENCES public.store_accounts(id);
CREATE INDEX appointment_services_agenda_store_idx ON public.appointment_services(store_account_id);
ALTER TABLE public.business_hours ADD COLUMN owner_user_id uuid REFERENCES auth.users(id), ADD COLUMN store_account_id uuid REFERENCES public.store_accounts(id);
CREATE INDEX business_hours_agenda_store_idx ON public.business_hours(store_account_id);
ALTER TABLE public.business_locations ADD COLUMN owner_user_id uuid REFERENCES auth.users(id), ADD COLUMN store_account_id uuid REFERENCES public.store_accounts(id);
CREATE INDEX business_locations_agenda_store_idx ON public.business_locations(store_account_id);
ALTER TABLE public.loyalty_programs ADD COLUMN owner_user_id uuid REFERENCES auth.users(id), ADD COLUMN store_account_id uuid REFERENCES public.store_accounts(id);
CREATE INDEX loyalty_programs_agenda_store_idx ON public.loyalty_programs(store_account_id);
ALTER TABLE public.loyalty_progress ADD COLUMN owner_user_id uuid REFERENCES auth.users(id), ADD COLUMN store_account_id uuid REFERENCES public.store_accounts(id);
CREATE INDEX loyalty_progress_agenda_store_idx ON public.loyalty_progress(store_account_id);
ALTER TABLE public.clients ADD COLUMN owner_user_id uuid REFERENCES auth.users(id), ADD COLUMN store_account_id uuid REFERENCES public.store_accounts(id);
CREATE INDEX clients_agenda_store_idx ON public.clients(store_account_id);
ALTER TABLE public.products ADD COLUMN owner_user_id uuid REFERENCES auth.users(id), ADD COLUMN store_account_id uuid REFERENCES public.store_accounts(id);
CREATE INDEX products_agenda_store_idx ON public.products(store_account_id);
ALTER TABLE public.business_hours DROP CONSTRAINT business_hours_day_of_week_key;
ALTER TABLE public.business_hours ADD UNIQUE(store_account_id,day_of_week);
ALTER TABLE public.appointments ADD COLUMN appointment_type text NOT NULL DEFAULT 'appointment' CHECK (appointment_type IN ('appointment','queue'));
CREATE TABLE public.agenda_clients (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, phone text NOT NULL DEFAULT '', email text, notes text,
 owner_user_id uuid NOT NULL REFERENCES auth.users(id), store_account_id uuid NOT NULL REFERENCES public.store_accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agenda_products (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, description text, category text, image_url text,
 price numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0), stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0), is_active boolean NOT NULL DEFAULT true,
 owner_user_id uuid NOT NULL REFERENCES auth.users(id), store_account_id uuid NOT NULL REFERENCES public.store_accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agenda_product_orders (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), client_id uuid REFERENCES auth.users(id), client_name text NOT NULL, client_phone text,
 payment_method text NOT NULL DEFAULT 'local', payment_status text NOT NULL DEFAULT 'pending', order_status text NOT NULL DEFAULT 'pending',
 total_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0), notes text,
 owner_user_id uuid NOT NULL REFERENCES auth.users(id), store_account_id uuid NOT NULL REFERENCES public.store_accounts(id),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.agenda_product_order_items (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES public.agenda_product_orders(id) ON DELETE CASCADE,
 product_id uuid NOT NULL REFERENCES public.agenda_products(id), product_name text NOT NULL,
 unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0), quantity integer NOT NULL CHECK (quantity > 0),
 line_total numeric(12,2) NOT NULL CHECK (line_total=unit_price*quantity), created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.loyalty_progress ADD COLUMN agenda_client_id uuid REFERENCES public.agenda_clients(id);
-- Cadastro publico nao insere clientes em uma lista global de empresas.
DROP TRIGGER IF EXISTS on_profile_created_sync_client ON public.profiles;

CREATE FUNCTION agenda_private.owns_store(p_store uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.store_accounts a JOIN public.user_roles r ON r.user_id=a.owner_user_id AND r.role='admin'
 WHERE a.id=p_store AND a.owner_user_id=(SELECT auth.uid()) AND a.product_context='happycashagenda'
 AND (a.test_access_ends_at>now() OR EXISTS (SELECT 1 FROM public.store_subscriptions s
 WHERE s.owner_user_id=a.owner_user_id AND s.product_context='happycashagenda' AND s.status='active'
 AND s.plan_id IN ('fiado','completo','pro') AND (s.current_period_ends_at IS NULL OR s.current_period_ends_at>now()))));
$$;
CREATE FUNCTION agenda_private.store_is_public(p_store uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
 SELECT EXISTS (SELECT 1 FROM public.agenda_business_settings b WHERE b.store_account_id=p_store AND b.public_booking_enabled);
$$;
CREATE FUNCTION agenda_private.fill_store() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.store_accounts;
BEGIN
 IF NEW.store_account_id IS NULL THEN
  SELECT * INTO a FROM public.store_accounts WHERE owner_user_id=auth.uid() AND product_context='happycashagenda';
 ELSE SELECT * INTO a FROM public.store_accounts WHERE id=NEW.store_account_id; END IF;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Empresa nao encontrada.'; END IF;
 IF NEW.owner_user_id IS NOT NULL AND NEW.owner_user_id<>a.owner_user_id THEN RAISE EXCEPTION 'Dono da empresa invalido.'; END IF;
 NEW.store_account_id:=a.id; NEW.owner_user_id:=a.owner_user_id;
 RETURN NEW;
END $$;
CREATE TRIGGER agenda_fill_store BEFORE INSERT OR UPDATE ON public.barbers FOR EACH ROW EXECUTE FUNCTION agenda_private.fill_store();
CREATE TRIGGER agenda_fill_store BEFORE INSERT OR UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION agenda_private.fill_store();
CREATE TRIGGER agenda_fill_store BEFORE INSERT OR UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION agenda_private.fill_store();
CREATE TRIGGER agenda_fill_store BEFORE INSERT OR UPDATE ON public.appointment_services FOR EACH ROW EXECUTE FUNCTION agenda_private.fill_store();
CREATE TRIGGER agenda_fill_store BEFORE INSERT OR UPDATE ON public.business_hours FOR EACH ROW EXECUTE FUNCTION agenda_private.fill_store();
CREATE TRIGGER agenda_fill_store BEFORE INSERT OR UPDATE ON public.business_locations FOR EACH ROW EXECUTE FUNCTION agenda_private.fill_store();
CREATE TRIGGER agenda_fill_store BEFORE INSERT OR UPDATE ON public.loyalty_programs FOR EACH ROW EXECUTE FUNCTION agenda_private.fill_store();
CREATE TRIGGER agenda_fill_store BEFORE INSERT OR UPDATE ON public.loyalty_progress FOR EACH ROW EXECUTE FUNCTION agenda_private.fill_store();
CREATE TRIGGER agenda_fill_store BEFORE INSERT OR UPDATE ON public.agenda_clients FOR EACH ROW EXECUTE FUNCTION agenda_private.fill_store();
CREATE TRIGGER agenda_fill_store BEFORE INSERT OR UPDATE ON public.agenda_products FOR EACH ROW EXECUTE FUNCTION agenda_private.fill_store();
CREATE TRIGGER agenda_fill_store BEFORE INSERT OR UPDATE ON public.agenda_product_orders FOR EACH ROW EXECUTE FUNCTION agenda_private.fill_store();
CREATE TRIGGER agenda_fill_store BEFORE INSERT OR UPDATE ON public.agenda_business_settings FOR EACH ROW EXECUTE FUNCTION agenda_private.fill_store();
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT schemaname,tablename,policyname FROM pg_policies WHERE schemaname='public' LOOP
 EXECUTE format('DROP POLICY %I ON %I.%I',p.policyname,p.schemaname,p.tablename);
 END LOOP;
END $$;
ALTER TABLE public.store_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_business_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_product_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agenda_product_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.profiles,public.user_roles,public.store_accounts,public.store_subscriptions FROM anon,authenticated;
GRANT SELECT ON public.profiles,public.user_roles,public.store_accounts,public.store_subscriptions TO authenticated;
GRANT UPDATE(full_name,phone,avatar_url,username) ON public.profiles TO authenticated;
CREATE POLICY agenda_own_profile_read ON public.profiles FOR SELECT TO authenticated USING (id=(SELECT auth.uid()));
CREATE POLICY agenda_own_profile_update ON public.profiles FOR UPDATE TO authenticated USING (id=(SELECT auth.uid())) WITH CHECK (id=(SELECT auth.uid()));
CREATE POLICY agenda_own_role ON public.user_roles FOR SELECT TO authenticated USING (user_id=(SELECT auth.uid()));
CREATE POLICY agenda_own_account ON public.store_accounts FOR SELECT TO authenticated USING (owner_user_id=(SELECT auth.uid()));
CREATE POLICY agenda_own_subscription ON public.store_subscriptions FOR SELECT TO authenticated USING (owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.barbers TO authenticated;
CREATE POLICY agenda_store_admin ON public.barbers FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.services TO authenticated;
CREATE POLICY agenda_store_admin ON public.services FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.appointments TO authenticated;
CREATE POLICY agenda_store_admin ON public.appointments FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.appointment_services TO authenticated;
CREATE POLICY agenda_store_admin ON public.appointment_services FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.business_hours TO authenticated;
CREATE POLICY agenda_store_admin ON public.business_hours FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.business_locations TO authenticated;
CREATE POLICY agenda_store_admin ON public.business_locations FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.loyalty_programs TO authenticated;
CREATE POLICY agenda_store_admin ON public.loyalty_programs FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.loyalty_progress TO authenticated;
CREATE POLICY agenda_store_admin ON public.loyalty_progress FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.agenda_clients TO authenticated;
CREATE POLICY agenda_store_admin ON public.agenda_clients FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.agenda_products TO authenticated;
CREATE POLICY agenda_store_admin ON public.agenda_products FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.agenda_product_orders TO authenticated;
CREATE POLICY agenda_store_admin ON public.agenda_product_orders FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.agenda_business_settings TO authenticated;
CREATE POLICY agenda_store_admin ON public.agenda_business_settings FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.clients TO authenticated;
CREATE POLICY agenda_store_admin ON public.clients FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.products TO authenticated;
CREATE POLICY agenda_store_admin ON public.products FOR ALL TO authenticated
 USING (agenda_private.owns_store(store_account_id)) WITH CHECK (agenda_private.owns_store(store_account_id) AND owner_user_id=(SELECT auth.uid()));
GRANT SELECT ON public.barbers TO anon;
CREATE POLICY agenda_public_catalog ON public.barbers FOR SELECT TO anon,authenticated USING (is_active AND agenda_private.store_is_public(store_account_id));
GRANT SELECT ON public.services TO anon;
CREATE POLICY agenda_public_catalog ON public.services FOR SELECT TO anon,authenticated USING (is_active AND agenda_private.store_is_public(store_account_id));
GRANT SELECT ON public.business_locations TO anon;
CREATE POLICY agenda_public_catalog ON public.business_locations FOR SELECT TO anon,authenticated USING (is_active AND agenda_private.store_is_public(store_account_id));
GRANT SELECT ON public.loyalty_programs TO anon;
CREATE POLICY agenda_public_catalog ON public.loyalty_programs FOR SELECT TO anon,authenticated USING (is_active AND agenda_private.store_is_public(store_account_id));
GRANT SELECT ON public.agenda_products TO anon;
CREATE POLICY agenda_public_catalog ON public.agenda_products FOR SELECT TO anon,authenticated USING (is_active AND agenda_private.store_is_public(store_account_id));
GRANT SELECT ON public.business_hours,public.agenda_business_settings TO anon;
CREATE POLICY agenda_public_hours ON public.business_hours FOR SELECT TO anon,authenticated USING (agenda_private.store_is_public(store_account_id));
CREATE POLICY agenda_public_branding ON public.agenda_business_settings FOR SELECT TO anon,authenticated USING (public_booking_enabled);
CREATE POLICY agenda_client_appointments ON public.appointments FOR SELECT TO authenticated USING (client_id=(SELECT auth.uid()));
CREATE POLICY agenda_client_extras ON public.appointment_services FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.appointments a WHERE a.id=appointment_id AND a.client_id=(SELECT auth.uid())));
CREATE POLICY agenda_employee_appointments ON public.appointments FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.barbers b WHERE b.id=barber_id AND b.user_id=(SELECT auth.uid())));
GRANT SELECT ON public.agenda_product_order_items TO authenticated;
CREATE POLICY agenda_order_items ON public.agenda_product_order_items FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.agenda_product_orders o WHERE o.id=order_id AND agenda_private.owns_store(o.store_account_id)));

-- Credenciais profissionais nunca sao devolvidas pela API publica.
REVOKE SELECT ON public.barbers FROM anon,authenticated;
GRANT SELECT(id,name,email,phone,photo_url,bio,is_active,created_at,updated_at,commission,user_id,username,owner_user_id,store_account_id) ON public.barbers TO anon,authenticated;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA agenda_private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION agenda_private.owns_store(uuid),agenda_private.store_is_public(uuid) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.set_barber_password(p_barber_id uuid,p_username text,p_password text) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE s uuid;
BEGIN
 SELECT store_account_id INTO s FROM public.barbers WHERE id=p_barber_id;
 IF NOT agenda_private.owns_store(s) THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
 IF length(trim(p_username))<3 OR length(p_password)<12 THEN RAISE EXCEPTION 'Use usuario com 3 caracteres e senha com pelo menos 12 caracteres.'; END IF;
 UPDATE public.barbers SET username=trim(p_username),password_hash=extensions.crypt(p_password,extensions.gen_salt('bf')) WHERE id=p_barber_id;
 RETURN true;
END $$;
CREATE TABLE agenda_private.barber_sessions (
 token_hash text PRIMARY KEY, barber_id uuid NOT NULL REFERENCES public.barbers(id) ON DELETE CASCADE,
 expires_at timestamptz NOT NULL DEFAULT now()+interval '12 hours'
);
ALTER TABLE agenda_private.barber_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON agenda_private.barber_sessions FROM anon,authenticated;
DROP FUNCTION public.authenticate_barber(text,text);
CREATE FUNCTION public.authenticate_barber(p_username text,p_password text)
RETURNS TABLE(barber_id uuid,barber_name text,user_id uuid,session_token text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.barbers; token text;
BEGIN
 SELECT * INTO b FROM public.barbers WHERE username=p_username AND is_active
 AND password_hash=extensions.crypt(p_password,password_hash);
 IF b.id IS NULL THEN RETURN; END IF;
 token:=encode(extensions.gen_random_bytes(32),'hex');
 DELETE FROM agenda_private.barber_sessions WHERE expires_at<now();
 INSERT INTO agenda_private.barber_sessions(token_hash,barber_id) VALUES(encode(extensions.digest(token,'sha256'),'hex'),b.id);
 RETURN QUERY SELECT b.id,b.name,b.user_id,token;
END $$;
CREATE FUNCTION public.verify_barber_session(p_barber_id uuid,p_session_token text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM agenda_private.barber_sessions s JOIN public.barbers b ON b.id=s.barber_id
 WHERE s.barber_id=p_barber_id AND s.token_hash=encode(extensions.digest(p_session_token,'sha256'),'hex') AND s.expires_at>now() AND b.is_active);
$$;
CREATE FUNCTION agenda_private.can_work(p_barber uuid,p_token text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.barbers b WHERE b.id=p_barber AND b.is_active AND
 (agenda_private.owns_store(b.store_account_id) OR b.user_id=auth.uid() OR public.verify_barber_session(b.id,p_token)));
$$;
REVOKE ALL ON FUNCTION agenda_private.can_work(uuid,text) FROM PUBLIC;

DROP FUNCTION public.get_barber_appointments(uuid);
CREATE FUNCTION public.get_barber_appointments(p_barber_id uuid,p_session_token text DEFAULT NULL)
RETURNS TABLE(id uuid,client_name text,client_phone text,appointment_date date,appointment_time time,status public.appointment_status,payment_method text,payment_status text,service_id uuid,service_name text,service_price numeric,service_duration integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT agenda_private.can_work(p_barber_id,p_session_token) THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
 RETURN QUERY SELECT a.id,a.client_name,a.client_phone,a.appointment_date,a.appointment_time,a.status,a.payment_method,a.payment_status,s.id,s.name,s.price,s.duration_minutes FROM public.appointments a JOIN public.services s ON s.id=a.service_id WHERE a.barber_id=p_barber_id ORDER BY a.appointment_date DESC,a.appointment_time DESC;
END $$;
DROP FUNCTION public.get_barber_appointment_extra_services(uuid,uuid[]);
CREATE FUNCTION public.get_barber_appointment_extra_services(p_barber_id uuid,p_appointment_ids uuid[],p_session_token text DEFAULT NULL)
RETURNS TABLE(appointment_id uuid,service_id uuid,service_name text,service_price numeric,service_duration integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT agenda_private.can_work(p_barber_id,p_session_token) THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
 RETURN QUERY SELECT x.appointment_id,s.id,s.name,s.price,s.duration_minutes FROM public.appointment_services x JOIN public.appointments a ON a.id=x.appointment_id JOIN public.services s ON s.id=x.service_id WHERE a.barber_id=p_barber_id AND a.id=ANY(p_appointment_ids);
END $$;
DROP FUNCTION public.barber_cancel_appointment(uuid,uuid);
CREATE FUNCTION public.barber_cancel_appointment(p_barber_id uuid,p_appointment_id uuid,p_session_token text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT agenda_private.can_work(p_barber_id,p_session_token) THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
 UPDATE public.appointments SET status='cancelled',updated_at=now() WHERE id=p_appointment_id AND barber_id=p_barber_id AND status='scheduled';
 RETURN FOUND;
END $$;
DROP FUNCTION public.add_service_to_appointment(uuid,uuid,uuid);
CREATE FUNCTION public.add_service_to_appointment(p_barber_id uuid,p_appointment_id uuid,p_service_id uuid,p_session_token text DEFAULT NULL) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.appointments;
BEGIN
 IF NOT agenda_private.can_work(p_barber_id,p_session_token) THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
 SELECT * INTO a FROM public.appointments WHERE id=p_appointment_id AND barber_id=p_barber_id AND status='scheduled' FOR UPDATE;
 IF a.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.services s WHERE s.id=p_service_id AND s.store_account_id=a.store_account_id AND s.is_active) THEN RAISE EXCEPTION 'Agendamento ou servico invalido.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(a.barber_id::text||a.appointment_date::text,0));
 INSERT INTO public.appointment_services(appointment_id,service_id,added_by_barber,store_account_id,owner_user_id) VALUES(a.id,p_service_id,true,a.store_account_id,a.owner_user_id);
 RETURN true;
END $$;
CREATE FUNCTION public.confirm_agenda_appointment_payment(p_appointment_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 UPDATE public.appointments SET payment_status='paid',updated_at=now() WHERE id=p_appointment_id AND agenda_private.owns_store(store_account_id);
 IF NOT FOUND THEN RAISE EXCEPTION 'Agendamento nao encontrado ou acesso negado.'; END IF;
 RETURN true;
END $$;

-- Agendamentos sao escritos por funcoes que validam cliente, empresa e servicos.
CREATE OR REPLACE FUNCTION public.create_appointment_with_services(
 p_barber_id uuid,p_appointment_date date,p_appointment_time time,p_service_ids uuid[],p_client_name text,
 p_client_phone text DEFAULT NULL,p_payment_method text DEFAULT 'local',p_notes text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.barbers; result uuid; duration integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticacao necessaria.'; END IF;
 SELECT * INTO b FROM public.barbers WHERE id=p_barber_id AND is_active;
 IF b.id IS NULL OR NOT agenda_private.store_is_public(b.store_account_id) THEN RAISE EXCEPTION 'Empresa ou profissional indisponivel.'; END IF;
 IF cardinality(p_service_ids) IS NULL OR cardinality(p_service_ids)<1 OR cardinality(p_service_ids)<>(SELECT count(DISTINCT id) FROM public.services WHERE id=ANY(p_service_ids) AND store_account_id=b.store_account_id AND is_active) THEN RAISE EXCEPTION 'Servicos invalidos.'; END IF;
 IF trim(p_client_name)='' OR p_appointment_date<current_date THEN RAISE EXCEPTION 'Nome ou data invalida.'; END IF;
 SELECT sum(duration_minutes) INTO duration FROM public.services WHERE id=ANY(p_service_ids);
 PERFORM pg_advisory_xact_lock(hashtextextended(b.id::text||p_appointment_date::text,0));
 PERFORM public.assert_no_appointment_overlap(b.id,p_appointment_date,p_appointment_time,duration,NULL);
 INSERT INTO public.appointments(client_id,client_name,client_phone,barber_id,service_id,appointment_date,appointment_time,created_by,payment_method,payment_status,notes,store_account_id,owner_user_id)
 VALUES(auth.uid(),trim(p_client_name),p_client_phone,b.id,p_service_ids[1],p_appointment_date,p_appointment_time,auth.uid(),p_payment_method,'pending',p_notes,b.store_account_id,b.owner_user_id) RETURNING id INTO result;
 INSERT INTO public.appointment_services(appointment_id,service_id,added_by_barber,store_account_id,owner_user_id)
 SELECT result,s,false,b.store_account_id,b.owner_user_id FROM unnest(p_service_ids[2:cardinality(p_service_ids)]) s;
 RETURN result;
END $$;
CREATE FUNCTION public.create_barber_appointment(p_barber_id uuid,p_service_id uuid,p_client_name text,p_client_phone text,p_appointment_date date,p_appointment_time time,p_session_token text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.barbers; result uuid;
BEGIN
 IF NOT agenda_private.can_work(p_barber_id,p_session_token) THEN RAISE EXCEPTION 'Acesso negado.'; END IF;
 SELECT * INTO b FROM public.barbers WHERE id=p_barber_id;
 IF NOT EXISTS(SELECT 1 FROM public.services WHERE id=p_service_id AND store_account_id=b.store_account_id AND is_active) THEN RAISE EXCEPTION 'Servico invalido.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(b.id::text||p_appointment_date::text,0));
 INSERT INTO public.appointments(client_name,client_phone,barber_id,service_id,appointment_date,appointment_time,payment_method,payment_status,store_account_id,owner_user_id)
 VALUES(p_client_name,p_client_phone,b.id,p_service_id,p_appointment_date,p_appointment_time,'local','pending',b.store_account_id,b.owner_user_id) RETURNING id INTO result;
 RETURN result;
END $$;
CREATE FUNCTION public.cancel_client_appointment(p_appointment_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.appointments; notice numeric;
BEGIN
 SELECT * INTO a FROM public.appointments WHERE id=p_appointment_id AND client_id=auth.uid() AND status='scheduled' FOR UPDATE;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Agendamento nao encontrado.'; END IF;
 SELECT cancellation_notice_hours INTO notice FROM public.agenda_business_settings WHERE store_account_id=a.store_account_id;
 IF (a.appointment_date+a.appointment_time) AT TIME ZONE 'America/Sao_Paulo' < now()+make_interval(secs=>coalesce(notice,0)*3600) THEN RAISE EXCEPTION 'Prazo para cancelamento encerrado.'; END IF;
 UPDATE public.appointments SET status='cancelled',updated_at=now() WHERE id=a.id;
 RETURN true;
END $$;
CREATE FUNCTION public.reschedule_client_appointment(p_appointment_id uuid,p_appointment_date date,p_appointment_time time) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.appointments; notice numeric;
BEGIN
 SELECT * INTO a FROM public.appointments WHERE id=p_appointment_id AND client_id=auth.uid() AND status='scheduled' FOR UPDATE;
 IF a.id IS NULL THEN RAISE EXCEPTION 'Agendamento nao encontrado.'; END IF;
 SELECT reschedule_notice_hours INTO notice FROM public.agenda_business_settings WHERE store_account_id=a.store_account_id;
 IF (a.appointment_date+a.appointment_time) AT TIME ZONE 'America/Sao_Paulo' < now()+make_interval(secs=>coalesce(notice,2)*3600)
 OR (p_appointment_date+p_appointment_time) AT TIME ZONE 'America/Sao_Paulo'<=now() THEN RAISE EXCEPTION 'Prazo ou novo horario invalido.'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(a.barber_id::text||p_appointment_date::text,0));
 UPDATE public.appointments SET appointment_date=p_appointment_date,appointment_time=p_appointment_time,updated_at=now() WHERE id=a.id;
 RETURN true;
END $$;

-- Fidelidade permanece restrita a empresa do agendamento.
CREATE OR REPLACE FUNCTION public.auto_increment_loyalty_progress() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status='completed' AND OLD.status<>'completed' THEN
 UPDATE public.loyalty_progress lp SET current_count=lp.current_count+1,
 completed=lp.current_count+1>=p.goal_count,updated_at=now() FROM public.loyalty_programs p
 WHERE lp.program_id=p.id AND lp.store_account_id=NEW.store_account_id AND p.store_account_id=NEW.store_account_id
 AND p.is_active AND (p.service_id IS NULL OR p.service_id=NEW.service_id)
 AND lower(trim(lp.client_name))=lower(trim(NEW.client_name)) AND NOT lp.reward_claimed;
 END IF;
 RETURN NEW;
END $$;

-- Ajusta a checagem de conflito para empresas, inclusive dentro das RPCs.
ALTER FUNCTION public.assert_no_appointment_overlap(uuid,date,time,integer,uuid) SECURITY DEFINER;
ALTER FUNCTION public.appointment_total_duration_minutes(uuid) SECURITY DEFINER;
ALTER FUNCTION public.get_barber_booked_slots(uuid,date) SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.assert_no_appointment_overlap(uuid,date,time,integer,uuid),public.appointment_total_duration_minutes(uuid) FROM PUBLIC,anon,authenticated;

-- Perfis nao concedem acesso com base em metadados editaveis pelo cliente.
REVOKE EXECUTE ON FUNCTION public.set_barber_password(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_barber_password(uuid,text,text),public.confirm_agenda_appointment_payment(uuid),public.cancel_client_appointment(uuid),public.reschedule_client_appointment(uuid,date,time),public.create_appointment_with_services(uuid,date,time,uuid[],text,text,text,text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.confirm_agenda_appointment_payment(uuid),public.cancel_client_appointment(uuid),public.reschedule_client_appointment(uuid,date,time),public.create_appointment_with_services(uuid,date,time,uuid[],text,text,text,text) FROM PUBLIC,anon;
-- PostgreSQL concede EXECUTE a PUBLIC por padrao; explicitar as RPCs profissionais.
REVOKE EXECUTE ON FUNCTION public.authenticate_barber(text,text),public.verify_barber_session(uuid,text),public.get_barber_appointments(uuid,text),public.get_barber_appointment_extra_services(uuid,uuid[],text),public.barber_cancel_appointment(uuid,uuid,text),public.add_service_to_appointment(uuid,uuid,uuid,text),public.create_barber_appointment(uuid,uuid,text,text,date,time,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.authenticate_barber(text,text),public.verify_barber_session(uuid,text),public.get_barber_appointments(uuid,text),public.get_barber_appointment_extra_services(uuid,uuid[],text),public.barber_cancel_appointment(uuid,uuid,text),public.add_service_to_appointment(uuid,uuid,uuid,text),public.create_barber_appointment(uuid,uuid,text,text,date,time,text) TO anon,authenticated;
NOTIFY pgrst,'reload schema';

CREATE FUNCTION public.create_agenda_product_order(p_store_account_id uuid,p_items jsonb,p_client_name text,p_client_phone text DEFAULT NULL,p_payment_method text DEFAULT 'local',p_notes text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.store_accounts; p public.agenda_products; item jsonb; qty integer; result uuid; total numeric:=0;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticacao necessaria.'; END IF;
 IF NOT agenda_private.store_is_public(p_store_account_id) OR jsonb_typeof(p_items)<>'array' OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100 OR trim(p_client_name)='' THEN RAISE EXCEPTION 'Pedido invalido.'; END IF;
 SELECT * INTO a FROM public.store_accounts WHERE id=p_store_account_id;
 INSERT INTO public.agenda_product_orders(client_id,client_name,client_phone,payment_method,notes,store_account_id,owner_user_id)
 VALUES(auth.uid(),p_client_name,p_client_phone,p_payment_method,p_notes,a.id,a.owner_user_id) RETURNING id INTO result;
 -- Ordem deterministica evita deadlocks com pedidos simultaneos.
 FOR item IN SELECT value FROM jsonb_array_elements(p_items) ORDER BY value->>'product_id' LOOP
 qty:=(item->>'quantity')::integer;
 IF qty IS NULL OR qty NOT BETWEEN 1 AND 1000 THEN RAISE EXCEPTION 'Quantidade invalida.'; END IF;
 SELECT * INTO p FROM public.agenda_products WHERE id=(item->>'product_id')::uuid AND store_account_id=a.id AND is_active FOR UPDATE;
 IF p.id IS NULL OR p.stock_quantity<qty THEN RAISE EXCEPTION 'Produto indisponivel.'; END IF;
 UPDATE public.agenda_products SET stock_quantity=stock_quantity-qty WHERE id=p.id;
 INSERT INTO public.agenda_product_order_items(order_id,product_id,product_name,unit_price,quantity,line_total) VALUES(result,p.id,p.name,p.price,qty,p.price*qty);
 total:=total+p.price*qty;
 END LOOP;
 UPDATE public.agenda_product_orders SET total_amount=total WHERE id=result;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.create_agenda_product_order(uuid,jsonb,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.create_agenda_product_order(uuid,jsonb,text,text,text,text) TO authenticated;

-- Uploads novos ficam em pastas da empresa; URLs antigas seguem legiveis.
DO $$ DECLARE p record; BEGIN
 FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND cmd<>'SELECT' AND (coalesce(qual,'')||coalesce(with_check,'')) ~ '(barber-photos|product-images)' LOOP
 EXECUTE format('DROP POLICY %I ON storage.objects',p.policyname);
 END LOOP;
END $$;
CREATE POLICY agenda_owner_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK (bucket_id IN ('barber-photos','product-images') AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.store_accounts WHERE agenda_private.owns_store(id)));
CREATE POLICY agenda_owner_upload_update ON storage.objects FOR UPDATE TO authenticated
 USING(bucket_id IN ('barber-photos','product-images') AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.store_accounts WHERE agenda_private.owns_store(id)))
 WITH CHECK(bucket_id IN ('barber-photos','product-images') AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.store_accounts WHERE agenda_private.owns_store(id)));
CREATE POLICY agenda_owner_upload_delete ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id IN ('barber-photos','product-images') AND (storage.foldername(name))[1] IN (SELECT id::text FROM public.store_accounts WHERE agenda_private.owns_store(id)));

-- Recursos da migration historica de fila, agora com as tabelas base presentes.
-- Modo de atendimento por empresa: horario marcado, ordem de chegada ou ambos.

ALTER TABLE public.agenda_business_settings
  ADD COLUMN IF NOT EXISTS service_mode text NOT NULL DEFAULT 'appointment'
    CHECK (service_mode IN ('appointment', 'walk_in', 'both')),
  ADD COLUMN IF NOT EXISTS public_queue_visible boolean NOT NULL DEFAULT false;

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS appointment_type text NOT NULL DEFAULT 'appointment'
    CHECK (appointment_type IN ('appointment', 'queue'));

CREATE INDEX IF NOT EXISTS idx_appointments_store_queue_today
  ON public.appointments (store_account_id, appointment_date, status, appointment_type, created_at);

CREATE OR REPLACE FUNCTION public.assert_no_appointment_overlap(
  p_barber_id uuid,
  p_appointment_date date,
  p_start_time time,
  p_duration_minutes integer,
  p_ignore_appointment_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
STABLE
SET search_path TO public
AS $$
DECLARE
  new_start_min integer;
  new_end_min integer;
  conflict_id uuid;
BEGIN
  IF p_barber_id IS NULL OR p_appointment_date IS NULL OR p_start_time IS NULL THEN
    RAISE EXCEPTION 'Dados insuficientes para validar horario.';
  END IF;

  IF p_duration_minutes IS NULL OR p_duration_minutes <= 0 THEN
    RAISE EXCEPTION 'Duracao invalida para validar horario.';
  END IF;

  new_start_min := FLOOR(EXTRACT(EPOCH FROM p_start_time) / 60);
  new_end_min := new_start_min + p_duration_minutes;

  SELECT a.id
    INTO conflict_id
  FROM public.appointments a
  WHERE a.barber_id = p_barber_id
    AND a.appointment_date = p_appointment_date
    AND a.status <> 'cancelled'
    AND COALESCE(a.appointment_type, 'appointment') = 'appointment'
    AND (p_ignore_appointment_id IS NULL OR a.id <> p_ignore_appointment_id)
    AND (
      new_start_min < (FLOOR(EXTRACT(EPOCH FROM a.appointment_time) / 60) + public.appointment_total_duration_minutes(a.id))
      AND new_end_min > FLOOR(EXTRACT(EPOCH FROM a.appointment_time) / 60)
    )
  LIMIT 1;

  IF conflict_id IS NOT NULL THEN
    RAISE EXCEPTION 'Horario indisponivel: ja existe outro agendamento neste intervalo.';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_appointments_prevent_overlap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
DECLARE
  duration_min integer;
  extras_min integer;
BEGIN
  IF NEW.status = 'cancelled' OR COALESCE(NEW.appointment_type, 'appointment') = 'queue' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(duration_minutes, 0)
    INTO duration_min
  FROM public.services
  WHERE id = NEW.service_id;

  SELECT COALESCE(SUM(s2.duration_minutes), 0)
    INTO extras_min
  FROM public.appointment_services aps
  JOIN public.services s2 ON s2.id = aps.service_id
  WHERE aps.appointment_id = NEW.id;

  duration_min := COALESCE(duration_min, 0) + COALESCE(extras_min, 0);

  PERFORM public.assert_no_appointment_overlap(
    NEW.barber_id,
    NEW.appointment_date,
    NEW.appointment_time,
    duration_min,
    NEW.id
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_barber_booked_slots(
  p_barber_id uuid,
  p_appointment_date date
)
RETURNS TABLE(
  appointment_time time,
  duration_minutes integer
)
LANGUAGE sql
STABLE
SET search_path TO public
AS $$
  SELECT
    a.appointment_time,
    public.appointment_total_duration_minutes(a.id) AS duration_minutes
  FROM public.appointments a
  WHERE a.barber_id = p_barber_id
    AND a.appointment_date = p_appointment_date
    AND a.status <> 'cancelled'
    AND COALESCE(a.appointment_type, 'appointment') = 'appointment';
$$;

CREATE OR REPLACE FUNCTION public.create_walk_in_queue_entry(
  p_barber_id uuid,
  p_service_ids uuid[],
  p_client_name text,
  p_client_phone text DEFAULT NULL,
  p_payment_method text DEFAULT 'local',
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
DECLARE
  new_id uuid;
  first_service uuid;
  target_store uuid;
  target_owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_service_ids IS NULL OR array_length(p_service_ids, 1) IS NULL OR array_length(p_service_ids, 1) < 1 THEN
    RAISE EXCEPTION 'Selecione ao menos 1 servico.';
  END IF;

  first_service := p_service_ids[1];

  SELECT b.store_account_id, b.owner_user_id
    INTO target_store, target_owner
  FROM public.barbers b
  WHERE b.id = p_barber_id
    AND b.is_active = true;

  IF target_store IS NULL THEN
    RAISE EXCEPTION 'Profissional invalido.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.services s
    WHERE s.id = ANY(p_service_ids)
      AND (s.store_account_id IS DISTINCT FROM target_store OR s.is_active = false)
  ) THEN
    RAISE EXCEPTION 'Servico invalido para esta empresa.';
  END IF;

  INSERT INTO public.appointments (
    client_id,
    client_name,
    client_phone,
    barber_id,
    service_id,
    appointment_date,
    appointment_time,
    created_by,
    notes,
    payment_method,
    payment_status,
    status,
    appointment_type,
    store_account_id,
    owner_user_id
  )
  VALUES (
    auth.uid(),
    p_client_name,
    NULLIF(p_client_phone, ''),
    p_barber_id,
    first_service,
    CURRENT_DATE,
    CURRENT_TIME,
    auth.uid(),
    p_notes,
    p_payment_method,
    'pending',
    'scheduled',
    'queue',
    target_store,
    target_owner
  )
  RETURNING id INTO new_id;

  IF array_length(p_service_ids, 1) > 1 THEN
    INSERT INTO public.appointment_services (appointment_id, service_id, added_by_barber, store_account_id, owner_user_id)
    SELECT new_id, unnest(p_service_ids[2:array_length(p_service_ids, 1)]), false, target_store, target_owner;
  END IF;

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_public_waiting_queue(p_store_account_id uuid)
RETURNS TABLE(
  id uuid,
  "position" bigint,
  client_name text,
  barber_name text,
  service_name text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path TO public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS(SELECT 1 FROM public.agenda_business_settings b WHERE b.store_account_id=p_store_account_id AND b.public_booking_enabled AND b.public_queue_visible) THEN RETURN; END IF;
  RETURN QUERY
  SELECT
    q.id,
    ROW_NUMBER() OVER (ORDER BY q.created_at ASC) AS position,
    q.client_name,
    b.name AS barber_name,
    s.name AS service_name,
    q.created_at
  FROM public.appointments q
  JOIN public.barbers b ON b.id = q.barber_id
  JOIN public.services s ON s.id = q.service_id
  WHERE q.store_account_id = p_store_account_id
    AND q.appointment_date = CURRENT_DATE
    AND q.status = 'scheduled'
    AND COALESCE(q.appointment_type, 'appointment') = 'queue'
  ORDER BY q.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_walk_in_queue_entry(uuid, uuid[], text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_waiting_queue(uuid) TO authenticated;

ALTER FUNCTION public.assert_no_appointment_overlap(uuid,date,time,integer,uuid) SECURITY DEFINER;
ALTER FUNCTION public.get_barber_booked_slots(uuid,date) SECURITY DEFINER;
REVOKE EXECUTE ON FUNCTION public.create_walk_in_queue_entry(uuid,uuid[],text,text,text,text),public.get_public_waiting_queue(uuid) FROM PUBLIC,anon;
REVOKE EXECUTE ON FUNCTION public.assert_no_appointment_overlap(uuid,date,time,integer,uuid) FROM PUBLIC,anon,authenticated;
NOTIFY pgrst,'reload schema';

ALTER FUNCTION public.trg_appointments_prevent_overlap() SECURITY DEFINER;
ALTER FUNCTION public.trg_appointment_services_prevent_overlap() SECURITY DEFINER;

-- Impedir referencias cruzadas mesmo quando um dono envia IDs de outra empresa.
CREATE FUNCTION agenda_private.check_store_references() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_TABLE_NAME='appointments' THEN
  IF NOT EXISTS(SELECT 1 FROM public.barbers b WHERE b.id=NEW.barber_id AND b.store_account_id=NEW.store_account_id)
  OR NOT EXISTS(SELECT 1 FROM public.services s WHERE s.id=NEW.service_id AND s.store_account_id=NEW.store_account_id) THEN RAISE EXCEPTION 'Profissional ou servico de outra empresa.'; END IF;
 ELSIF TG_TABLE_NAME='appointment_services' THEN
  IF NOT EXISTS(SELECT 1 FROM public.appointments a WHERE a.id=NEW.appointment_id AND a.store_account_id=NEW.store_account_id)
  OR NOT EXISTS(SELECT 1 FROM public.services s WHERE s.id=NEW.service_id AND s.store_account_id=NEW.store_account_id) THEN RAISE EXCEPTION 'Agendamento ou servico de outra empresa.'; END IF;
 ELSIF TG_TABLE_NAME='loyalty_programs' THEN
  IF NEW.service_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.services s WHERE s.id=NEW.service_id AND s.store_account_id=NEW.store_account_id) THEN RAISE EXCEPTION 'Servico de outra empresa.'; END IF;
 ELSIF TG_TABLE_NAME='loyalty_progress' THEN
  IF NOT EXISTS(SELECT 1 FROM public.loyalty_programs p WHERE p.id=NEW.program_id AND p.store_account_id=NEW.store_account_id)
  OR (NEW.agenda_client_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.agenda_clients c WHERE c.id=NEW.agenda_client_id AND c.store_account_id=NEW.store_account_id)) THEN RAISE EXCEPTION 'Programa ou cliente de outra empresa.'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION agenda_private.check_store_references() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['appointments','appointment_services','loyalty_programs','loyalty_progress'] LOOP
 EXECUTE format('CREATE TRIGGER agenda_validate_references BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION agenda_private.check_store_references()',t);
 END LOOP;
END $$;
-- Uma assinatura ou teste vencido nao pode ser alterado pelo navegador.
REVOKE INSERT,UPDATE,DELETE ON public.store_accounts,public.store_subscriptions,public.user_roles FROM anon,authenticated;
