import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Sparkles, Crown, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { toast } from "sonner";

const FREE_FEATURES = [
  "3 generations per day",
  "Hook Engine (5 styles)",
  "Basic script generator",
  "Visual prompts",
  "Title & description",
  "Last 3 generations history",
];

const PRO_FEATURES = [
  "Unlimited generations",
  "Bulk Pack (10 videos at once)",
  "A/B Hook Tester",
  "Weekly Content Plan",
  "Trending Now panel",
  "Channel Profile saving",
  "Unlimited history",
  "TXT export with metadata",
  "Thumbnail ideas",
  "Posting time recommendations",
  "Priority generation speed",
];

export default function Pricing() {
  const [billing, setBilling] = useState<"monthly" | "yearly">("yearly");
  const { user, setShowAuthModal } = useAuth();
  const { isPro, loading: subLoading } = useSubscription();
  const { openCheckout, loading: checkoutLoading } = usePaddleCheckout();

  const priceId = billing === "monthly" ? "pro_monthly" : "pro_yearly";
  const displayPrice = billing === "monthly" ? "$19" : "$190";
  const subtext = billing === "monthly" ? "per month" : "per year (save 2 months)";
  const monthlyEquivalent = billing === "yearly" ? "~$15.83/mo" : null;

  const handleUpgrade = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (isPro) {
      toast.info("You're already on Pro!");
      return;
    }
    await openCheckout({
      priceId,
      customerEmail: user.email,
      userId: user.id,
      successUrl: `${window.location.origin}/checkout/success`,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <PaymentTestModeBanner />

      <header className="border-b border-border/40">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">Content Spark</span>
          </Link>
          <Link to="/" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Back home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 rounded-full px-3 py-1">
            <Crown className="h-3 w-3 mr-1.5" />
            Pricing
          </Badge>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
            Simple, honest pricing
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start free. Upgrade when you're ready to scale your content.
          </p>

          {/* Billing toggle */}
          <div className="inline-flex items-center gap-1 mt-8 p-1 rounded-2xl bg-muted">
            <button
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                billing === "monthly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("yearly")}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                billing === "yearly"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Yearly
              <Badge className="bg-primary/15 text-primary hover:bg-primary/15 text-[10px] px-1.5 py-0">
                Save 17%
              </Badge>
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* FREE */}
          <div className="rounded-3xl border border-border bg-card p-8 flex flex-col">
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-1">Free</h3>
              <p className="text-sm text-muted-foreground">For trying things out</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight">$0</span>
                <span className="text-muted-foreground text-sm">forever</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <span className="text-foreground">{f}</span>
                </li>
              ))}
            </ul>

            <Button asChild variant="outline" className="w-full h-12 rounded-2xl font-semibold">
              <Link to="/app">Start Free</Link>
            </Button>
          </div>

          {/* PRO */}
          <div className="relative rounded-3xl border-2 border-primary bg-card p-8 flex flex-col shadow-[var(--shadow-warm)]">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-3 py-1 rounded-full font-bold text-xs">
              ⭐ Most Popular
            </Badge>

            <div className="mb-6">
              <h3 className="text-xl font-bold mb-1 flex items-center gap-2">
                Pro
                <Crown className="h-4 w-4 text-primary" />
              </h3>
              <p className="text-sm text-muted-foreground">For serious creators</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold tracking-tight">{displayPrice}</span>
                <span className="text-muted-foreground text-sm">/{billing === "monthly" ? "mo" : "yr"}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{subtext}</p>
              {monthlyEquivalent && (
                <p className="text-xs text-primary font-medium mt-0.5">{monthlyEquivalent}</p>
              )}
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground font-medium">{f}</span>
                </li>
              ))}
            </ul>

            <Button
              variant="generate"
              className="w-full h-12 rounded-2xl text-base"
              onClick={handleUpgrade}
              disabled={checkoutLoading || subLoading}
            >
              {checkoutLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Opening checkout…
                </>
              ) : isPro ? (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  You're on Pro
                </>
              ) : (
                <>
                  <Crown className="h-4 w-4 mr-2" />
                  Upgrade to Pro
                </>
              )}
            </Button>

            <p className="text-center text-[11px] text-muted-foreground mt-3">
              Cancel anytime · Instant feature unlock
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-12 max-w-md mx-auto">
          Payments are processed securely by Paddle. Prices in USD. VAT/sales tax handled automatically based on your location.
        </p>
      </main>
    </div>
  );
}
