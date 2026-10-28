BEGIN;
SET LOCAL lock_timeout='5s';
ALTER TABLE public.agenda_business_settings ADD COLUMN google_review_url text;
ALTER TABLE public.agenda_business_settings ADD CONSTRAINT agenda_google_review_url_https CHECK (
 google_review_url IS NULL OR google_review_url ~* '^https://([a-z0-9-]+\.)*(google\.com(\.br)?|g\.page|maps\.app\.goo\.gl)(/|$)'
);
CREATE TABLE public.agenda_slug_aliases (
 slug text PRIMARY KEY CHECK (slug ~ '^[a-z0-9][a-z0-9-]{1,62}$'),
 business_id uuid NOT NULL REFERENCES public.agenda_business_settings(id) ON DELETE CASCADE,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.agenda_slug_aliases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.agenda_slug_aliases FROM PUBLIC,anon,authenticated;

CREATE FUNCTION agenda_private.protect_business_slug() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE effective_id uuid;
BEGIN
 SELECT id INTO effective_id FROM public.agenda_business_settings WHERE owner_user_id=NEW.owner_user_id;
 effective_id := coalesce(effective_id,NEW.id);
 IF (TG_OP='INSERT' OR NEW.slug IS DISTINCT FROM OLD.slug) AND (NEW.slug !~ '^[a-z0-9][a-z0-9-]{1,62}$' OR NEW.slug=ANY(ARRAY['login','perfil','feed','assinatura','agendamento','booking','meus-agendamentos','my-appointments','painel','painel-barbeiro','painel-profissional','admin','barber','professional','produtos','products','auth','reset-password','sobre','fila','exemplos-graficos'])) THEN
  RAISE EXCEPTION 'Endereço reservado ou inválido. Use letras minúsculas, números e hífens.' USING ERRCODE='23514';
 END IF;
 -- Lock the old and new names in a stable order, including aliases.
 PERFORM pg_advisory_xact_lock(hashtextextended('agenda-slug:'||name,0))
 FROM (SELECT DISTINCT name FROM unnest(ARRAY[NEW.slug,CASE WHEN TG_OP='UPDATE' THEN OLD.slug ELSE NEW.slug END]) names(name) ORDER BY name) names;
 IF EXISTS(SELECT 1 FROM public.agenda_slug_aliases a WHERE a.slug=NEW.slug AND a.business_id<>effective_id) THEN
  RAISE EXCEPTION 'Este endereço já pertence a outra barbearia.' USING ERRCODE='23505';
 END IF;
 IF TG_OP='UPDATE' AND OLD.slug IS DISTINCT FROM NEW.slug THEN
  INSERT INTO public.agenda_slug_aliases(slug,business_id) VALUES(OLD.slug,OLD.id)
  ON CONFLICT(slug) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER agenda_protect_slug BEFORE INSERT OR UPDATE OF slug ON public.agenda_business_settings
FOR EACH ROW EXECUTE FUNCTION agenda_private.protect_business_slug();

CREATE FUNCTION public.resolve_public_business_slug(p_slug text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT b.slug FROM public.agenda_business_settings b
 WHERE b.public_booking_enabled AND (b.slug=lower(trim(p_slug)) OR EXISTS(
  SELECT 1 FROM public.agenda_slug_aliases a WHERE a.slug=lower(trim(p_slug)) AND a.business_id=b.id
 )) LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.resolve_public_business_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_public_business_slug(text) TO anon,authenticated;

-- Hours are enforced by the server for inserts, reschedules and extensions.
CREATE FUNCTION agenda_private.validate_booking_business_hours() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE hours public.business_hours; business_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
 IF NEW.appointment_type<>'appointment' OR NEW.status<>'scheduled' THEN RETURN NEW; END IF;
 IF TG_OP='INSERT' OR NEW.appointment_date IS DISTINCT FROM OLD.appointment_date OR NEW.appointment_time IS DISTINCT FROM OLD.appointment_time THEN
  IF NEW.appointment_date+NEW.appointment_time <= (now() AT TIME ZONE 'America/Sao_Paulo') THEN
   RAISE EXCEPTION 'Escolha um horário futuro.' USING ERRCODE='23514';
  END IF;
 END IF;
 IF NEW.appointment_date < business_today THEN RETURN NEW; END IF;
 SELECT * INTO hours FROM public.business_hours h WHERE h.store_account_id=NEW.store_account_id AND h.day_of_week=extract(dow FROM NEW.appointment_date)::integer;
 IF hours.id IS NULL OR NOT hours.is_open OR hours.close_time<=hours.open_time OR NEW.appointment_time<hours.open_time
 OR NEW.appointment_date+NEW.appointment_time+make_interval(mins=>NEW.booked_duration_minutes)>NEW.appointment_date+hours.close_time THEN
  RAISE EXCEPTION 'O atendimento deve ocorrer dentro do horário de funcionamento da barbearia.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_booking_business_hours
BEFORE INSERT OR UPDATE OF barber_id,service_id,appointment_date,appointment_time,status,booked_duration_minutes
ON public.appointments FOR EACH ROW EXECUTE FUNCTION agenda_private.validate_booking_business_hours();
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

  IF NOT EXISTS(SELECT 1 FROM public.agenda_business_settings cfg WHERE cfg.store_account_id=target_store AND cfg.public_booking_enabled AND cfg.service_mode IN ('walk_in','both')) THEN
    RAISE EXCEPTION 'Esta barbearia não está recebendo entradas na fila.';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.business_hours h WHERE h.store_account_id=target_store AND h.day_of_week=extract(dow FROM now() AT TIME ZONE 'America/Sao_Paulo')::integer AND h.is_open AND (now() AT TIME ZONE 'America/Sao_Paulo')::time>=h.open_time AND (now() AT TIME ZONE 'America/Sao_Paulo')::time<h.close_time) THEN
    RAISE EXCEPTION 'A barbearia está fechada neste momento.';
  END IF;
  IF (SELECT count(*) FROM public.services WHERE id=ANY(p_service_ids) AND store_account_id=target_store AND is_active) <> cardinality(p_service_ids) THEN RAISE EXCEPTION 'Selecione serviços válidos desta barbearia.'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('queue:'||target_store::text||auth.uid()::text,0));
  IF EXISTS(SELECT 1 FROM public.appointments a WHERE a.client_id=auth.uid() AND a.store_account_id=target_store AND a.appointment_type='queue' AND a.status='scheduled' AND a.appointment_date=(now() AT TIME ZONE 'America/Sao_Paulo')::date) THEN
    RAISE EXCEPTION 'Você já está na fila desta barbearia hoje.';
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
    (now() AT TIME ZONE 'America/Sao_Paulo')::date,
    (now() AT TIME ZONE 'America/Sao_Paulo')::time,
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
    ROW_NUMBER() OVER (PARTITION BY q.barber_id ORDER BY q.created_at ASC,q.id) AS position,
    CASE WHEN q.client_id=auth.uid() OR agenda_private.owns_store(q.store_account_id) THEN q.client_name ELSE split_part(trim(q.client_name),' ',1) END AS client_name,
    b.name AS barber_name,
    s.name AS service_name,
    q.created_at
  FROM public.appointments q
  JOIN public.barbers b ON b.id = q.barber_id
  JOIN public.services s ON s.id = q.service_id
  WHERE q.store_account_id = p_store_account_id
    AND q.appointment_date = (now() AT TIME ZONE 'America/Sao_Paulo')::date
    AND q.status = 'scheduled'
    AND COALESCE(q.appointment_type, 'appointment') = 'queue'
  ORDER BY b.name,q.created_at ASC,q.id;
