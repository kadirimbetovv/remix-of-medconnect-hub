
-- Remove all demo/seeded accounts (cascades to profiles)
DELETE FROM auth.users WHERE email IN ('student1@med.uz','student2@med.uz','mentor1@med.uz','mentor2@med.uz');
DELETE FROM public.profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- Mentorship requests between students and mentors
CREATE TABLE IF NOT EXISTS public.mentorship_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  note text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, mentor_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentorship_requests TO authenticated;
GRANT ALL ON public.mentorship_requests TO service_role;

ALTER TABLE public.mentorship_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view requests" ON public.mentorship_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = mentor_id);

CREATE POLICY "Students create requests" ON public.mentorship_requests
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Mentor updates own requests" ON public.mentorship_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = mentor_id)
  WITH CHECK (auth.uid() = mentor_id);

CREATE POLICY "Student deletes own requests" ON public.mentorship_requests
  FOR DELETE TO authenticated
  USING (auth.uid() = student_id);

CREATE TRIGGER set_mr_updated_at BEFORE UPDATE ON public.mentorship_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sessions (real, starts empty)
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  location text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sessions TO authenticated;
GRANT ALL ON public.sessions TO service_role;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view sessions" ON public.sessions
  FOR SELECT TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = mentor_id);

CREATE POLICY "Students create sessions" ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Participants update sessions" ON public.sessions
  FOR UPDATE TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = mentor_id)
  WITH CHECK (auth.uid() = student_id OR auth.uid() = mentor_id);

CREATE POLICY "Participants delete sessions" ON public.sessions
  FOR DELETE TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = mentor_id);

CREATE TRIGGER set_sessions_updated_at BEFORE UPDATE ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
