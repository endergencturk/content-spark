import React, { memo, useMemo } from "react";
import { ExternalLink, Copy, Music2, Youtube, Instagram } from "lucide-react";
import { toast } from "sonner";
import type { Locale } from "@/lib/i18n";

interface Props {
  locale: Locale;
  caption: string;
  hashtags?: string[];
  script?: string;
}

type Platform = "tiktok" | "shorts" | "reels";

const CFG: Record<Platform, { label: string; url: string; icon: React.ElementType; tint: string; hintEn: string; hintTr: string }> = {
  tiktok: {
    label: "TikTok",
    url: "https://www.tiktok.com/tiktokstudio/upload",
    icon: Music2,
    tint: "hover:border-pink-500/50 hover:text-pink-400",
    hintEn: "Caption copied. Paste it in TikTok's caption field.",
    hintTr: "Açıklama kopyalandı. TikTok yükleme alanına yapıştır.",
  },
  shorts: {
    label: "YT Shorts",
    url: "https://youtube.com/upload",
    icon: Youtube,
    tint: "hover:border-red-500/50 hover:text-red-400",
    hintEn: "Caption copied. Paste it as your Shorts title/description.",
    hintTr: "Açıklama kopyalandı. Shorts başlık/açıklama alanına yapıştır.",
  },
  reels: {
    label: "Reels",
    url: "https://www.instagram.com/",
    icon: Instagram,
    tint: "hover:border-fuchsia-500/50 hover:text-fuchsia-400",
    hintEn: "Caption copied. Open Instagram app → Reels → paste caption.",
    hintTr: "Açıklama kopyalandı. Instagram → Reels → açıklamaya yapıştır.",
  },
};

export const PublishActions = memo(function PublishActions({ locale, caption, hashtags = [], script }: Props) {
  const tr = locale === "tr";
  const fullCaption = useMemo(() => {
    const tags = hashtags.length ? "\n\n" + hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ") : "";
    return `${caption}${tags}`.trim();
  }, [caption, hashtags]);

  async function sendTo(p: Platform) {
    try {
      await navigator.clipboard.writeText(fullCaption);
    } catch { /* ignore */ }
    const cfg = CFG[p];
    toast.success(tr ? cfg.hintTr : cfg.hintEn, { duration: 5000 });
    window.open(cfg.url, "_blank", "noopener,noreferrer");
  }

  async function copyScript() {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(script);
      toast.success(tr ? "Script kopyalandı 📋" : "Script copied 📋");
    } catch {
      toast.error(tr ? "Kopyalanamadı" : "Copy failed");
    }
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1.5">
          <ExternalLink className="h-3 w-3 text-primary" />
          {tr ? "Yayınla" : "Publish now"}
        </p>
        {script && (
          <button
            onClick={copyScript}
            className="text-[10px] font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            <Copy className="h-3 w-3" />
            {tr ? "Sadece script" : "Copy script only"}
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(["tiktok", "shorts", "reels"] as Platform[]).map((p) => {
          const cfg = CFG[p];
          const Icon = cfg.icon;
          return (
            <button
              key={p}
              onClick={() => sendTo(p)}
              className={`group flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border/50 bg-muted/30 py-3 text-xs font-semibold text-muted-foreground transition-all ${cfg.tint} hover:bg-muted/50 hover:-translate-y-0.5`}
            >
              <Icon className="h-4 w-4" />
              <span>{cfg.label}</span>
              <span className="text-[9px] font-normal opacity-70 group-hover:opacity-100">
                {tr ? "kopyala + aç" : "copy + open"}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-[10px] text-muted-foreground/70 text-center leading-relaxed">
        {tr
          ? "Bir platforma tıkla — açıklaman panoya kopyalanır ve yükleme sayfası açılır."
          : "Tap a platform — caption is copied to clipboard and the upload page opens."}
      </p>
    </div>
  );
});