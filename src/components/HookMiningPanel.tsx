import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Flame, Copy, AlertTriangle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Pattern {
  patternName: string;
  structure: string;
  whyWorking: string;
  exampleHook: string;
  heat: number;
}
interface Mining {
  patterns: Pattern[];
  avoid: { pattern: string; reason: string }[];
}

interface Props {
  niche: string;
  topic?: string;
  language: "en" | "tr";
  platform: string;
  audience: string;
  onUseHook?: (hook: string) => void;
}

export function HookMiningPanel({ niche, topic, language, platform, audience, onUseHook }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Mining | null>(null);
  const isTr = language === "tr";

  const run = async () => {
    if (!niche?.trim()) {
      toast.error(isTr ? "Önce bir niş seçin" : "Pick a niche first");
      return;
    }
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("hook-mining", {
        body: { niche, topic, language, platform, audience },
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData(res as Mining);
    } catch (e: any) {
      toast.error(e?.message || (isTr ? "Bir şeyler ters gitti" : "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  const heatTone = (h: number) =>
    h >= 9 ? "text-red-400 border-red-500/40 bg-red-500/10"
    : h >= 7 ? "text-orange-400 border-orange-500/40 bg-orange-500/10"
    : "text-amber-400 border-amber-500/40 bg-amber-500/10";

  return (
    <Card className="rounded-2xl border-orange-500/20 bg-gradient-to-br from-orange-500/[0.04] via-transparent to-transparent overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-orange-500/15 flex items-center justify-center shrink-0">
              <Flame className="h-4 w-4 text-orange-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{isTr ? "Trend Hook Madenciliği" : "Competitor Hook Mining"}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isTr ? `Şu an "${niche || "—"}" nişinde patlayan hook kalıpları.` : `Hook patterns currently exploding in "${niche || "—"}".`}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={run} disabled={loading} className="rounded-xl shrink-0 bg-orange-500/90 hover:bg-orange-500 text-white">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            {loading ? (isTr ? "Aranıyor…" : "Mining…") : (isTr ? "Trendleri Bul" : "Mine Now")}
          </Button>
        </div>

        {data && (
          <div className="space-y-2.5 pt-2">
            {data.patterns.map((p, i) => (
              <div key={i} className="rounded-xl border border-border/40 bg-muted/30 p-3 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-foreground">{p.patternName}</p>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${heatTone(p.heat)}`}>
                    🔥 {p.heat}/10
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-snug"><span className="font-bold text-foreground/80 uppercase tracking-widest text-[9px] mr-1">{isTr ? "Şablon" : "Structure"}:</span>{p.structure}</p>
                <p className="text-[11px] text-muted-foreground italic leading-snug">{p.whyWorking}</p>
                <div className="flex items-start justify-between gap-2 pt-1 border-t border-border/30 mt-1">
                  <p className="text-sm font-semibold text-foreground flex-1">{p.exampleHook}</p>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => { navigator.clipboard.writeText(p.exampleHook); toast.success(isTr ? "Kopyalandı" : "Copied"); }}>
                      <Copy className="h-3 w-3" />
                    </Button>
                    {onUseHook && (
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-primary" onClick={() => onUseHook(p.exampleHook)}>
                        {isTr ? "Kullan" : "Use"}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                <p className="text-[10px] uppercase tracking-widest font-bold text-red-400">{isTr ? "Bunlardan Kaç" : "Avoid These"}</p>
              </div>
              {data.avoid.map((a, i) => (
                <p key={i} className="text-xs text-muted-foreground leading-snug"><span className="font-semibold text-foreground/80">{a.pattern}</span> — {a.reason}</p>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}