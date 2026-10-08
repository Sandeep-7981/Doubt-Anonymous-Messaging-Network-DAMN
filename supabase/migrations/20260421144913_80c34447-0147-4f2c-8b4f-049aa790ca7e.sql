
-- ============================================================
-- PHASE 1: Classroom foundation + role security
-- ============================================================

-- 1. SUBJECTS: add classroom fields ---------------------------
ALTER TABLE public.subjects
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS teacher_id UUID,
  ADD COLUMN IF NOT EXISTS join_code TEXT;

CREATE OR REPLACE FUNCTION public.generate_join_code()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INT;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, 1 + floor(random() * length(chars))::int, 1);
  END LOOP;
  RETURN result;
END;
$$;

UPDATE public.subjects SET teacher_id = created_by WHERE teacher_id IS NULL AND created_by IS NOT NULL;

DO $$
DECLARE r RECORD; new_code TEXT;
BEGIN
  FOR r IN SELECT id FROM public.subjects WHERE join_code IS NULL LOOP
    LOOP
      new_code := public.generate_join_code();
      BEGIN
        UPDATE public.subjects SET join_code = new_code WHERE id = r.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN END;
    END LOOP;
  END LOOP;
END $$;

ALTER TABLE public.subjects ALTER COLUMN join_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS subjects_join_code_unique ON public.subjects(join_code);

-- 2. ENROLLMENTS table ----------------------------------------
CREATE TABLE IF NOT EXISTS public.enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'student',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, subject_id)
);

CREATE INDEX IF NOT EXISTS enrollments_user_idx ON public.enrollments(user_id);
CREATE INDEX IF NOT EXISTS enrollments_subject_idx ON public.enrollments(subject_id);
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_enrolled(_user_id UUID, _subject_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.enrollments WHERE user_id = _user_id AND subject_id = _subject_id);
$$;

DROP POLICY IF EXISTS "Users view own enrollments" ON public.enrollments;
CREATE POLICY "Users view own enrollments" ON public.enrollments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Users self-enroll" ON public.enrollments;
CREATE POLICY "Users self-enroll" ON public.enrollments
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users leave own enrollment" ON public.enrollments;
CREATE POLICY "Users leave own enrollment" ON public.enrollments
  FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- 3. BACKFILL enrollments -------------------------------------
INSERT INTO public.enrollments (user_id, subject_id, role)
SELECT p.user_id, s.id, COALESCE(p.role, 'student'::public.app_role)
FROM public.profiles p
JOIN public.subjects s ON s.branch = p.branch AND s.section = p.section
WHERE p.branch IS NOT NULL AND p.section IS NOT NULL
ON CONFLICT (user_id, subject_id) DO NOTHING;

INSERT INTO public.enrollments (user_id, subject_id, role)
SELECT s.teacher_id, s.id, 'teacher'::public.app_role
FROM public.subjects s WHERE s.teacher_id IS NOT NULL
ON CONFLICT (user_id, subject_id) DO UPDATE SET role = 'teacher';

-- 4. Auto-enroll teacher on subject creation ------------------
CREATE OR REPLACE FUNCTION public.auto_enroll_teacher()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.teacher_id IS NULL THEN NEW.teacher_id := NEW.created_by; END IF;
  IF NEW.join_code IS NULL THEN
    LOOP
      BEGIN NEW.join_code := public.generate_join_code(); EXIT;
      EXCEPTION WHEN unique_violation THEN END;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subjects_before_insert ON public.subjects;
CREATE TRIGGER subjects_before_insert BEFORE INSERT ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.auto_enroll_teacher();

CREATE OR REPLACE FUNCTION public.enroll_teacher_after_subject()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.teacher_id IS NOT NULL THEN
    INSERT INTO public.enrollments (user_id, subject_id, role)
    VALUES (NEW.teacher_id, NEW.id, 'teacher')
    ON CONFLICT (user_id, subject_id) DO UPDATE SET role = 'teacher';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS subjects_after_insert_enroll ON public.subjects;
CREATE TRIGGER subjects_after_insert_enroll AFTER INSERT ON public.subjects
  FOR EACH ROW EXECUTE FUNCTION public.enroll_teacher_after_subject();

-- 5. RLS REWRITE ---------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Enrolled users view subjects" ON public.subjects;
CREATE POLICY "Enrolled users view subjects" ON public.subjects
  FOR SELECT TO authenticated
  USING (public.is_enrolled(auth.uid(), id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Teachers and admins can create subjects" ON public.subjects;
CREATE POLICY "Teachers and admins can create subjects" ON public.subjects
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can view doubts" ON public.doubts;
DROP POLICY IF EXISTS "Enrolled users view doubts" ON public.doubts;
CREATE POLICY "Enrolled users view doubts" ON public.doubts
  FOR SELECT TO authenticated
  USING (public.is_enrolled(auth.uid(), subject_id) OR public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Students can create doubts" ON public.doubts;
DROP POLICY IF EXISTS "Enrolled users create doubts" ON public.doubts;
CREATE POLICY "Enrolled users create doubts" ON public.doubts
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by AND public.is_enrolled(auth.uid(), subject_id));

DROP POLICY IF EXISTS "Anyone can view answers" ON public.answers;
DROP POLICY IF EXISTS "Enrolled users view answers" ON public.answers;
CREATE POLICY "Enrolled users view answers" ON public.answers
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.doubts d WHERE d.id = answers.doubt_id
      AND (public.is_enrolled(auth.uid(), d.subject_id) OR public.has_role(auth.uid(), 'admin'))
  ));

