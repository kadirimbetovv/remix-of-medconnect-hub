
ALTER TABLE public.mentorship_requests
  ADD COLUMN IF NOT EXISTS attachment_path text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

-- Storage policies for the request-attachments bucket
CREATE POLICY "Students upload attachments to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'request-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Owners and mentors read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'request-attachments'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.mentorship_requests r
      WHERE r.mentor_id = auth.uid()
        AND r.attachment_path = storage.objects.name
    )
  )
);

CREATE POLICY "Students delete own attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'request-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow students to see booked interview times for any mentor so they can avoid conflicts
CREATE OR REPLACE FUNCTION public.mentor_booked_slots(_mentor_id uuid)
RETURNS TABLE(interview_at timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT interview_at FROM public.mentorship_requests
  WHERE mentor_id = _mentor_id
    AND interview_at IS NOT NULL
    AND status IN ('pending','accepted')
$$;

GRANT EXECUTE ON FUNCTION public.mentor_booked_slots(uuid) TO authenticated;
