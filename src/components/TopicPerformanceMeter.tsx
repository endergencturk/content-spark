import React, { memo, useMemo } from "react";
import { TrendingUp, Eye, Sparkles, AlertCircle } from "lucide-react";
import type { Locale } from "@/lib/i18n";

interface Props {
  topic: string;
  locale: Locale;
  platform?: string;
}

const POWER_WORDS = /\b(secret|truth|nobody|never|hidden|why|how|what|deleted|banned|proof|shocking|forbidden|erased|disappeared|vanished|dark|real|real reason|the reason|behind|inside|leaked|exposed|revealed|silent|missing|forgotten|neden|nasıl|sır|gerçek|kimse|asla|yasak|silinen|kayıp|gizli|karanlık|açıklanamayan)\b/i;
const EMOTION_WORDS = /\b(scary|terrifying|insane|crazy|unbelievable|creepy|disturbing|amazing|shocking|proven|korkunç|çılgın|inanılmaz|ürpertici|şok|kanıtlandı)\b/i;

function analyze(topic: string, platform = "tiktok") {
  const t = topic.trim();
  if (!t) return null;

  const words = t.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const hasQuestion = /\?$|^why|^how|^what|^neden|^nasıl/i.test(t);
  const hasNumber = /\b\d+\b/.test(t);
  const hasPower = POWER_WORDS.test(t);
  const hasEmotion = EMOTION_WORDS.test(t);
  const isConcrete = /[A-ZÇĞİÖŞÜ][a-zçğıöşü]+\b/.test(t.slice(1)); // proper noun beyond first char

  let score = 40;
  if (wordCount >= 4 && wordCount <= 10) score += 15;
  else if (wordCount > 14) score -= 10;
  if (hasPower) score += 18;
  if (hasQuestion) score += 8;
  if (hasNumber) score += 8;
  if (hasEmotion) score += 6;
  if (isConcrete) score += 5;
  score = Math.max(20, Math.min(96, score));

  // Estimated reach range (heuristic, in views)
  const platformMult = platform === "tiktok" ? 1 : platform === "youtube-shorts" ? 0.7 : 0.55;
  const base = Math.round((score / 100) ** 2.4 * 480 * platformMult); // thousands
  const low = Math.max(3, Math.round(base * 0.35));
  const high = Math.max(low + 8, Math.round(base * 1.9));

  const signals: { key: string; on: boolean; en: string; tr: string }[] = [
    { key: "power", on: hasPower, en: "Curiosity keyword", tr: "Merak kelimesi" },
    { key: "num", on: hasNumber, en: "Specific number", tr: "Somut sayı" },
    { key: "q", on: hasQuestion, en: "Question hook", tr: "Soru kancası" },
    { key: "emo", on: hasEmotion, en: "Emotional weight", tr: "Duygusal ağırlık" },
    { key: "len", on: wordCount >= 4 && wordCount <= 10, en: "Ideal length", tr: "İdeal uzunluk" },
    { key: "concrete", on: isConcrete, en: "Named entity", tr: "Somut isim" },
  ];

  return { score, low, high, signals };
}

function fmtK(n: number) {
  if (n < 1000) return `${n}K`;
  return `${(n / 1000).toFixed(n < 10000 ? 1 : 0)}M`;
}

function tone(score: number) {
  if (score >= 78) return { c: "text-emerald-400", ring: "border-emerald-500/40 bg-emerald-500/8", labelEn: "Strong viral potential", labelTr: "Güçlü viral potansiyel", icon: "🔥" };
  if (score >= 60) return { c: "text-primary", ring: "border-primary/30 bg-primary/8", labelEn: "Solid — worth generating", labelTr: "İyi — üretmeye değer", icon: "⚡" };
  if (score >= 45) return { c: "text-amber-400", ring: "border-amber-500/30 bg-amber-500/8", labelEn: "Average — sharpen the angle", labelTr: "Orta — açıyı keskinleştir", icon: "💡" };
  return { c: "text-rose-400", ring: "border-rose-500/30 bg-rose-500/8", labelEn: "Weak — try a bolder angle", labelTr: "Zayıf — daha cesur bir açı dene", icon: "⚠️" };
}

export const TopicPerformanceMeter = memo(function TopicPerformanceMeter({ topic, locale, platform }: Props) {
  const tr = locale === "tr";
  const a = useMemo(() => analyze(topic, platform), [topic, platform]);
  if (!a) return null;
  const t = tone(a.score);

  return (
    <div className={`rounded-2xl border ${t.ring} p-3 space-y-2.5 animate-fade-in`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg leading-none">{t.icon}</span>
          <div className="min-w-0">
            <p className={`text-xs font-black ${t.c} truncate`}>
              {tr ? t.labelTr : t.labelEn}
            </p>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Eye className="h-2.5 w-2.5" />
              {tr ? "Tahmini erişim" : "Est. reach"}: <span className="font-bold text-foreground tabular-nums">{fmtK(a.low)}–{fmtK(a.high)}</span> {tr ? "görüntülenme" : "views"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground font-bold">{tr ? "Konu skoru" : "Topic score"}</p>
            <p className={`text-lg font-black tabular-nums leading-none ${t.c}`}>{a.score}<span className="text-[10px] text-muted-foreground">/100</span></p>
          </div>
        </div>
      </div>

      <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${a.score >= 78 ? "bg-emerald-400" : a.score >= 60 ? "bg-primary" : a.score >= 45 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${a.score}%` }} />
      </div>

      <div className="flex flex-wrap gap-1">
        {a.signals.map((s) => (
          <span
            key={s.key}
            className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md border ${
              s.on
                ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400"
                : "bg-muted/40 border-border/40 text-muted-foreground/60 line-through decoration-muted-foreground/40"
            }`}
          >
            {s.on ? "✓" : "·"} {tr ? s.tr : s.en}
          </span>
        ))}
      </div>
    </div>
  );
});