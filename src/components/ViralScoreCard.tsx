import React, { memo, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, Zap, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import { type Locale } from "@/lib/i18n";

interface Props {
  script: string;
  bestHook?: string;
  hooks?: any[];
  scriptLength?: string; // "15" | "30" | "60"
  locale?: Locale;
  baseScore?: number; // 1-10 from LLM viralAnalysis
}

function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }

/** Heuristic 0-100 viral score + 12-point retention curve. */
function analyze(script: string, bestHook = "", scriptLength = "30", baseScore?: number) {
  const hookText = (bestHook || script.split(/\n+/)[0] || "").trim();
  const hookWords = hookText.split(/\s+/).filter(Boolean);
  const sentences = script.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  const words = script.split(/\s+/).filter(Boolean);
  const charCount = script.length;
  const targetChars = scriptLength === "15" ? 175 : scriptLength === "60" ? 750 : 320;
  const lengthFit = 1 - Math.min(1, Math.abs(charCount - targetChars) / targetChars);

  // Signal detection
  const lower = script.toLowerCase();
  const hasLoop = /\b(loop|but here['']?s|wait until you|in 60 seconds|next time|part 2|tomorrow)\b/i.test(script);
  const hasCuriosityGap = /\b(secret|truth|nobody|never|hidden|why|how|what if|reason|because)\b/i.test(lower);
  const hasNumber = /\b\d+([.,]\d+)?\b/.test(script);
  const hasPatternInterrupt = /[—–\-]{1,2}|\.\.\.|!\?|\?!/.test(script);
  const shortSentences = sentences.filter((s) => s.split(/\s+/).length <= 6).length;
  const rhythm = sentences.length ? shortSentences / sentences.length : 0;
  const exclaims = (script.match(/[!?]/g) || []).length;

  // Sub-scores 0-100
  const hookScore = clamp(
    (hookWords.length <= 3 ? 100 : hookWords.length <= 5 ? 85 : hookWords.length <= 8 ? 65 : 40)
    + (/\?$/.test(hookText) ? 5 : 0)
    + (/(stop|wait|nobody|secret|why|never|wrong|truth)/i.test(hookText) ? 5 : 0)
  );
  const retentionScore = clamp(
    50 + (hasCuriosityGap ? 15 : 0) + (hasPatternInterrupt ? 12 : 0) + (rhythm * 25) + (hasNumber ? 5 : 0)
  );
  const loopScore = clamp(hasLoop ? 95 : 45);
  const lengthScore = clamp(lengthFit * 100);
  const energyScore = clamp(40 + Math.min(40, exclaims * 6) + (rhythm * 20));

  const overall = Math.round(
    hookScore * 0.30 +
    retentionScore * 0.28 +
    loopScore * 0.14 +
    lengthScore * 0.13 +
    energyScore * 0.15
  );

  // Blend with LLM base score (1-10) if provided
  const blended = baseScore && baseScore > 0
    ? Math.round(overall * 0.6 + (baseScore * 10) * 0.4)
    : overall;

  // 12-point retention curve based on script structure
  const curve: number[] = [];
  const total = words.length || 1;
  for (let i = 0; i < 12; i++) {
    const pos = i / 11; // 0..1
    // start 95-99 then dip, recover with hooks/loops at end
    let v = 99 - Math.pow(pos, 0.55) * 38; // baseline decay
    // hook strength bumps first 2 points
    if (i <= 1) v += (hookScore - 70) * 0.15;
    // pattern interrupt mid-script
    if (hasPatternInterrupt && i >= 3 && i <= 7) v += 4;
    // information delay payoff at 70-85%
    if (i >= 8 && i <= 9) v += hasCuriosityGap ? 5 : -2;
    // loop ending
    if (i >= 10) v += hasLoop ? 6 : -4;
    // jitter for realism
    v += Math.sin((i + 1) * 1.7) * 1.5;
    curve.push(clamp(Math.round(v), 35, 100));
  }

  // Recommendations
  const recs: { type: "good" | "warn"; msg: string; msgTr: string }[] = [];
  if (hookWords.length > 5) recs.push({ type: "warn", msg: `Hook is ${hookWords.length} words — cut to 3 for max stop-power.`, msgTr: `Hook ${hookWords.length} kelime — durdurma gücü için 3 kelimeye indir.` });
  else recs.push({ type: "good", msg: "Hook length is in the viral sweet spot.", msgTr: "Hook uzunluğu viral aralıkta." });
  if (!hasLoop) recs.push({ type: "warn", msg: "No loop ending detected — add a teaser to push rewatches.", msgTr: "Loop sonu yok — yeniden izlemeyi tetikleyecek teaser ekle." });
  else recs.push({ type: "good", msg: "Loop ending detected — strong rewatch trigger.", msgTr: "Loop sonu var — güçlü yeniden izleme tetikleyicisi." });
  if (!hasCuriosityGap) recs.push({ type: "warn", msg: "Curiosity gap is weak — add a 'why/secret/truth' hook.", msgTr: "Merak boşluğu zayıf — 'neden/sır/gerçek' kancası ekle." });
  if (rhythm < 0.35) recs.push({ type: "warn", msg: "Sentences run long — break into 2-6 word punches.", msgTr: "Cümleler uzun — 2-6 kelimelik vuruşlara böl." });
  if (lengthFit < 0.7) recs.push({ type: "warn", msg: `Script length is off-target for ${scriptLength}s — adjust by ~${Math.abs(charCount - targetChars)} chars.`, msgTr: `Süre ${scriptLength}s için ideal değil — yaklaşık ${Math.abs(charCount - targetChars)} karakter ayarla.` });

  return {
    overall: blended,
    sub: { hook: Math.round(hookScore), retention: Math.round(retentionScore), loop: Math.round(loopScore), length: Math.round(lengthScore), energy: Math.round(energyScore) },
    curve,
    recs,
  };
}

