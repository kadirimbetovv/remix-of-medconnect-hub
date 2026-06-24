
ALTER TABLE public.mentorship_requests ADD COLUMN IF NOT EXISTS decline_reason text;

DROP POLICY IF EXISTS "Mentors create sessions" ON public.sessions;
CREATE POLICY "Mentors create sessions" ON public.sessions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = mentor_id);
