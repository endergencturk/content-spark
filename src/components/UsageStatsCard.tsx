import React, { memo } from "react";
import { BarChart3, Send, Sparkles, Target } from "lucide-react";
import { useUsageStats } from "@/hooks/useUsageStats";
import type { Locale } from "@/lib/i18n";

interface Props {
  deviceId: string;
  locale: Locale;
  refreshKey?: number;
}

const STYLE_LABEL: Record<string, string> = {
  viral: "Viral", educational: "Educational", story: "Story",
  "high-retention": "High Retention", emotional: "Emotional", suspense: "Suspense",
  controversial: "Controversial", curiosity: "Curiosity", horror: "Horror",
};
const PLATFORM_LABEL: Record<string, string> = {
  tiktok: "TikTok", shorts: "YT Shorts", reels: "Reels",
};

export const UsageStatsCard = memo(function UsageStatsCard({ deviceId, locale, refreshKey }: Props) {
  const tr = locale === "tr";
  const { stats } = useUsageStats(deviceId, refreshKey);
  if (!stats || stats.totalPosted === 0) return null;

  const publishPct = Math.round(stats.publishRate * 100);

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/8 via-card/40 to-transparent p-3 space-y-2.5">
      <div className="flex items-center gap-1.5">
        <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
        <p className="text-[10px] uppercase tracking-widest font-black text-emerald-400">
          {tr ? "Senin Örüntün" : "Your Patterns"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted/40 p-2">
          <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1">
            <Send className="h-2.5 w-2.5" />
            {tr ? "Yayınlanan" : "Posted"}
          </p>
          <p className="text-lg font-black tabular-nums text-foreground leading-none mt-0.5">
            {stats.totalPosted}
          </p>
          <p className="text-[9px] text-muted-foreground">
            {stats.postedThisWeek} {tr ? "bu hafta" : "this week"}
          </p>
        </div>
        <div className="rounded-xl bg-muted/40 p-2">
          <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1">
            <Target className="h-2.5 w-2.5" />
            {tr ? "Yayın Oranı" : "Publish Rate"}
          </p>
          <p className="text-lg font-black tabular-nums text-emerald-400 leading-none mt-0.5">
            {publishPct}%
          </p>
          <div className="h-1 w-full rounded-full bg-muted/60 overflow-hidden mt-1">
            <div className="h-full bg-emerald-400 rounded-full transition-all" style={{ width: `${publishPct}%` }} />
          </div>
        </div>
      </div>

      {(stats.topStyle || stats.topPlatform) && (
        <div className="rounded-xl bg-primary/5 border border-primary/15 px-2.5 py-2 flex items-start gap-2">
          <Sparkles className="h-3 w-3 text-primary shrink-0 mt-0.5" />
          <p className="text-[10px] text-foreground leading-relaxed">
            {tr ? "En iyi çalışan:" : "Your winning combo:"}{" "}
            {stats.topStyle && <span className="font-bold text-primary">{STYLE_LABEL[stats.topStyle] || stats.topStyle}</span>}
            {stats.topStyle && stats.topPlatform && <span className="text-muted-foreground"> · </span>}
            {stats.topPlatform && <span className="font-bold text-primary">{PLATFORM_LABEL[stats.topPlatform] || stats.topPlatform}</span>}
          </p>
        </div>
      )}
    </div>
  );
});