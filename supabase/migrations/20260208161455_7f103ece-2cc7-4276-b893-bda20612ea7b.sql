
-- Add client_id to loyalty_progress to link with registered clients
ALTER TABLE public.loyalty_progress ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create trigger function: when appointment is completed, auto-increment loyalty progress
CREATE OR REPLACE FUNCTION public.auto_increment_loyalty_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prog RECORD;
  progress_row RECORD;
  apt_service_id uuid;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  apt_service_id := NEW.service_id;

  -- Find all active loyalty programs that match this service (or any service)
  FOR prog IN
    SELECT id, goal_count, service_id
    FROM public.loyalty_programs
    WHERE is_active = true
      AND (service_id IS NULL OR service_id = apt_service_id)
  LOOP
    -- Find matching loyalty_progress entries by client_name (case-insensitive)
    FOR progress_row IN
      SELECT lp.id, lp.current_count, lp.completed
      FROM public.loyalty_progress lp
      WHERE lp.program_id = prog.id
        AND lower(trim(lp.client_name)) = lower(trim(NEW.client_name))
        AND lp.reward_claimed = false
    LOOP
      -- Increment count
      UPDATE public.loyalty_progress
      SET current_count = progress_row.current_count + 1,
          completed = (progress_row.current_count + 1) >= prog.goal_count,
          updated_at = now()
      WHERE id = progress_row.id;
    END LOOP;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS trg_auto_increment_loyalty ON public.appointments;
CREATE TRIGGER trg_auto_increment_loyalty
  AFTER UPDATE ON public.appointments
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_increment_loyalty_progress();
