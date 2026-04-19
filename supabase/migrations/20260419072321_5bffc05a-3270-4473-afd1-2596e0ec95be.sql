-- Add trial column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Backfill existing users
UPDATE public.profiles
  SET trial_ends_at = now() + interval '3 days'
  WHERE trial_ends_at IS NULL;

-- New signup trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, plan_type, trial_ends_at)
  VALUES (NEW.id, 'free', now() + interval '3 days');
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop and recreate admin_list_members with new return type
DROP FUNCTION IF EXISTS public.admin_list_members();

CREATE FUNCTION public.admin_list_members()
RETURNS TABLE(user_id uuid, email text, display_name text, plan_type text, trial_ends_at timestamptz, created_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    u.email::TEXT,
    p.display_name,
    p.plan_type,
    p.trial_ends_at,
    p.created_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.user_id
  ORDER BY p.created_at DESC;
$$;