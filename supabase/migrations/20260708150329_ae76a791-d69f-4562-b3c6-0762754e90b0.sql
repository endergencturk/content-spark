-- Lock down invite_codes so only service_role can access it.
-- Revoke any accidental grants to anon/authenticated and ensure RLS is enabled.
ALTER TABLE public.invite_codes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.invite_codes FROM anon;
REVOKE ALL ON public.invite_codes FROM authenticated;
GRANT ALL ON public.invite_codes TO service_role;

-- Explicit deny policies for anon/authenticated (defense-in-depth: even if a
-- future permissive policy is added, these restrictive policies block access).
DROP POLICY IF EXISTS "Deny all access to invite_codes for anon" ON public.invite_codes;
CREATE POLICY "Deny all access to invite_codes for anon"
  ON public.invite_codes
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- Allow service_role full access (edge functions validate invite codes server-side).
DROP POLICY IF EXISTS "Service role manages invite_codes" ON public.invite_codes;
CREATE POLICY "Service role manages invite_codes"
  ON public.invite_codes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);