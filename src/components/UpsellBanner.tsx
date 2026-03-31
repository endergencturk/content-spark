import { memo } from "react";
import { Crown, Lock } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

interface UpsellBannerProps {
  message: string;
  onUpgrade: () => void;
  locale?: Locale;
}

export const UpsellBanner = memo(function UpsellBanner({ message, onUpgrade, locale = "en" }: UpsellBannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-4">
      <div className="flex items-start gap-3">
        <div className="shrink-0 h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Crown className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-sm font-medium text-foreground leading-snug">{message}</p>
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            <Lock className="h-3 w-3" />
            {t("upsell.btn", locale)}
          </button>
        </div>
      </div>
    </div>
  );
});
