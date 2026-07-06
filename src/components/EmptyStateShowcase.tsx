import React, { memo } from "react";
import { Sparkles, Play, TrendingUp } from "lucide-react";
import { type Locale } from "@/lib/i18n";

interface Demo {
  topic: string;
  topicTr: string;
  hook: string;
  hookTr: string;
  score: number;
  tag: string;
  gradient: string;
}

const DEMOS: Demo[] = [
  {
    topic: "Why NASA deleted this photo",
    topicTr: "NASA bu fotoğrafı neden sildi",
    hook: "They deleted it.",
    hookTr: "Fotoğraf silindi.",
    score: 92,
    tag: "Mystery",
    gradient: "from-violet-500/20 via-fuchsia-500/10 to-transparent",
  },
  {
    topic: "The habit that changed everything for me",
    topicTr: "Hayatımı değiştiren tek alışkanlık",
    hook: "Stop scrolling.",
    hookTr: "Kaydırmayı bırak.",
    score: 87,
    tag: "Motivation",
    gradient: "from-amber-500/20 via-orange-500/10 to-transparent",
  },
  {
    topic: "How ChatGPT rewires your brain",
    topicTr: "ChatGPT beynini nasıl yeniden programlıyor",
    hook: "You're addicted.",
    hookTr: "Bağımlısın.",
    score: 89,
    tag: "Tech",
    gradient: "from-cyan-500/20 via-emerald-500/10 to-transparent",
  },
];

interface Props {
  locale: Locale;
  onPick: (topic: string) => void;
}

export const EmptyStateShowcase = memo(function EmptyStateShowcase({ locale, onPick }: Props) {
  const tr = locale === "tr";
  return (
    <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/5 via-card/40 to-transparent p-5 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-primary/15 border border-primary/30 px-2.5 text-[10px] font-bold uppercase tracking-widest text-primary">
              <Sparkles className="h-3 w-3" />
              {tr ? "Nasıl çalışır" : "See what you get"}
            </span>
          </div>
          <h3 className="text-lg font-bold text-foreground font-display">
            {tr ? "Bir konuya tıkla, üretilmiş örneği aç" : "Tap a topic to see a real generated pack"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {tr ? "Konu, senin generate alanına gelir — sonra sadece Oluştur'a bas." : "Topic drops into your input — then just hit Generate."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {DEMOS.map((d, i) => (
          <button
            key={i}
            onClick={() => onPick(tr ? d.topicTr : d.topic)}
            className={`group relative overflow-hidden text-left rounded-2xl border border-border/50 bg-gradient-to-br ${d.gradient} p-4 hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-300`}
          >
            <div className="absolute -top-8 -right-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">
                  {d.tag}
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-black tabular-nums text-emerald-400">
                  <TrendingUp className="h-3 w-3" />
                  {d.score}
                </span>
              </div>
              <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2">
                {tr ? d.topicTr : d.topic}
              </p>
              <div className="rounded-xl bg-background/40 border border-border/40 px-2.5 py-1.5">
                <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">
                  {tr ? "Hook" : "Hook"}
                </p>
                <p className="text-sm font-black text-foreground italic">
                  "{tr ? d.hookTr : d.hook}"
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-primary group-hover:gap-2 transition-all">
                <Play className="h-3 w-3 fill-primary" />
                {tr ? "Bu konuyu dene" : "Try this topic"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
});