function gradeColor(score: number) {
  if (score >= 85) return "text-emerald-400";
  if (score >= 70) return "text-primary";
  if (score >= 55) return "text-amber-400";
  return "text-rose-400";
}

function gradeLabel(score: number, locale: Locale) {
  if (score >= 90) return locale === "tr" ? "Patlama Potansiyeli" : "Explosive";
  if (score >= 80) return locale === "tr" ? "Yüksek Viral" : "High Viral";
  if (score >= 65) return locale === "tr" ? "Güçlü" : "Strong";
  if (score >= 50) return locale === "tr" ? "Orta" : "Average";
  return locale === "tr" ? "Zayıf" : "Weak";
}

export const ViralScoreCard = memo(function ViralScoreCard({
  script, bestHook, scriptLength, locale = "en", baseScore,
}: Props) {
  const a = useMemo(() => analyze(script || "", bestHook, scriptLength, baseScore), [script, bestHook, scriptLength, baseScore]);
  const tr = locale === "tr";

  // Build SVG path for retention curve
  const W = 600, H = 110, P = 8;
  const stepX = (W - P * 2) / (a.curve.length - 1);
  const points = a.curve.map((v, i) => {
    const x = P + i * stepX;
    const y = P + (1 - v / 100) * (H - P * 2);
    return [x, y] as const;
  });
  const linePath = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${points[points.length - 1][0].toFixed(1)},${H - P} L${P},${H - P} Z`;
  const ringDash = (a.overall / 100) * 226.19; // 2πr, r=36

  return (
    <Card className="relative overflow-hidden rounded-2xl border-primary/20 bg-gradient-to-br from-primary/8 via-primary/3 to-transparent animate-fade-in">
      <CardContent className="p-5 space-y-5">
        {/* Header: score ring + sub-scores */}
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center">
          <div className="relative h-[100px] w-[100px] shrink-0">
            <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
              <circle cx="44" cy="44" r="36" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" opacity="0.3" />
              <circle
                cx="44" cy="44" r="36" fill="none"
                stroke="hsl(var(--primary))" strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${ringDash} 226.19`}
                style={{ transition: "stroke-dasharray 0.8s ease-out", filter: "drop-shadow(0 0 6px hsl(var(--primary)/0.5))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-black tabular-nums ${gradeColor(a.overall)}`}>{a.overall}</span>
              <span className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">/ 100</span>
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              <p className="text-[10px] uppercase tracking-widest font-bold text-primary">{tr ? "Viral Skoru" : "Viral Score"}</p>
              <span className={`text-xs font-bold ${gradeColor(a.overall)}`}>· {gradeLabel(a.overall, locale)}</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { k: "hook", lbl: tr ? "Hook" : "Hook", v: a.sub.hook },
                { k: "ret", lbl: tr ? "Tutma" : "Retention", v: a.sub.retention },
                { k: "loop", lbl: tr ? "Loop" : "Loop", v: a.sub.loop },
                { k: "len", lbl: tr ? "Süre" : "Length", v: a.sub.length },
                { k: "nrg", lbl: tr ? "Enerji" : "Energy", v: a.sub.energy },
              ].map((s) => (
                <div key={s.k} className="rounded-xl bg-muted/40 px-2.5 py-1.5">
                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">{s.lbl}</p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-sm font-bold tabular-nums ${gradeColor(s.v)}`}>{s.v}</span>
                    <span className="text-[9px] text-muted-foreground">/100</span>
                  </div>
                  <div className="h-1 w-full rounded-full bg-muted/60 overflow-hidden mt-1">
                    <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${s.v}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Retention curve */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1.5">
              <Activity className="h-3 w-3 text-primary" />
              {tr ? "Tahmini Tutma Eğrisi" : "Predicted Retention Curve"}
            </p>
            <p className="text-[10px] text-muted-foreground tabular-nums">
              {tr ? "Bitiş" : "End"}: <span className={`font-bold ${gradeColor(a.curve[a.curve.length - 1])}`}>{a.curve[a.curve.length - 1]}%</span>
            </p>
          </div>
          <div className="relative rounded-xl bg-muted/30 overflow-hidden">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full h-[110px]">
              <defs>
                <linearGradient id="vsArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* grid lines */}
              {[25, 50, 75].map((g) => (
                <line key={g} x1={P} x2={W - P} y1={P + (1 - g / 100) * (H - P * 2)} y2={P + (1 - g / 100) * (H - P * 2)}
                  stroke="hsl(var(--border))" strokeOpacity="0.4" strokeDasharray="2 4" />
              ))}
              <path d={areaPath} fill="url(#vsArea)" />
              <path d={linePath} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"
                style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)/0.6))" }} />
              {points.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="2.5" fill="hsl(var(--background))" stroke="hsl(var(--primary))" strokeWidth="1.5" />
              ))}
            </svg>
            <div className="flex justify-between px-2 pb-1 text-[9px] text-muted-foreground tabular-nums">
              <span>0s</span>
              <span>{Math.round(parseInt(scriptLength || "30") * 0.25)}s</span>
              <span>{Math.round(parseInt(scriptLength || "30") * 0.5)}s</span>
              <span>{Math.round(parseInt(scriptLength || "30") * 0.75)}s</span>
              <span>{scriptLength}s</span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {a.recs.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-1 flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3 text-primary" />
              {tr ? "İyileştirme Önerileri" : "Optimization Tips"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {a.recs.slice(0, 6).map((r, i) => (
                <div key={i} className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs ${r.type === "good" ? "bg-emerald-500/8 border border-emerald-500/20" : "bg-amber-500/8 border border-amber-500/20"}`}>
                  {r.type === "good"
                    ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    : <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />}
                  <span className="text-foreground/90 leading-snug">{tr ? r.msgTr : r.msg}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});