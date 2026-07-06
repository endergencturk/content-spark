import React, { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, LogIn, UserPlus, Loader2, Eye, EyeOff, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function AuthModal() {
  const { showAuthModal, setShowAuthModal, signIn, signUp, resetPassword, authPromptReason } = useAuth();
  const [tab, setTab] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setEmail("");
    setPassword("");
    setInviteCode("");
    setError("");
    setShowPassword(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (tab === "login") {
        const result = await signIn(email, password);
        if (result.error) {
          setError(result.error);
        } else {
          toast.success("Welcome back!");
          reset();
        }
      } else if (tab === "register") {
        const result = await signUp(email, password, inviteCode || undefined);
        if (result.error) {
          setError(result.error);
        } else {
          toast.success(
            "🎉 Account created! You have 3 days of free Pro access.",
            { duration: 6000 }
          );
          reset();
        }
      } else {
        const result = await resetPassword(email);
        if (result.error) {
          setError(result.error);
        } else {
          toast.success("Password reset link sent! Check your email.", { duration: 6000 });
          setTab("login");
          reset();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={showAuthModal}
      onOpenChange={(open) => {
        setShowAuthModal(open);
        if (!open) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            {tab === "login" ? "Sign In" : tab === "register" ? "Create Account" : "Reset Password"}
          </DialogTitle>
          <DialogDescription>
            {tab === "login"
              ? "Sign in to access the app and your saved generations."
              : tab === "register"
                ? "Create an account to start your 3-day Pro trial and use the app."
                : "Enter your email and we'll send you a reset link."}
          </DialogDescription>
        </DialogHeader>

        {authPromptReason && (
          <p className="text-sm text-muted-foreground -mt-2">
            Sign in to {authPromptReason}.
          </p>
        )}

        {/* Tab toggle */}
        {tab !== "forgot" && (
        <div className="flex gap-1 p-0.5 rounded-xl bg-muted/60">
          <button
            type="button"
            onClick={() => { setTab("login"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === "login" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <LogIn className="h-3.5 w-3.5" />
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setTab("register"); setError(""); }}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
              tab === "register" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            Register
          </button>
        </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          {tab !== "forgot" && (
          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <div className="relative">
              <Input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={tab === "login" ? "current-password" : "new-password"}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          )}

          {tab === "login" && (
            <>
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked === true)}
              />
              <Label htmlFor="remember-me" className="text-sm font-normal text-muted-foreground cursor-pointer">
                Remember me
              </Label>
              <button
                type="button"
                onClick={() => { setTab("forgot"); setError(""); }}
                className="ml-auto text-xs font-medium text-primary hover:underline"
              >
                Forgot password?
              </button>
            </div>
            </>
          )}

          {tab === "register" && (
            <div className="space-y-2">
              <Label htmlFor="auth-invite" className="flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5 text-primary" />
                Invite Code
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="auth-invite"
                type="text"
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Have an invite code? Unlock Pro during sign up.
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : tab === "login" ? (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </>
            ) : tab === "register" ? (
              <>
                <UserPlus className="h-4 w-4 mr-2" />
                {inviteCode ? "Create Pro Account" : "Create Free Account"}
              </>
            ) : (
              <>Send Reset Link</>
            )}
          </Button>

          {tab === "forgot" && (
            <button
              type="button"
              onClick={() => { setTab("login"); setError(""); }}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back to sign in
            </button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
