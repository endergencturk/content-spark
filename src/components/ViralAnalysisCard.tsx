import React, { memo } from "react";
import { TrendingUp, Trophy, Flame, Sparkles, AlertCircle } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

interface ViralScoreCategory {
  name: string;
  score: number;
}

export interface ViralAnalysis {
  score: number;
  categories: ViralScoreCategory[];
  strengths: string[];
  weaknesses: string[];
}

const CATEGORY_KEY_MAP: Record<string, string> = {
  hookStrength: "viral.hookStrength",
  curiosityGap: "viral.curiosityGap",
  emotionalTrigger: "viral.emotionalTrigger",
  clarity: "viral.clarity",
  rewatchPotential: "viral.rewatchPotential",
  commentPotential: "viral.commentPotential",
  platformFit: "viral.platformFit",
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-500";
  if (score >= 6) return "text-primary";
  if (score >= 4) return "text-yellow-500";
  return "text-destructive";
}

function ringColor(score: number): string {
  if (score >= 8) return "stroke-green-500";
  if (score >= 6) return "stroke-primary";
  if (score >= 4) return "stroke-yellow-500";
  return "stroke-destructive";
}

function tier(score: number, locale: Locale): { label: string; icon: React.ElementType; cls: string } {
  if (score >= 8.5) return { label: locale === "tr" ? "🔥 Viral Hazır" : "🔥 Viral Ready", icon: Trophy, cls: "bg-green-500/15 text-green-500 border-green-500/30" };
  if (score >= 7)   return { label: locale === "tr" ? "Güçlü"       : "Strong",         icon: Flame,    cls: "bg-primary/15 text-primary border-primary/30" };
  if (score >= 5)   return { label: locale === "tr" ? "İyileşebilir": "Could improve",  icon: Sparkles, cls: "bg-yellow-500/15 text-yellow-500 border-yellow-500/30" };
  return                  { label: locale === "tr" ? "Riskli"      : "Risky",          icon: AlertCircle, cls: "bg-destructive/15 text-destructive border-destructive/30" };
}

export const ViralAnalysisCard = memo(function ViralAnalysisCard({
  analysis, locale = "en",
}: { analysis: ViralAnalysis; locale?: Locale }) {
  const score10 = Number(analysis.score) || 0;
  const score100 = Math.round(score10 * 10);
  const tierInfo = tier(score10, locale);
  const TierIcon = tierInfo.icon;

  // Circular progress geometry
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score100 / 100) * circumference;

  return (
    <section className="space-y-2.5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />{t("result.viralAnalysis", locale)}
      </h3>
      <div className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/15 rounded-2xl p-4 space-y-4">
        {/* Hero score: circular ring + tier badge */}
        <div className="flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0">
            <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r={radius} className="stroke-muted/40" strokeWidth="6" fill="none" />
              <circle
                cx="40" cy="40" r={radius}
                className={`${ringColor(score10)} transition-all duration-700`}
                strokeWidth="6" fill="none" strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-extrabold leading-none ${scoreColor(score10)}`}>{score100}</span>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 mt-0.5">/ 100</span>
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase tracking-wider ${tierInfo.cls}`}>
              <TierIcon className="h-3 w-3" />
              {tierInfo.label}
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {locale === "tr"
                ? "AI bu içeriği 7 viral kriterde değerlendirdi."
                : "AI scored this content across 7 viral signals."}
            </p>
          </div>
        </div>
        {analysis.categories?.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {analysis.categories.map((cat, i) => {
              const pct = Math.max(0, Math.min(100, (Number(cat.score) || 0) * 10));
              return (
                <div key={i} className="bg-muted/40 rounded-xl px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground truncate">
                      {t(CATEGORY_KEY_MAP[cat.name] || cat.name, locale)}
                    </span>
                    <span className={`text-xs font-bold ${scoreColor(cat.score)}`}>{cat.score}</span>
                  </div>
                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        cat.score >= 8 ? "bg-green-500" :
                        cat.score >= 6 ? "bg-primary" :
                        cat.score >= 4 ? "bg-yellow-500" : "bg-destructive"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {analysis.strengths?.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-green-500">{t("viral.strengths", locale)}</p>
            {analysis.strengths.map((s, i) => (
              <p key={i} className="text-sm text-foreground leading-relaxed flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>{s}
              </p>
            ))}
          </div>
        )}
        {analysis.weaknesses?.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-500">{t("viral.weaknesses", locale)}</p>
            {analysis.weaknesses.map((w, i) => (
              <p key={i} className="text-sm text-foreground leading-relaxed flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">△</span>{w}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});
