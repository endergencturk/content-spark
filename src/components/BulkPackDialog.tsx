import React, { memo, useState, useCallback } from "react";
import { Package, Lock, Loader2, Download, Sparkles, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Locale } from "@/lib/i18n";

interface BulkPackDialogProps {
  isPro: boolean;
  locale: Locale;
  style: string;
  contentType: string;
  scriptLength: string;
  goal: string;
  hookStyle: string;
  targetAudience: string;
  platform: string;
  platforms: string[];
  isProMode: boolean;
  trendingTopics?: string[];
}

export const BulkPackDialog = memo(function BulkPackDialog({
  isPro, locale, style, contentType, scriptLength, goal, hookStyle, targetAudience,
  platform, platforms, isProMode, trendingTopics,
}: BulkPackDialogProps) {
  const [open, setOpen] = useState(false);
  const [topics, setTopics] = useState(["", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<Array<{ topic: string; text: string }>>([]);

  const fillFromTrending = useCallback(() => {
    if (trendingTopics && trendingTopics.length > 0) {
      const filled = [...topics];
      for (let i = 0; i < 5; i++) {
        filled[i] = trendingTopics[i] || filled[i] || "";
      }
      setTopics(filled);
      toast.success(locale === "tr" ? "Trendlerden dolduruldu" : "Filled from trending topics");
    } else {
      toast.info(locale === "tr" ? "Trend konuları yükleyin" : "No trending topics available");
    }
  }, [trendingTopics, topics, locale]);

  const updateTopic = useCallback((index: number, value: string) => {
    setTopics((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }, []);

  const generateBulk = useCallback(async () => {
    const validTopics = topics.filter((t) => t.trim());
    if (validTopics.length === 0) {
      toast.error(locale === "tr" ? "En az 1 konu girin" : "Enter at least 1 topic");
      return;
    }

    setLoading(true);
    setProgress(0);
    const generated: Array<{ topic: string; text: string }> = [];

    for (let i = 0; i < validTopics.length; i++) {
      setProgress(i + 1);
      try {
        const body = isProMode
          ? { mode: "pro", topic: validTopics[i], platforms, contentType, style, scriptLength, goal, hookStyle, targetAudience, language: locale }
          : { mode: "general", topic: validTopics[i], platform, contentType, style, scriptLength, goal, hookStyle, targetAudience, language: locale };

        const { data, error } = await supabase.functions.invoke("generate-content", { body });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        const lines = [
          `=== ${validTopics[i].toUpperCase()} ===`,
          "",
          `⭐ BEST HOOK: ${data?.bestHook || "N/A"}`,
          "",
          `📝 SCRIPT:\n${data?.script || "N/A"}`,
          "",
          `📺 YOUTUBE TITLE: ${data?.youtube?.title || "N/A"}`,
          `📺 YOUTUBE DESC: ${data?.youtube?.description || "N/A"}`,
          `📱 TIKTOK CAPTION: ${data?.tiktok?.caption || "N/A"}`,
          "",
          `📊 VIRAL SCORE: ${data?.viralAnalysis?.score || "N/A"}/10`,
        ];
        generated.push({ topic: validTopics[i], text: lines.join("\n") });
      } catch (err: any) {
        generated.push({ topic: validTopics[i], text: `=== ${validTopics[i]} ===\n\nERROR: ${err?.message || "Generation failed"}` });
      }
    }

    setResults(generated);
    setLoading(false);
    toast.success(locale === "tr" ? `${generated.length} paket oluşturuldu` : `${generated.length} packs generated`);
  }, [topics, isProMode, platforms, platform, contentType, style, scriptLength, goal, hookStyle, targetAudience, locale]);

  const downloadAll = useCallback(() => {
    if (results.length === 0) return;
    const combined = results.map((r) => r.text).join("\n\n\n");
    const blob = new Blob([combined], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bulk-content-pack.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(locale === "tr" ? "İndirildi" : "Downloaded");
  }, [results, locale]);

  if (!open) {
    return (
      <button
        onClick={() => {
          if (!isPro) {
            toast.info(locale === "tr" ? "Pro özelliği — toplu paketler oluşturmak için Pro'ya geçin" : "Pro feature — upgrade to generate bulk packs");
            return;
          }
          setOpen(true);
        }}
        className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-muted/60 border border-border/50 text-foreground text-sm font-semibold hover:bg-muted transition-colors"
      >
        <Package className="h-4 w-4" />
        📦 {locale === "tr" ? "Toplu Paket" : "Bulk Pack"}
        {!isPro && <Lock className="h-3 w-3 text-muted-foreground" />}
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          📦 {locale === "tr" ? "Toplu Paket Oluştur" : "Bulk Pack Generator"}
        </h3>
        <button onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground">
          {locale === "tr" ? "Kapat" : "Close"}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {results.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-foreground">
              ✅ {results.length} {locale === "tr" ? "paket hazır" : "packs ready"}
            </p>
            {results.map((r, i) => (
              <div key={i} className="bg-muted/40 rounded-xl p-3">
                <p className="text-xs font-bold text-primary">{r.topic}</p>
                <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{r.text.slice(0, 120)}...</p>
              </div>
            ))}
            <div className="flex gap-2">
              <button
                onClick={downloadAll}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                <Download className="h-4 w-4" />
                {locale === "tr" ? "Tümünü İndir" : "Download All"}
              </button>
              <button
                onClick={() => { setResults([]); setProgress(0); }}
                className="px-4 py-2.5 rounded-xl bg-muted/60 border border-border/50 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                {locale === "tr" ? "Yeni Paket" : "New Batch"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {topics.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted-foreground w-5 text-right">{i + 1}.</span>
                  <input
                    type="text"
                    value={t}
                    onChange={(e) => updateTopic(i, e.target.value)}
                    placeholder={`Topic ${i + 1}`}
                    className="flex-1 h-10 rounded-xl border border-border/60 bg-muted/30 px-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={loading}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={fillFromTrending}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-muted/30 border border-border/40 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <TrendingUp className="h-3.5 w-3.5" />
              {locale === "tr" ? "Trendlerden Doldur" : "Fill from Trending"}
            </button>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {locale === "tr" ? `Oluşturuluyor ${progress}/${topics.filter(t => t.trim()).length}...` : `Generating ${progress}/${topics.filter(t => t.trim()).length}...`}
              </div>
            ) : (
              <button
                onClick={generateBulk}
                disabled={topics.every((t) => !t.trim())}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {locale === "tr" ? "Toplu Oluştur" : "Generate All"}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
});