DROP POLICY IF EXISTS "Authenticated users can create answers" ON public.answers;
DROP POLICY IF EXISTS "Enrolled users create answers" ON public.answers;
CREATE POLICY "Enrolled users create answers" ON public.answers
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = answered_by AND EXISTS (
    SELECT 1 FROM public.doubts d WHERE d.id = answers.doubt_id
      AND public.is_enrolled(auth.uid(), d.subject_id)
  ));

DROP POLICY IF EXISTS "Chat participants can view messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Enrolled chat participants view messages" ON public.chat_messages;
CREATE POLICY "Enrolled chat participants view messages" ON public.chat_messages
  FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.doubts d WHERE d.id = chat_messages.doubt_id
        AND (d.created_by = auth.uid() OR (
          public.is_enrolled(auth.uid(), d.subject_id)
          AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
        ))
    )
  );

DROP POLICY IF EXISTS "Authenticated users can send chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Enrolled users send chat messages" ON public.chat_messages;
CREATE POLICY "Enrolled users send chat messages" ON public.chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id AND EXISTS (
    SELECT 1 FROM public.doubts d WHERE d.id = chat_messages.doubt_id
      AND public.is_enrolled(auth.uid(), d.subject_id)
  ));

DROP POLICY IF EXISTS "Users can vote" ON public.doubt_votes;
DROP POLICY IF EXISTS "Enrolled users can vote" ON public.doubt_votes;
CREATE POLICY "Enrolled users can vote" ON public.doubt_votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.doubts d WHERE d.id = doubt_votes.doubt_id
      AND public.is_enrolled(auth.uid(), d.subject_id)
  ));

-- 6. JOIN-BY-CODE RPC -----------------------------------------
CREATE OR REPLACE FUNCTION public.join_subject_by_code(_code TEXT)
RETURNS public.subjects LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.subjects;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT * INTO s FROM public.subjects WHERE upper(join_code) = upper(_code) LIMIT 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invalid join code'; END IF;
  INSERT INTO public.enrollments (user_id, subject_id, role)
  VALUES (auth.uid(), s.id, 'student')
  ON CONFLICT (user_id, subject_id) DO NOTHING;
  RETURN s;
END;
$$;

-- 7. ROLE SECURITY --------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE is_bootstrap_admin BOOLEAN;
BEGIN
  IF NEW.email IS NULL OR NEW.email NOT ILIKE '%@gvpce.ac.in' THEN
    RAISE EXCEPTION 'Only @gvpce.ac.in email addresses are allowed';
  END IF;
  is_bootstrap_admin := lower(NEW.email) = '324103310016@gvpce.ac.in';
  INSERT INTO public.profiles (user_id, name, email, role, is_profile_complete)
  VALUES (
    NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''), NEW.email,
    CASE WHEN is_bootstrap_admin THEN 'admin'::public.app_role ELSE 'student'::public.app_role END,
    false
  );
  IF is_bootstrap_admin THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin') ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Role lockdown trigger — but allow when there is no logged-in user (migration context)
CREATE OR REPLACE FUNCTION public.prevent_role_self_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role) OR (NEW.is_blocked IS DISTINCT FROM OLD.is_blocked) THEN
    -- Allow if running in migration/admin context (no auth.uid())
    IF auth.uid() IS NULL THEN RETURN NEW; END IF;
    IF NOT public.has_role(auth.uid(), 'admin') THEN
      RAISE EXCEPTION 'Only admins can change role or block status';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_prevent_role_self_change ON public.profiles;
CREATE TRIGGER profiles_prevent_role_self_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_change();

DROP TRIGGER IF EXISTS profiles_sync_user_role ON public.profiles;
CREATE TRIGGER profiles_sync_user_role
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();

-- Seed bootstrap admin if user already exists
DO $$
DECLARE admin_uid UUID;
BEGIN
  SELECT user_id INTO admin_uid FROM public.profiles WHERE lower(email) = '324103310016@gvpce.ac.in' LIMIT 1;
  IF admin_uid IS NOT NULL THEN
    UPDATE public.profiles SET role = 'admin' WHERE user_id = admin_uid;
    INSERT INTO public.user_roles (user_id, role) VALUES (admin_uid, 'admin') ON CONFLICT DO NOTHING;
  END IF;
END $$;
