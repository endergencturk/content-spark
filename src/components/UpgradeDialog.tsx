import { memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Target, Film, Mic, Image, Sparkles, Mail } from "lucide-react";
import { PAYMENTS_ENABLED } from "@/hooks/useProStatus";
import { t, type Locale } from "@/lib/i18n";

const FEATURE_KEYS = [
  { icon: Sparkles, key: "upgrade.feature.styles" },
  { icon: Target, key: "upgrade.feature.hooks" },
  { icon: Film, key: "upgrade.feature.editing" },
  { icon: Mic, key: "upgrade.feature.scripts" },
  { icon: Image, key: "upgrade.feature.images" },
  { icon: Zap, key: "upgrade.feature.unlimited" },
] as const;

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: string;
  locale?: Locale;
}

export const UpgradeDialog = memo(function UpgradeDialog({
  open,
  onOpenChange,
  trigger,
  locale = "en",
}: UpgradeDialogProps) {
  // When payments are not enabled, show "Coming Soon" contact modal
  if (!PAYMENTS_ENABLED) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm rounded-3xl p-6">
          <DialogHeader className="text-center items-center space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Crown className="h-7 w-7 text-primary" />
            </div>
            <DialogTitle className="text-xl font-bold">Pro Coming Soon</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Billing is not live yet. You can request early access.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2.5 pt-2">
            {FEATURE_KEYS.map((f) => (
              <div key={f.key} className="flex items-center gap-3 px-1">
                <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <f.icon className="h-4 w-4 text-primary" />
                </div>
                <p className="text-sm text-foreground font-medium">{t(f.key, locale)}</p>
              </div>
            ))}
          </div>

          <div className="pt-4 space-y-2.5">
            <Button
              className="w-full h-12 rounded-2xl text-base font-bold"
              onClick={() => {
                window.location.href = "mailto:ender.genctuerk@gmail.com?subject=Pro%20Early%20Access%20Request";
                onOpenChange(false);
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Contact for Access
            </Button>
            <p className="text-center text-[11px] text-muted-foreground">
              We'll notify you as soon as Pro is available.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const title = t("upgrade.title.payments", locale);
  const desc = trigger || t("upgrade.desc.payments", locale);
  const btnLabel = t("upgrade.btn.payments", locale);
  const note = t("upgrade.note.payments", locale);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader className="text-center items-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">{title}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
            {desc}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 pt-2">
          {FEATURE_KEYS.map((f) => (
            <div key={f.key} className="flex items-center gap-3 px-1">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-foreground font-medium">{t(f.key, locale)}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 space-y-2.5">
          <Button
            className="w-full h-12 rounded-2xl text-base font-bold"
            onClick={() => {
              window.open("https://endergenctuerk.gumroad.com/l/fiblfb", "_blank");
              onOpenChange(false);
            }}
          >
            <Crown className="h-4 w-4 mr-2" />
            {btnLabel}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">{note}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
});
