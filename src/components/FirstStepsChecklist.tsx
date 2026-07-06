import React, { memo, useState, useEffect } from "react";
import { Check, Circle, X, Rocket } from "lucide-react";
import type { Locale } from "@/lib/i18n";

interface Props {
  locale: Locale;
  hasProfile: boolean;
  hasTopic: boolean;
  totalGenerations: number;
}

const DISMISS_KEY = "cs-first-steps-dismissed";

export const FirstStepsChecklist = memo(function FirstStepsChecklist({
  locale, hasProfile, hasTopic, totalGenerations,
}: Props) {
  const tr = locale === "tr";
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  const steps = [
    { key: "profile", done: hasProfile, en: "Set your channel profile", tr: "Kanal profilini oluştur" },
    { key: "topic", done: hasTopic, en: "Pick or type a topic", tr: "Bir konu seç veya yaz" },
    { key: "generate", done: totalGenerations > 0, en: "Hit Generate — get your first pack", tr: "Oluştur'a bas — ilk paketini al" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  // Auto-dismiss when everything's done
  useEffect(() => {
    if (allDone && !dismissed) {
      const t = setTimeout(() => {
        try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
        setDismissed(true);
      }, 2400);
      return () => clearTimeout(t);
    }
  }, [allDone, dismissed]);

  if (dismissed || totalGenerations > 0) return null;

  return (
    <div className="relative rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-fuchsia-500/5 to-transparent p-4 animate-fade-in">
      <button
        onClick={() => {
          try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
          setDismissed(true);
        }}
        className="absolute top-2.5 right-2.5 h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
        aria-label={tr ? "Kapat" : "Dismiss"}
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-2 mb-3">
        <Rocket className="h-4 w-4 text-primary" />
        <p className="text-xs font-black uppercase tracking-widest text-primary">
          {tr ? "30 saniyede ilk viral scriptin" : "First viral script in 30 seconds"}
        </p>
        <span className="ml-auto text-[10px] font-bold tabular-nums text-muted-foreground pr-6">
          {doneCount}/3
        </span>
      </div>

      <div className="h-1 w-full rounded-full bg-muted/60 overflow-hidden mb-3">
        <div className="h-full xp-bar rounded-full transition-all duration-500" style={{ width: `${(doneCount / 3) * 100}%` }} />
      </div>

      <ol className="space-y-1.5">
        {steps.map((s, i) => (
          <li key={s.key} className={`flex items-center gap-2.5 text-sm transition-all ${s.done ? "text-muted-foreground line-through" : "text-foreground"}`}>
            <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold shrink-0 ${
              s.done
                ? "bg-emerald-500 text-white"
                : "bg-muted/60 text-muted-foreground border border-border/60"
            }`}>
              {s.done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            <span className="font-medium">{tr ? s.tr : s.en}</span>
          </li>
        ))}
      </ol>
    </div>
  );
});