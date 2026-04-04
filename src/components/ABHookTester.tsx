import React, { memo, useState, useCallback, useEffect } from "react";
import { Zap, Lock, Crown, CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import type { Locale } from "@/lib/i18n";

interface ABHookTesterProps {
  topic: string;
  isPro: boolean;
  locale: Locale;
  style: string;
  scriptLength: string;
  onSelectHook?: (hook: string) => void;
}

const PREF_KEY = "ab-hook-preferences";

function getPreferences(): { fear: number; curiosity: number } {
  try {
    const stored = localStorage.getItem(PREF_KEY);
    return stored ? JSON.parse(stored) : { fear: 0, curiosity: 0 };
  } catch { return { fear: 0, curiosity: 0 }; }
}

function savePreference(type: "fear" | "curiosity") {
  const prefs = getPreferences();
  prefs[type]++;
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
  return prefs;
}

export const ABHookTester = memo(function ABHookTester({
  topic, isPro, locale, style, scriptLength, onSelectHook,
}: ABHookTesterProps) {
  const [hookA, setHookA] = useState<string | null>(null);
  const [hookB, setHookB] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<"A" | "B" | null>(null);
  const [insight, setInsight] = useState<string | null>(null);

  const generateHooks = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setSelected(null);
    setInsight(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: {
          mode: "ab-hooks",
          topic,
          style,
          scriptLength,
          language: locale,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setHookA(data?.hookA || data?.hooks?.[0] || "Fear-based hook could not be generated");
      setHookB(data?.hookB || data?.hooks?.[1] || "Curiosity-based hook could not be generated");
    } catch (err: any) {
      console.error("A/B hooks failed:", err);
      toast.error(err?.message || "Failed to generate A/B hooks");
    } finally {
      setLoading(false);
    }
  }, [topic, style, scriptLength, locale]);

  // Auto-generate when topic changes and we have results showing
  useEffect(() => {
    setHookA(null);
    setHookB(null);
    setSelected(null);
  }, [topic]);

  const handleSelect = useCallback((version: "A" | "B") => {
    setSelected(version);
    const type = version === "A" ? "fear" : "curiosity";
    const prefs = savePreference(type);
    const total = prefs.fear + prefs.curiosity;
    const hook = version === "A" ? hookA : hookB;
    if (hook && onSelectHook) onSelectHook(hook);

    if (total >= 5) {
      const dominant = prefs.fear > prefs.curiosity ? "Fear" : "Curiosity";
      const dominantTr = prefs.fear > prefs.curiosity ? "Korku" : "Merak";
      setInsight(
        locale === "tr"
          ? `${dominantTr} kancalarını tercih ediyorsun. Senin için bu tarzda daha fazla oluşturuyoruz.`
          : `You prefer ${dominant} hooks. Generating more of this style for you.`
      );
    }

    toast.success(
      locale === "tr" ? `Versiyon ${version} seçildi` : `Version ${version} selected`,
      { duration: 2000 }
    );
  }, [hookA, hookB, onSelectHook, locale]);

  if (!topic.trim()) return null;

  return (
    <div className="rounded-2xl border border-border/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-primary" />
          ⚡ A/B Hook Test
        </h3>
        {isPro && !hookA && (
          <button
            onClick={generateHooks}
            disabled={loading}
            className="text-[11px] font-semibold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
            {loading
              ? (locale === "tr" ? "Oluşturuluyor..." : "Generating...")
              : (locale === "tr" ? "Test Oluştur" : "Generate Test")}
          </button>
        )}
      </div>

      <div className="p-4">
        {!isPro ? (
          <div className="relative">
            <div className="grid grid-cols-2 gap-3 blur-[6px] select-none pointer-events-none">
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-bold text-red-500 uppercase">Version A — Fear</p>
                <p className="text-sm text-foreground">This shocking hook uses fear psychology...</p>
              </div>
              <div className="bg-muted/40 rounded-xl p-4 space-y-2">
                <p className="text-[10px] font-bold text-blue-500 uppercase">Version B — Curiosity</p>
                <p className="text-sm text-foreground">This curiosity hook creates an open loop...</p>
              </div>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-xl">
              <div className="text-center space-y-1.5">
                <Lock className="h-4 w-4 text-primary mx-auto" />
                <p className="text-xs font-semibold text-foreground">Pro only</p>
              </div>
            </div>
          </div>
        ) : hookA && hookB ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleSelect("A")}
                className={`text-left rounded-xl p-4 space-y-2 transition-all border ${
                  selected === "A"
                    ? "border-red-500/40 bg-red-500/5 ring-1 ring-red-500/20"
                    : "border-border/30 bg-muted/40 hover:border-red-500/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest">Version A — Fear</p>
                  {selected === "A" && <CheckCircle2 className="h-4 w-4 text-red-500" />}
                </div>
                <p className="text-sm text-foreground leading-relaxed">{hookA}</p>
              </button>
              <button
                onClick={() => handleSelect("B")}
                className={`text-left rounded-xl p-4 space-y-2 transition-all border ${
                  selected === "B"
                    ? "border-blue-500/40 bg-blue-500/5 ring-1 ring-blue-500/20"
                    : "border-border/30 bg-muted/40 hover:border-blue-500/20"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Version B — Curiosity</p>
                  {selected === "B" && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                </div>
                <p className="text-sm text-foreground leading-relaxed">{hookB}</p>
              </button>
            </div>
            {selected && (
              <p className="text-center text-[11px] text-muted-foreground">
                ✓ {locale === "tr" ? `Versiyon ${selected} seçildi` : `Version ${selected} selected as best hook`}
              </p>
            )}
            {insight && (
              <div className="flex items-start gap-2 bg-primary/5 border border-primary/20 rounded-xl p-3">
                <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                <p className="text-xs text-foreground leading-relaxed">{insight}</p>
              </div>
            )}
            <button
              onClick={generateHooks}
              disabled={loading}
              className="w-full text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center justify-center gap-1 py-2"
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
              {locale === "tr" ? "Yeni Kancalar Oluştur" : "Regenerate Hooks"}
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-6 gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {locale === "tr" ? "A/B kancaları oluşturuluyor..." : "Generating A/B hooks..."}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-xs text-muted-foreground mb-3">
              {locale === "tr" ? "Aynı konu için 2 farklı kanca karşılaştırın" : "Compare 2 different hooks for the same topic"}
            </p>
            <button
              onClick={generateHooks}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Zap className="h-3.5 w-3.5" />
              {locale === "tr" ? "A/B Test Oluştur" : "Generate A/B Test"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
});
