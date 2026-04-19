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
  // Single-tier model: every signed-in user is "pro" (full access).
  // Guests (signed-out) cannot use the app.
  const [planType, setPlanType] = useState<PlanType>("guest");
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPromptReason, setAuthPromptReason] = useState("");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setPlanType(session?.user ? "pro" : "guest");
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setPlanType(session?.user ? "pro" : "guest");
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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
