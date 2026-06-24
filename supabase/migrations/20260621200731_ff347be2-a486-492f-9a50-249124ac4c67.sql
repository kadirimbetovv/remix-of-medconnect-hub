-- Add phone and email contact fields to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS email text;

-- Backfill email from auth.users for existing profiles
UPDATE public.profiles p
SET email = au.email
FROM auth.users au
WHERE p.id = au.id
  AND (p.email IS NULL OR p.email = '');

-- Allow either participant (student OR mentor) to delete a mentorship request
-- so "Leave Mentorship" / "Remove Student" both work.
DROP POLICY IF EXISTS "Student deletes own requests" ON public.mentorship_requests;
CREATE POLICY "Participants delete requests" ON public.mentorship_requests
  FOR DELETE TO authenticated
  USING (auth.uid() = student_id OR auth.uid() = mentor_id);