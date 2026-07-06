-- 1. Revoke EXECUTE on SECURITY DEFINER functions from anon and authenticated
REVOKE EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_members() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_plan_from_subscription() FROM PUBLIC, anon, authenticated;

-- Ensure service_role still has execute (needed for edge functions / triggers owned by postgres)
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_list_members() TO service_role;

-- 2. Remove broad SELECT on invite_codes; invite codes are validated only via edge functions with service role
DROP POLICY IF EXISTS "Authenticated users can read active invite codes" ON public.invite_codes;
REVOKE SELECT ON public.invite_codes FROM anon, authenticated;
GRANT ALL ON public.invite_codes TO service_role;

-- 3. Add restrictive policy on generations so rows with NULL user_id cannot be reached by API roles
CREATE POLICY "Deny access to orphaned anonymous rows"
ON public.generations
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (user_id IS NOT NULL)
WITH CHECK (user_id IS NOT NULL);
