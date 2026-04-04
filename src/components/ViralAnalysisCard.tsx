import React, { memo } from "react";
import { TrendingUp } from "lucide-react";
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

export const ViralAnalysisCard = memo(function ViralAnalysisCard({
  analysis, locale = "en",
}: { analysis: ViralAnalysis; locale?: Locale }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />{t("result.viralAnalysis", locale)}
      </h3>
      <div className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/15 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-extrabold ${scoreColor(analysis.score)}`}>{analysis.score}</span>
          <span className="text-sm text-muted-foreground font-medium">/ 10</span>
        </div>
        {analysis.categories?.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {analysis.categories.map((cat, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2">
                <span className="text-[11px] text-muted-foreground">
                  {t(CATEGORY_KEY_MAP[cat.name] || cat.name, locale)}
                </span>
                <span className={`text-xs font-bold ${scoreColor(cat.score)}`}>{cat.score}</span>
              </div>
            ))}
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
