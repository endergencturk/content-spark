import React, { memo, useState, useCallback, useMemo } from "react";
import { Calendar, Loader2, Download, RefreshCw, Sparkles, Lock, ArrowRight, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { loadChannelProfile } from "@/components/ChannelProfile";
import { BlurredPreview } from "@/components/BlurredPreview";
import type { Locale } from "@/lib/i18n";

interface DayPlan {
  day: string;
  topic: string;
  hookWord: string;
  platform: string;
  postingTime: string;
  viralScore: number;
}

interface WeeklyPlanProps {
  isPro: boolean;
  locale: Locale;
  onSelectTopic: (topic: string) => void;
}

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ISO week key like "2026-W27" — one free plan per week for Free users.
function currentWeekKey(): string {
  const d = new Date();
  const target = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNr = (target.getUTCDay() + 6) % 7;
  target.setUTCDate(target.getUTCDate() - dayNr + 3);
  const firstThursday = new Date(Date.UTC(target.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((target.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${target.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
const FREE_WEEKLY_KEY = "cs-weekly-plan-free-week";

const POSTING_TIMES: Record<string, string[]> = {
  usa: ["21:00", "20:00", "21:00", "19:00", "21:00", "11:00", "10:00"],
  europe: ["19:00", "18:00", "19:00", "20:00", "19:00", "10:00", "11:00"],
  latam: ["22:00", "21:00", "22:00", "20:00", "22:00", "12:00", "11:00"],
  global: ["21:00", "20:00", "21:00", "19:00", "21:00", "11:00", "10:00"],
  turkey: ["20:00", "19:00", "20:00", "21:00", "20:00", "11:00", "10:00"],
};

export const WeeklyPlan = memo(function WeeklyPlan({ isPro, locale, onSelectTopic }: WeeklyPlanProps) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<DayPlan[] | null>(null);
  const profile = loadChannelProfile();
  const weekKey = useMemo(() => currentWeekKey(), []);
  const [usedFreeWeek, setUsedFreeWeek] = useState<string | null>(() => {
    try { return localStorage.getItem(FREE_WEEKLY_KEY); } catch { return null; }
  });
  const freeWeeklyAvailable = !isPro && usedFreeWeek !== weekKey;
  const canGenerate = isPro || freeWeeklyAvailable;

  const generatePlan = useCallback(async () => {
    if (!profile?.channelName) {
      toast.error(locale === "tr" ? "Önce kanal profilinizi oluşturun" : "Set up your channel profile first");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          mode: "weekly-plan",
          niche: profile.niche || "mystery",
          audience: profile.audience || "global",
          language: locale,
          channelName: profile.channelName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const times = POSTING_TIMES[profile.audience || "global"];
      const ideas: DayPlan[] = (data?.ideas || []).slice(0, 7).map((idea: any, i: number) => ({
        day: DAYS[i],
        topic: idea.topic || idea.title || `Topic ${i + 1}`,
        hookWord: idea.hookWord || idea.hook || "Vanished.",
        platform: idea.platform || (i % 2 === 0 ? "TikTok" : "YouTube"),
        postingTime: times[i] || "20:00",
        viralScore: idea.viralScore || Math.floor(Math.random() * 3) + 7,
      }));
      setPlan(ideas);
      // Consume the free-weekly allowance for non-Pro users.
      if (!isPro) {
        try { localStorage.setItem(FREE_WEEKLY_KEY, weekKey); } catch { /* ignore */ }
        setUsedFreeWeek(weekKey);
      }
    } catch (err: any) {
      console.error("Weekly plan failed:", err);
      toast.error(err?.message || "Failed to generate weekly plan");
    } finally {
      setLoading(false);
    }
  }, [profile, locale, isPro, weekKey]);

  const downloadPlan = useCallback(() => {
    if (!plan) return;
    const lines = [
      "=== WEEKLY CONTENT PLAN ===",
      `Channel: ${profile?.channelName || "N/A"}`,
      `Week of: ${new Date().toLocaleDateString()}`,
      "",
      ...plan.map((d) =>
        `${d.day} | ${d.topic}\n  Hook: "${d.hookWord}" | Platform: ${d.platform} | Post at: ${d.postingTime} | Viral Score: ${d.viralScore}/10`
      ),
    ];
    const blob = new Blob([lines.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "weekly-content-plan.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(locale === "tr" ? "Plan indirildi" : "Plan downloaded");
  }, [plan, profile, locale]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          📅 {locale === "tr" ? "Haftalık Plan" : "Weekly Plan"}
          {!isPro && freeWeeklyAvailable && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-emerald-400">
              <Gift className="h-2.5 w-2.5" />
              {locale === "tr" ? "Bu hafta ücretsiz" : "Free this week"}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1 text-xs text-primary font-medium">
          {canGenerate ? (locale === "tr" ? "Aç" : "Open") : "Pro"}
          {!canGenerate && <Lock className="h-3 w-3" />}
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-primary/20 bg-card overflow-hidden">
      <button
        onClick={() => setExpanded(false)}
        className="w-full flex items-center justify-between px-4 py-3 border-b border-border/40"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Calendar className="h-4 w-4 text-primary" />
          📅 {locale === "tr" ? "Haftalık İçerik Planı" : "Weekly Content Plan"}
        </span>
        <span className="text-xs text-muted-foreground">{locale === "tr" ? "Kapat" : "Close"}</span>
      </button>

      <div className="p-4 space-y-4">
        {!canGenerate ? (
          <div className="relative">
            <div className="grid grid-cols-7 gap-1.5 blur-[6px] select-none pointer-events-none">
              {DAYS.map((d) => (
                <div key={d} className="bg-muted/40 rounded-xl p-3 space-y-1.5 text-center">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase">{d}</p>
                  <p className="text-xs text-foreground font-medium">Mystery topic...</p>
                  <p className="text-[10px] text-primary font-bold">"Vanished."</p>
                </div>
              ))}
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-2xl">
              <div className="text-center space-y-2">
                <Lock className="h-5 w-5 text-primary mx-auto" />
                <p className="text-sm font-semibold text-foreground">
                  {locale === "tr" ? "Bu haftaki ücretsiz planını kullandın" : "You've used this week's free plan"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {locale === "tr" ? "Sınırsız plan için Pro'ya geç veya yeni haftayı bekle." : "Go Pro for unlimited plans or wait for the new week."}
                </p>
              </div>
            </div>
          </div>
        ) : !profile?.channelName ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-sm text-muted-foreground">
              {locale === "tr" ? "Önce kanal profilinizi oluşturun" : "Set up your channel profile first"}
            </p>
          </div>
        ) : plan ? (
          <>
            {!isPro && (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-2 text-[11px] text-emerald-400 flex items-center gap-2">
                <Gift className="h-3.5 w-3.5" />
                {locale === "tr"
                  ? "Bu haftaki ücretsiz planını aldın. Sınırsız için Pro'ya geç."
                  : "You claimed this week's free plan. Upgrade to Pro for unlimited."}
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {plan.map((d, i) => (
                <div
                  key={i}
                  className="bg-muted/40 rounded-xl p-3 space-y-1.5 border border-border/30 hover:border-primary/30 transition-colors"
                >
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{d.day}</p>
                  <p className="text-xs font-semibold text-foreground leading-snug line-clamp-2">{d.topic}</p>
                  <p className="text-[10px] text-primary font-bold">"{d.hookWord}"</p>
                  <div className="flex items-center justify-between text-[9px] text-muted-foreground">
                    <span>{d.platform}</span>
                    <span>{d.postingTime}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] text-muted-foreground">Score: {d.viralScore}/10</span>
                  </div>
                  <button
                    onClick={() => onSelectTopic(d.topic)}
                    className="w-full mt-1 text-[10px] font-semibold text-primary hover:text-primary/80 flex items-center justify-center gap-1 transition-colors"
                  >
                    <Sparkles className="h-2.5 w-2.5" />
                    {locale === "tr" ? "Oluştur" : "Generate This"}
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadPlan}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-muted/60 border border-border/50 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                <Download className="h-3.5 w-3.5" />
                {locale === "tr" ? "Planı İndir" : "Download Plan"}
              </button>
              <button
                onClick={generatePlan}
                disabled={loading || (!isPro && usedFreeWeek === weekKey)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/10 border border-primary/20 text-sm font-medium text-primary hover:bg-primary/15 transition-colors"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                {isPro
                  ? (locale === "tr" ? "Yeniden Oluştur" : "Regenerate Week")
                  : (locale === "tr" ? "Pro: Yeniden Oluştur" : "Pro: Regenerate")}
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-6 space-y-2">
            {!isPro && (
              <p className="text-[11px] text-emerald-400 font-semibold">
                <Gift className="inline h-3 w-3 mr-1" />
                {locale === "tr" ? "Bu hafta 1 ücretsiz plan hakkın var" : "You have 1 free plan this week"}
              </p>
            )}
            <button
              onClick={generatePlan}
              disabled={loading}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              {loading ? (
                <><Loader2 className="h-4 w-4 animate-spin" />{locale === "tr" ? "Oluşturuluyor..." : "Generating..."}</>
              ) : (
                <><Sparkles className="h-4 w-4" />{locale === "tr" ? "7 Günlük Plan Oluştur" : "Generate 7-Day Plan"}</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