END;
$$;


CREATE OR REPLACE FUNCTION public.create_appointment_with_services(
 p_barber_id uuid,p_appointment_date date,p_appointment_time time,p_service_ids uuid[],p_client_name text,
 p_client_phone text DEFAULT NULL,p_payment_method text DEFAULT 'local',p_notes text DEFAULT NULL) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE b public.barbers; result uuid; duration integer;
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Autenticacao necessaria.'; END IF;
 SELECT * INTO b FROM public.barbers WHERE id=p_barber_id AND is_active;
 IF b.id IS NULL OR NOT EXISTS(SELECT 1 FROM public.agenda_business_settings cfg WHERE cfg.store_account_id=b.store_account_id AND cfg.public_booking_enabled AND cfg.service_mode IN ('appointment','both')) THEN RAISE EXCEPTION 'Empresa ou profissional indisponivel para agendamento.'; END IF;
 IF cardinality(p_service_ids) IS NULL OR cardinality(p_service_ids)<1 OR cardinality(p_service_ids)<>(SELECT count(DISTINCT id) FROM public.services WHERE id=ANY(p_service_ids) AND store_account_id=b.store_account_id AND is_active) THEN RAISE EXCEPTION 'Servicos invalidos.'; END IF;
 IF trim(p_client_name)='' OR p_appointment_date<(now() AT TIME ZONE 'America/Sao_Paulo')::date THEN RAISE EXCEPTION 'Nome ou data invalida.'; END IF;
 SELECT sum(duration_minutes) INTO duration FROM public.services WHERE id=ANY(p_service_ids);
 PERFORM pg_advisory_xact_lock(hashtextextended(b.id::text||p_appointment_date::text,0));
 PERFORM public.assert_no_appointment_overlap(b.id,p_appointment_date,p_appointment_time,duration,NULL);
 INSERT INTO public.appointments(client_id,client_name,client_phone,barber_id,service_id,appointment_date,appointment_time,created_by,payment_method,payment_status,notes,store_account_id,owner_user_id)
 VALUES(auth.uid(),trim(p_client_name),p_client_phone,b.id,p_service_ids[1],p_appointment_date,p_appointment_time,auth.uid(),p_payment_method,'pending',p_notes,b.store_account_id,b.owner_user_id) RETURNING id INTO result;
 INSERT INTO public.appointment_services(appointment_id,service_id,added_by_barber,store_account_id,owner_user_id)
 SELECT result,s,false,b.store_account_id,b.owner_user_id FROM unnest(p_service_ids[2:cardinality(p_service_ids)]) s;
 RETURN result;
END $$;

NOTIFY pgrst, 'reload schema';
COMMIT;
