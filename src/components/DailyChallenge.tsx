import React, { memo, useMemo } from "react";
import { Sparkles, ArrowRight, Calendar } from "lucide-react";
import { type Locale } from "@/lib/i18n";

const CHALLENGES_EN = [
  { title: "Cliffhanger Friday", desc: "Write a hook that withholds the answer for 30s", style: "suspense" },
  { title: "1-Word Hook", desc: "Open the script with just one explosive word", style: "viral" },
  { title: "Time-Travel Twist", desc: "Connect a present trend to a past event", style: "story" },
  { title: "Forbidden Number", desc: "Use a precise number nobody talks about", style: "educational" },
  { title: "Reverse Reveal", desc: "Show the result first, story second", style: "viral" },
  { title: "Whisper Hook", desc: "Start as if telling a secret to one person", style: "emotional" },
  { title: "Pattern Break", desc: "Open with what people expect — then break it", style: "controversial" },
];
const CHALLENGES_TR = [
  { title: "Cliffhanger Cuması", desc: "Cevabı 30 saniye saklayan bir hook yaz", style: "suspense" },
  { title: "Tek Kelime Hook", desc: "Senaryoya tek patlayıcı kelimeyle başla", style: "viral" },
  { title: "Zaman Yolculuğu", desc: "Güncel bir trendi geçmiş bir olaya bağla", style: "story" },
  { title: "Yasak Sayı", desc: "Kimsenin konuşmadığı net bir rakam kullan", style: "educational" },
  { title: "Tersten Açıklama", desc: "Önce sonucu, sonra hikayeyi göster", style: "viral" },
  { title: "Fısıltı Hook", desc: "Tek kişiye sır verir gibi başla", style: "emotional" },
  { title: "Beklenti Kırıcı", desc: "İnsanların beklediği şeyle başla — sonra kır", style: "controversial" },
];

interface Props {
  locale: Locale;
  onAccept: (style: string) => void;
}

export const DailyChallenge = memo(function DailyChallenge({ locale, onAccept }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    return Math.floor(d.getTime() / 86400000) % CHALLENGES_EN.length;
  }, []);
  const ch = locale === "tr" ? CHALLENGES_TR[today] : CHALLENGES_EN[today];

  return (
    <button
      onClick={() => onAccept(ch.style)}
      className="group relative w-full text-left rounded-2xl overflow-hidden border border-primary/30 bg-gradient-to-br from-primary/10 via-fuchsia-500/5 to-transparent hover:border-primary/50 transition-all neon-edge"
    >
      <div className="p-4 flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-fuchsia-600 flex items-center justify-center shadow-[0_0_20px_-4px_hsl(var(--primary)/0.6)] shrink-0">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Calendar className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              {locale === "tr" ? "Günün Görevi" : "Daily Challenge"}
            </span>
          </div>
          <p className="text-sm font-bold text-foreground truncate">{ch.title}</p>
          <p className="text-xs text-muted-foreground truncate">{ch.desc}</p>
        </div>
        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/15 border border-primary/30 text-[11px] font-bold text-primary shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
          {locale === "tr" ? "Başla" : "Start"}
          <ArrowRight className="h-3 w-3" />
        </div>
      </div>
    </button>
  );
});
