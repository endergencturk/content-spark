import { memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Target, Film, Mic, Image, Sparkles } from "lucide-react";
import { PAYMENTS_ENABLED } from "@/hooks/useProStatus";
import { t, type Locale } from "@/lib/i18n";
import { toast } from "sonner";

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
  const title = PAYMENTS_ENABLED
    ? t("upgrade.title.payments", locale)
    : t("upgrade.title", locale);

  const desc = trigger || (PAYMENTS_ENABLED
    ? t("upgrade.desc.payments", locale)
    : t("upgrade.desc", locale));

  const btnLabel = PAYMENTS_ENABLED
    ? t("upgrade.btn.payments", locale)
    : t("upgrade.btn", locale);

  const note = PAYMENTS_ENABLED
    ? t("upgrade.note.payments", locale)
    : t("upgrade.note", locale);

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
              if (PAYMENTS_ENABLED) {
                window.open("https://endergenctuerk.gumroad.com/l/fiblfb", "_blank");
              } else {
                toast.info(t("toast.payments.disabled", locale));
              }
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
