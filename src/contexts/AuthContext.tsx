import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnv } from "@/lib/paddle";
import type { User, Session } from "@supabase/supabase-js";

export type PlanType = "guest" | "free" | "pro";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  planType: PlanType;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, inviteCode?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authPromptReason: string;
  requireAuth: (reason?: string) => boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  planType: "guest",
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  showAuthModal: false,
  setShowAuthModal: () => {},
  authPromptReason: "",
  requireAuth: () => false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [planType, setPlanType] = useState<PlanType>("guest");
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPromptReason, setAuthPromptReason] = useState("");

  // Resolve plan from BOTH profiles.plan_type AND active subscriptions for current env.
  // - profiles.plan_type='pro' covers VIBERS invite-code users (no subscription row).
  // - subscriptions covers Paddle-paying users in current env (incl. sandbox for testing).
  const fetchPlan = useCallback(async (userId: string) => {
    const env = getPaddleEnv();

    const [profileRes, subRes] = await Promise.all([
      supabase.from("profiles").select("plan_type").eq("user_id", userId).maybeSingle(),
      supabase
        .from("subscriptions")
        .select("status, current_period_end")
        .eq("user_id", userId)
        .eq("environment", env)
        .maybeSingle(),
    ]);

    const profilePro = profileRes.data?.plan_type === "pro";
    const sub = subRes.data;
    const subActive =
      !!sub &&
      ["active", "trialing"].includes(sub.status) &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

    setPlanType(profilePro || subActive ? "pro" : "free");
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          // Defer to avoid Supabase deadlock
          setTimeout(() => fetchPlan(session.user.id), 0);
        } else {
          setPlanType("guest");
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchPlan(session.user.id);
      } else {
        setPlanType("guest");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchPlan]);

  // Realtime: refetch plan whenever this user's subscription row changes
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`auth-sub-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchPlan(user.id)
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchPlan(user.id)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, fetchPlan]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    setShowAuthModal(false);
    return {};
  }, []);

  const signUp = useCallback(async (email: string, password: string, inviteCode?: string) => {
    if (inviteCode && inviteCode.trim()) {
      const { data: codeData } = await supabase
        .from("invite_codes")
        .select("id")
        .eq("code", inviteCode.trim().toUpperCase())
        .eq("is_active", true)
        .single();

      if (!codeData) {
        return { error: "Invalid invite code. Please check and try again." };
      }
    }

    const { data: signUpData, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };

    if (inviteCode && inviteCode.trim() && signUpData.user) {
      await new Promise((r) => setTimeout(r, 1000));
      await supabase
        .from("profiles")
        .update({ plan_type: "pro" } as any)
        .eq("user_id", signUpData.user.id);
      setPlanType("pro");
    }

    setShowAuthModal(false);
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setPlanType("guest");
  }, []);

  const requireAuth = useCallback((reason = "this feature") => {
    if (user) return false;
    setAuthPromptReason(reason);
    setShowAuthModal(true);
    return true;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        planType,
        loading,
        signIn,
        signUp,
        signOut,
        showAuthModal,
        setShowAuthModal,
        authPromptReason,
        requireAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
