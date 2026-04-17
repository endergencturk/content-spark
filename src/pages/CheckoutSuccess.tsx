import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Crown, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/useSubscription";
import confetti from "canvas-confetti";

export default function CheckoutSuccess() {
  const navigate = useNavigate();
  const { refetch } = useSubscription();

  useEffect(() => {
    // Trigger confetti
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });

    // Refetch subscription a few times — webhook may take a sec
    const intervals = [1000, 3000, 6000];
    const timers = intervals.map((ms) => setTimeout(() => refetch(), ms));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-primary/15 mx-auto">
          <Crown className="h-10 w-10 text-primary" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Pro! 🎉</h1>
          <p className="text-muted-foreground">
            Your payment was successful. All Pro features are now unlocked — Bulk Pack, A/B Tester, Weekly Plan, unlimited generations, and more.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 text-left text-sm space-y-2">
          <div className="flex items-center gap-2 text-primary font-semibold">
            <Sparkles className="h-4 w-4" />
            What's next?
          </div>
          <ul className="text-muted-foreground space-y-1 pl-6 list-disc">
            <li>Open the app and try Bulk Pack</li>
            <li>Save your channel profile for personalized hooks</li>
            <li>Manage your subscription anytime in settings</li>
          </ul>
        </div>

        <div className="flex flex-col gap-2">
          <Button asChild variant="generate" className="h-12 rounded-2xl text-base">
            <Link to="/app">
              Go to App
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="rounded-2xl">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
