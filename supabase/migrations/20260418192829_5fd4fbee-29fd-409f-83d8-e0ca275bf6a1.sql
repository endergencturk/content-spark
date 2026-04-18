-- Add display_name (nickname) to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add an admin-readable view limited via SECURITY DEFINER function instead
-- Create function to list all members (admin only - called from edge function with service role)
CREATE OR REPLACE FUNCTION public.admin_list_members()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  display_name TEXT,
  plan_type TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    u.email::TEXT,
    p.display_name,
    p.plan_type,
    p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at DESC;
$$;

-- Revoke from public; only callable via service role / edge function
REVOKE EXECUTE ON FUNCTION public.admin_list_members() FROM PUBLIC, anon, authenticated;