-- Function that syncs profiles.plan_type from subscriptions
-- Only acts on LIVE subscriptions (sandbox does not grant Pro)
-- Never demotes invite-code users (those have no subscriptions row)
CREATE OR REPLACE FUNCTION public.sync_profile_plan_from_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_active_pro BOOLEAN;
BEGIN
  -- Only sync from LIVE subscriptions (sandbox/test must not affect plan)
  IF COALESCE(NEW.environment, 'sandbox') <> 'live' THEN
    RETURN NEW;
  END IF;

  is_active_pro := NEW.status IN ('active', 'trialing')
                   AND (NEW.current_period_end IS NULL OR NEW.current_period_end > now());

  IF is_active_pro THEN
    UPDATE public.profiles
      SET plan_type = 'pro', updated_at = now()
      WHERE user_id = NEW.user_id AND plan_type IS DISTINCT FROM 'pro';
  ELSE
    -- Subscription is canceled/past_due/expired → downgrade
    UPDATE public.profiles
      SET plan_type = 'free', updated_at = now()
      WHERE user_id = NEW.user_id AND plan_type = 'pro';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_plan_trigger ON public.subscriptions;
CREATE TRIGGER sync_profile_plan_trigger
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_plan_from_subscription();