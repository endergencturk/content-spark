ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS used_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS used_platform text;

CREATE INDEX IF NOT EXISTS idx_generations_user_used_at
  ON public.generations (user_id, used_at DESC)
  WHERE used_at IS NOT NULL;