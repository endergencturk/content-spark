import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type PlanType = "guest" | "trial" | "trial_expired" | "pro";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  planType: PlanType;
  /** True when the user has full Pro access (active trial, paid Pro, or invite code). */
  hasProAccess: boolean;
  /** ISO timestamp when the free Pro trial ends. */
  trialEndsAt: string | null;
  /** Whole days left in trial (0 if expired/none). */
  trialDaysLeft: number;
  /** Hours left in trial (used when < 1 day). */
  trialHoursLeft: number;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, inviteCode?: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  authPromptReason: string;
  requireAuth: (reason?: string) => boolean;
  showUpgradeDialog: boolean;
  setShowUpgradeDialog: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  session: null,
  planType: "guest",
  hasProAccess: false,
  trialEndsAt: null,
  trialDaysLeft: 0,
  trialHoursLeft: 0,
  loading: true,
  signIn: async () => ({}),
  signUp: async () => ({}),
  signOut: async () => {},
  resetPassword: async () => ({}),
  updatePassword: async () => ({}),
  showAuthModal: false,
  setShowAuthModal: () => {},
  authPromptReason: "",
  requireAuth: () => false,
  showUpgradeDialog: false,
  setShowUpgradeDialog: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profilePlan, setProfilePlan] = useState<string>("free");
  const [trialEndsAt, setTrialEndsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPromptReason, setAuthPromptReason] = useState("");
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false);
  // Re-evaluate trial countdown every minute so the gate triggers on time.
  const [, setTick] = useState(0);

  // Load profile (plan_type, trial_ends_at) for the current user.
  const loadProfile = useCallback(async (uid: string | undefined) => {
    if (!uid) {
      setProfilePlan("free");
      setTrialEndsAt(null);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("plan_type, trial_ends_at")
      .eq("user_id", uid)
      .maybeSingle();
    setProfilePlan(data?.plan_type ?? "free");
    setTrialEndsAt((data as any)?.trial_ends_at ?? null);
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        // Defer DB call to avoid deadlock inside auth callback.
        if (session?.user) {
          setTimeout(() => loadProfile(session.user.id), 0);
        } else {
          setProfilePlan("free");
          setTrialEndsAt(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  // Tick every 60s so the trial expiry flips planType without reload.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Derive trial state.
  const { trialDaysLeft, trialHoursLeft, trialActive } = (() => {
    if (!trialEndsAt) return { trialDaysLeft: 0, trialHoursLeft: 0, trialActive: false };
    const ms = new Date(trialEndsAt).getTime() - Date.now();
    if (ms <= 0) return { trialDaysLeft: 0, trialHoursLeft: 0, trialActive: false };
    return {
      trialDaysLeft: Math.ceil(ms / (1000 * 60 * 60 * 24)),
      trialHoursLeft: Math.ceil(ms / (1000 * 60 * 60)),
      trialActive: true,
    };
  })();

  // Resolve plan type. Invite-code Pro (profilePlan='pro') is permanent.
  const planType: PlanType = !user
    ? "guest"
    : profilePlan === "pro"
      ? "pro"
      : trialActive
        ? "trial"
        : "trial_expired";

  const hasProAccess = planType === "pro" || planType === "trial";

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    setShowAuthModal(false);
    return {};
  }, []);

  const signUp = useCallback(async (email: string, password: string, _inviteCode?: string) => {
    const redirectUrl = `${window.location.origin}/app`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    if (error) return { error: error.message };
    setShowAuthModal(false);
    return {};
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfilePlan("free");
    setTrialEndsAt(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return { error: error.message };
    return {};
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    return {};
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
        hasProAccess,
        trialEndsAt,
        trialDaysLeft,
        trialHoursLeft,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        showAuthModal,
        setShowAuthModal,
        authPromptReason,
        requireAuth,
        showUpgradeDialog,
        setShowUpgradeDialog,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
