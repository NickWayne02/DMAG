CREATE OR REPLACE FUNCTION public.restrict_shift_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- If the user is an admin or super_admin, allow any update
  IF public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin') THEN
    RETURN NEW;
  END IF;

  -- For regular employees, prevent changing started_at
  IF NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    NEW.started_at = OLD.started_at;
  END IF;

  -- For regular employees, if they are setting ended_at, it should not be in the future
  -- (allow a small grace period for clock skew, but prevent setting ended_at hours ahead)
  IF NEW.ended_at IS NOT NULL AND OLD.ended_at IS NULL THEN
    IF NEW.ended_at > (now() + interval '5 minutes') THEN
       NEW.ended_at = now();
    END IF;
  END IF;
  
  -- If the shift was already finished, prevent changing ended_at again
  IF OLD.status = 'finished' AND NEW.status = 'finished' AND NEW.ended_at IS DISTINCT FROM OLD.ended_at THEN
    NEW.ended_at = OLD.ended_at;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS restrict_shift_updates_trigger ON public.shifts;
CREATE TRIGGER restrict_shift_updates_trigger
BEFORE UPDATE ON public.shifts
FOR EACH ROW EXECUTE FUNCTION public.restrict_shift_updates();
