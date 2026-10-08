-- Allow initial profile setup (when is_profile_complete is false) to set role
-- Block role/block changes only after profile is complete, unless by admin
CREATE OR REPLACE FUNCTION public.prevent_role_self_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.is_blocked IS DISTINCT FROM OLD.is_blocked) THEN
    -- Allow if running in migration/admin context (no auth.uid())
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;
    -- Allow admins
    IF public.has_role(auth.uid(), 'admin') THEN RETURN NEW; END IF;
    -- Allow initial profile setup (transitioning from incomplete to complete)
    -- Only permits setting role to 'student' for self
    IF OLD.is_profile_complete = false AND NEW.role = 'student'::public.app_role THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Only admins can change role or block status';
  END IF;
  RETURN NEW;
END;
$function$;

-- Backfill: any incomplete profile with NULL role should default to student
UPDATE public.profiles SET role = 'student'::public.app_role WHERE role IS NULL;