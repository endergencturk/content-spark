import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Activity, ChevronRight, Wand2 } from "lucide-react";
import { type Locale } from "@/lib/i18n";

const KEY = "viralengine-onboarded-v1";

interface Props {
  locale: Locale;
  onPickTopic?: (topic: string) => void;
}

const SAMPLE_TOPICS_EN = [
  "Why deep ocean creatures glow in the dark",
  "The Roman empire collapsed because of a tiny bug",
  "What happens to your brain in the first 5 seconds of sleep",
];
const SAMPLE_TOPICS_TR = [
  "Derin okyanus canlıları neden karanlıkta parlar",
  "Roma İmparatorluğu küçücük bir böcek yüzünden çöktü",
  "Uykunun ilk 5 saniyesinde beyninde ne olur",
];

export function OnboardingModal({ locale, onPickTopic }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const tr = locale === "tr";

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) {
        const t = setTimeout(() => setOpen(true), 700);
        return () => clearTimeout(t);
      }
    } catch {}
  }, []);

  const finish = (topic?: string) => {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setOpen(false);
    if (topic && onPickTopic) onPickTopic(topic);
  };

  const samples = tr ? SAMPLE_TOPICS_TR : SAMPLE_TOPICS_EN;

  const steps = [
    {
      icon: Sparkles,
      title: tr ? "Hoş geldin 👋" : "Welcome 👋",
      desc: tr
        ? "Konunu yaz, biz sana viral hook + script + SEO + thumbnail paketini saniyeler içinde verelim."
        : "Type a topic, we generate the viral hook + script + SEO + thumbnail pack in seconds.",
    },
    {
      icon: Zap,
      title: tr ? "Hook Engine + Creator DNA" : "Hook Engine + Creator DNA",
      desc: tr
        ? "Her script MrBeast / Johnny Harris / MrBallen tarzında, 0.5sn'de duracak hook formülleriyle yazılır."
        : "Every script is written with MrBeast / Johnny Harris / MrBallen pacing and 0.5s stop-power hooks.",
    },
    {
      icon: Activity,
      title: tr ? "Viral Skoru + Retention" : "Viral Score + Retention",
      desc: tr
        ? "Her output için 0–100 viral skoru, saniye saniye tutma eğrisi ve iyileştirme önerileri görürsün."
        : "Every output gets a 0–100 viral score, second-by-second retention curve, and optimization tips.",
    },
  ];

  const Cur = steps[step].icon;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) finish(); }}>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-primary/20 rounded-2xl">
        <DialogTitle className="sr-only">{tr ? "Hoş geldin" : "Welcome"}</DialogTitle>
        <div className="relative p-6 bg-gradient-to-br from-primary/12 via-primary/4 to-transparent">
          <div className="flex items-start gap-3">
            <div className="h-11 w-11 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
              <Cur className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-widest font-bold text-primary mb-1">
                {tr ? `Adım ${step + 1} / ${steps.length}` : `Step ${step + 1} of ${steps.length}`}
              </p>
              <h2 className="text-lg font-bold text-foreground">{steps[step].title}</h2>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{steps[step].desc}</p>
            </div>
          </div>

          {step === steps.length - 1 && (
            <div className="mt-5 space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-1">
                {tr ? "Hızlı başla — örnek konular" : "Quick start — try a sample"}
              </p>
              <div className="space-y-1.5">
                {samples.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => finish(s)}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card hover:bg-primary/8 border border-border/40 hover:border-primary/40 transition-all group"
                  >
                    <Wand2 className="h-3.5 w-3.5 text-primary/70 group-hover:text-primary shrink-0" />
                    <span className="text-xs text-foreground/90 flex-1 truncate">{s}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-transform group-hover:translate-x-0.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-6">
            <div className="flex items-center gap-1.5">
              {steps.map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === step ? "w-6 bg-primary" : i < step ? "w-1.5 bg-primary/60" : "w-1.5 bg-muted"}`} />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="text-xs" onClick={() => finish()}>
                {tr ? "Atla" : "Skip"}
              </Button>
              {step < steps.length - 1 ? (
                <Button size="sm" onClick={() => setStep((s) => s + 1)} className="rounded-xl">
                  {tr ? "Devam" : "Next"} <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ) : (
                <Button size="sm" onClick={() => finish()} className="rounded-xl">
                  {tr ? "Başla" : "Get started"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}