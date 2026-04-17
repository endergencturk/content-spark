import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPaddleEnv } from "@/lib/paddle";

interface Subscription {
  id: string;
  status: string;
  product_id: string;
  price_id: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  environment: string;
}

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const env = getPaddleEnv();

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("subscriptions")
      .select("id, status, product_id, price_id, current_period_end, cancel_at_period_end, environment")
      .eq("user_id", user.id)
      .eq("environment", env)
      .maybeSingle();

    setSubscription(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscription();

    if (!user) return;

    const channel = supabase
      .channel("sub-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchSubscription()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const isActive =
    subscription &&
    ["active", "trialing"].includes(subscription.status) &&
    (!subscription.current_period_end || new Date(subscription.current_period_end) > new Date());

  const isPro = !!isActive;
  const isYearly = subscription?.price_id === "pro_yearly";
  const willCancel = !!subscription?.cancel_at_period_end;
  const periodEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;

  return { subscription, isPro, isYearly, willCancel, periodEnd, loading, refetch: fetchSubscription };
}
