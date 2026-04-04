import React, { memo } from "react";
import { Sparkles } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

type Mode = "general" | "pro";

export const LoadingState = memo(function LoadingState({ mode, locale = "en" }: { mode: Mode; locale?: Locale }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <div className="relative h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {mode === "pro" ? t("loading.pro", locale) : t("loading.general", locale)}
        </p>
        <p className="text-xs text-muted-foreground">{t("loading.time", locale)}</p>
      </div>
    </div>
  );
});
