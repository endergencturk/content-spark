-- 1. Add user_id to generations (nullable for legacy rows)
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);

-- 2. Drop overly-permissive RLS policies on generations
DROP POLICY IF EXISTS "Anyone can insert generations" ON public.generations;
DROP POLICY IF EXISTS "Anyone can read own generations" ON public.generations;
DROP POLICY IF EXISTS "Anyone can update own generations" ON public.generations;
DROP POLICY IF EXISTS "Users can delete their own generations" ON public.generations;

-- 3. New owner-scoped policies (authenticated only)
CREATE POLICY "Users can view own generations"
  ON public.generations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generations"
  ON public.generations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generations"
  ON public.generations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own generations"
  ON public.generations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 4. Restrict invite_codes to authenticated users only
DROP POLICY IF EXISTS "Anyone can read active invite codes" ON public.invite_codes;

CREATE POLICY "Authenticated users can read active invite codes"
  ON public.invite_codes FOR SELECT
  TO authenticated
  USING (is_active = true);
