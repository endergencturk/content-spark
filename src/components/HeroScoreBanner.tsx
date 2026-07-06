import React, { memo, useMemo } from "react";
import { Flame, Copy, Share2, CheckCircle2, TrendingUp } from "lucide-react";
import { type Locale } from "@/lib/i18n";

interface Props {
  score: number; // 0-100
  topic: string;
  locale: Locale;
  onCopyAll: () => void;
  copiedLabel?: boolean;
  onShare?: () => void;
}

function gradeLabel(score: number, tr: boolean) {
  if (score >= 90) return tr ? "Patlama Potansiyeli 🔥" : "Explosive 🔥";
  if (score >= 80) return tr ? "Viral Hazır" : "Viral Ready";
  if (score >= 65) return tr ? "Güçlü" : "Strong";
  if (score >= 50) return tr ? "İyi" : "Solid";
  return tr ? "Geliştir" : "Needs Work";
}
function gradeColor(score: number) {
  if (score >= 85) return "from-emerald-400 via-emerald-500 to-teal-500";
  if (score >= 70) return "from-primary via-fuchsia-500 to-primary";
  if (score >= 55) return "from-amber-400 via-orange-500 to-amber-500";
  return "from-rose-400 via-rose-500 to-red-500";
}
function textColor(score: number) {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-primary";
  if (score >= 55) return "text-amber-400";
  return "text-rose-400";
}

export const HeroScoreBanner = memo(function HeroScoreBanner({
  score, topic, locale, onCopyAll, copiedLabel, onShare,
}: Props) {
  const tr = locale === "tr";
  const label = useMemo(() => gradeLabel(score, tr), [score, tr]);
  const ringDash = (score / 100) * 226.19;

  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card/60 to-fuchsia-500/8 p-5 sm:p-6 animate-fade-in">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute -top-16 -right-16 h-56 w-56 rounded-full bg-primary/25 blur-3xl opacity-70" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-56 w-56 rounded-full bg-fuchsia-500/20 blur-3xl opacity-50" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
        {/* Big score ring */}
        <div className="relative h-[128px] w-[128px] shrink-0">
          <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
            <defs>
              <linearGradient id="hsbGrad" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="hsl(var(--primary))" />
                <stop offset="100%" stopColor="hsl(280 80% 65%)" />
              </linearGradient>
            </defs>
            <circle cx="44" cy="44" r="36" fill="none" stroke="hsl(var(--muted))" strokeWidth="7" opacity="0.25" />
            <circle
              cx="44" cy="44" r="36" fill="none"
              stroke="url(#hsbGrad)" strokeWidth="7" strokeLinecap="round"
              strokeDasharray={`${ringDash} 226.19`}
              style={{ transition: "stroke-dasharray 1s cubic-bezier(0.22, 1, 0.36, 1)", filter: "drop-shadow(0 0 10px hsl(var(--primary)/0.6))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-4xl font-black tabular-nums ${textColor(score)} font-display`}>{score}</span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground -mt-0.5">/ 100</span>
          </div>
        </div>

        {/* Right column */}
        <div className="flex-1 min-w-0 space-y-3">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Flame className="h-4 w-4 text-orange-400 animate-flame" />
              <span className={`text-xs font-black uppercase tracking-widest bg-gradient-to-r ${gradeColor(score)} bg-clip-text text-transparent`}>
                {label}
              </span>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                · {tr ? "AI Viral Skoru" : "AI Viral Score"}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-foreground font-display leading-tight line-clamp-2">
              {topic}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={onCopyAll}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-2xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 shadow-lg shadow-primary/25 transition-all hover:-translate-y-0.5"
            >
              {copiedLabel ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copiedLabel
                ? (tr ? "Kopyalandı!" : "Copied!")
                : (tr ? "Tam Paketi Kopyala" : "Copy Full Pack")}
            </button>
            {onShare && (
              <button
                onClick={onShare}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-2xl bg-muted/60 hover:bg-muted text-foreground text-sm font-semibold transition-all"
              >
                <Share2 className="h-4 w-4" />
                {tr ? "Paylaş" : "Share"}
              </button>
            )}
            <div className="inline-flex items-center gap-1.5 h-10 px-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-bold">
              <TrendingUp className="h-3.5 w-3.5" />
              {tr ? "Yayına hazır" : "Ready to post"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});