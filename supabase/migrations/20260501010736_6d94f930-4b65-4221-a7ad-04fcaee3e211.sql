-- Allow senders to delete their own chat messages, admins can delete any
CREATE POLICY "Senders delete own messages"
ON public.chat_messages
FOR DELETE
TO authenticated
USING (sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

-- Auto-enroll users in matching subjects when they complete their profile (branch + section)
CREATE OR REPLACE FUNCTION public.auto_enroll_on_profile_complete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.is_profile_complete = true
     AND NEW.branch IS NOT NULL
     AND NEW.section IS NOT NULL
     AND (
       OLD.is_profile_complete IS DISTINCT FROM NEW.is_profile_complete
       OR OLD.branch IS DISTINCT FROM NEW.branch
       OR OLD.section IS DISTINCT FROM NEW.section
     )
  THEN
    INSERT INTO public.enrollments (user_id, subject_id, role)
    SELECT NEW.user_id, s.id, COALESCE(NEW.role, 'student'::public.app_role)
    FROM public.subjects s
    WHERE s.branch = NEW.branch AND s.section = NEW.section
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_enroll_on_profile_complete ON public.profiles;
CREATE TRIGGER trg_auto_enroll_on_profile_complete
AFTER INSERT OR UPDATE OF is_profile_complete, branch, section ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_enroll_on_profile_complete();

-- Add unique constraint to support ON CONFLICT in enrollments (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_user_subject_unique'
  ) THEN
    ALTER TABLE public.enrollments
    ADD CONSTRAINT enrollments_user_subject_unique UNIQUE (user_id, subject_id);
  END IF;
END $$;