
-- Create role enum
CREATE TYPE public.app_role AS ENUM ('student', 'teacher', 'admin');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  role app_role,
  branch TEXT,
  section TEXT,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  is_profile_complete BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (for secure role checking)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

-- Create subjects table
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  section TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create doubts table
CREATE TABLE public.doubts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
  topic TEXT NOT NULL,
  description TEXT NOT NULL,
  anonymous_id TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'unsolved' CHECK (status IN ('unsolved', 'solved')),
  vote_count INTEGER NOT NULL DEFAULT 0,
  is_reported BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create doubt_votes table
CREATE TABLE public.doubt_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doubt_id UUID REFERENCES public.doubts(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (doubt_id, user_id)
);

-- Create answers table
CREATE TABLE public.answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doubt_id UUID REFERENCES public.doubts(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  answered_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  is_teacher_answer BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create chat_messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doubt_id UUID REFERENCES public.doubts(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sender_role app_role NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create reports table
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doubt_id UUID REFERENCES public.doubts(id) ON DELETE CASCADE NOT NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doubt_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function to get user role from profiles
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = _user_id
$$;

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_doubts_updated_at
  BEFORE UPDATE ON public.doubts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to sync role to user_roles table
CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS NOT NULL AND (OLD.role IS NULL OR OLD.role != NEW.role) THEN
    DELETE FROM public.user_roles WHERE user_id = NEW.user_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.user_id, NEW.role);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_profile_role
  AFTER UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();

-- Function to increment/decrement vote count
CREATE OR REPLACE FUNCTION public.increment_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.doubts SET vote_count = vote_count + 1 WHERE id = NEW.doubt_id;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.decrement_vote_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.doubts SET vote_count = vote_count - 1 WHERE id = OLD.doubt_id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER on_vote_added
  AFTER INSERT ON public.doubt_votes
  FOR EACH ROW EXECUTE FUNCTION public.increment_vote_count();

CREATE TRIGGER on_vote_removed
  AFTER DELETE ON public.doubt_votes
  FOR EACH ROW EXECUTE FUNCTION public.decrement_vote_count();

-- RLS POLICIES

-- Profiles: everyone can read, users update own, auto-insert via trigger
CREATE POLICY "Anyone can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- User roles: only readable via has_role function (security definer)
CREATE POLICY "No direct access to user_roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Subjects: all authenticated can read, teachers/admins can create
CREATE POLICY "Authenticated users can view subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teachers and admins can create subjects" ON public.subjects FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) IN ('teacher', 'admin')
  );

-- Doubts: all authenticated can read doubts in their subjects, students can create
CREATE POLICY "Authenticated users can view doubts" ON public.doubts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Students can create doubts" ON public.doubts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Teachers and admins can update doubts" ON public.doubts FOR UPDATE TO authenticated
  USING (
    public.get_user_role(auth.uid()) IN ('teacher', 'admin')
  );

-- Doubt votes
CREATE POLICY "Users can view votes" ON public.doubt_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can vote" ON public.doubt_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove own vote" ON public.doubt_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Answers
CREATE POLICY "Anyone can view answers" ON public.answers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can create answers" ON public.answers FOR INSERT TO authenticated WITH CHECK (auth.uid() = answered_by);

-- Chat messages: only doubt creator, teachers, and admins can see
CREATE POLICY "Chat participants can view messages" ON public.chat_messages FOR SELECT TO authenticated
  USING (
    sender_id = auth.uid()
    OR public.get_user_role(auth.uid()) IN ('teacher', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.doubts WHERE id = doubt_id AND created_by = auth.uid()
    )
  );
CREATE POLICY "Authenticated users can send chat messages" ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Reports
CREATE POLICY "Admins can view reports" ON public.reports FOR SELECT TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');
CREATE POLICY "Users can create reports" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = reported_by);
CREATE POLICY "Admins can update reports" ON public.reports FOR UPDATE TO authenticated
  USING (public.get_user_role(auth.uid()) = 'admin');

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.doubts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.answers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.doubt_votes;
