-- Run as postgres. All test writes roll back; no customer data is retained.
BEGIN;
DO $$
DECLARE sample public.appointments;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conrelid='public.appointments'::regclass
      AND conname='appointments_no_overlap' AND contype='x' AND convalidated
  ) THEN RAISE EXCEPTION 'Missing validated exclusion constraint'; END IF;
  SELECT * INTO sample FROM public.appointments
  WHERE status <> 'cancelled' AND appointment_type='appointment' LIMIT 1;
  IF FOUND THEN
    sample.id := gen_random_uuid();
    BEGIN
      INSERT INTO public.appointments SELECT (sample).*;
      RAISE EXCEPTION 'Conflicting reservation was incorrectly accepted';
    EXCEPTION WHEN exclusion_violation THEN
      RAISE NOTICE 'PASS: database rejected conflicting reservation (23P01)';
    END;
  ELSE RAISE NOTICE 'No existing reservation for rollback test; run concurrency suite';
  END IF;
END $$;
ROLLBACK;
