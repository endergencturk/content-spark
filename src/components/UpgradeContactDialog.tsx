import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, Mail, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const CONTACT_EMAIL = "hello@contentspark.app";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** When true, presented as a hard block (trial expired). */
  blocking?: boolean;
}

export function UpgradeContactDialog({ open, onOpenChange, blocking = false }: Props) {
  const { user, trialDaysLeft, trialHoursLeft, planType } = useAuth();

  const subject = encodeURIComponent("Pro Upgrade Request — Content Spark");
  const body = encodeURIComponent(
    `Hi,\n\nI'd like to upgrade to the Pro plan ($19/mo).\n\nAccount email: ${user?.email ?? ""}\n\nThanks!`
  );
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

  const trialBadge =
    planType === "trial"
      ? trialDaysLeft > 1
        ? `${trialDaysLeft} days left in trial`
        : trialHoursLeft > 1
          ? `${trialHoursLeft} hours left in trial`
          : "Trial ending soon"
      : planType === "trial_expired"
        ? "Your free trial has ended"
        : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // If blocking (trial expired), don't allow casual dismissal.
        if (blocking && !o) return;
        onOpenChange(o);
      }}
    >
      <DialogContent
        className="sm:max-w-md rounded-2xl"
        onInteractOutside={(e) => blocking && e.preventDefault()}
        onEscapeKeyDown={(e) => blocking && e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg mb-2">
            <Crown className="h-7 w-7 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center text-xl font-bold">
            {blocking ? "Your free trial has ended" : "Upgrade to Pro"}
          </DialogTitle>
        </DialogHeader>

        {trialBadge && (
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground -mt-2">
            <Clock className="h-3.5 w-3.5" />
            {trialBadge}
          </div>
        )}

        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5 mt-2">
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-4xl font-extrabold text-foreground">$19</span>
            <span className="text-sm text-muted-foreground">/month</span>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-1">Pro plan — full access</p>

          <ul className="mt-5 space-y-2.5 text-sm text-foreground">
            {[
              "Unlimited generations",
              "All platforms (TikTok, Shorts, Reels)",
              "Bulk pack & weekly content plan",
              "A/B hook testing",
              "Editing plan + image prompts",
              "SEO metadata + posting times",
            ].map((f) => (
              <li key={f} className="flex items-center gap-2">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-xl bg-muted/50 border border-border p-3 text-center">
          <p className="text-xs text-muted-foreground">
            Payments are not yet automated. To activate Pro, contact us — we&apos;ll set you up manually within 24h.
          </p>
        </div>

        <Button asChild className="w-full h-11 rounded-xl font-semibold">
          <a href={mailto}>
            <Mail className="h-4 w-4 mr-2" />
            Contact us to upgrade
          </a>
        </Button>

        {!blocking && (
          <Button variant="ghost" className="w-full" onClick={() => onOpenChange(false)}>
            Maybe later
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
