ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS resume jsonb NOT NULL DEFAULT '{}'::jsonb;