import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Layout, Trophy, Copy, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Variant {
  lever: string;
  title: string;
  thumbnail: { visual: string; overlay: string; driver: string };
  ctrScore: number;
  reason: string;
}

interface LabResult {
  variants: Variant[];
  winnerIndex: number;
  winnerWhy: string;
}

interface Props {
  topic: string;
  hook?: string;
  language: "en" | "tr";
  platform: string;
  audience: string;
  imageStyle: string;
}

export function TitleThumbnailLab({ topic, hook, language, platform, audience, imageStyle }: Props) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<LabResult | null>(null);
  const isTr = language === "tr";

  const run = async () => {
    if (!topic?.trim()) {
      toast.error(isTr ? "Önce bir konu girin" : "Enter a topic first");
      return;
    }
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("title-thumbnail-lab", {
        body: { topic, hook, language, platform, audience, imageStyle },
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      setData(res as LabResult);
    } catch (e: any) {
      toast.error(e?.message || (isTr ? "Bir şeyler ters gitti" : "Something went wrong"));
    } finally {
      setLoading(false);
    }
  };

  const copy = (txt: string, label: string) => {
    navigator.clipboard.writeText(txt);
    toast.success(isTr ? `${label} kopyalandı` : `${label} copied`);
  };

  const tone = (s: number) =>
    s >= 90 ? "text-emerald-400 border-emerald-500/40 bg-emerald-500/10"
    : s >= 75 ? "text-primary border-primary/40 bg-primary/10"
    : s >= 60 ? "text-amber-400 border-amber-500/40 bg-amber-500/10"
    : "text-muted-foreground border-border bg-muted/40";

  return (
    <Card className="rounded-2xl border-primary/20 bg-gradient-to-br from-primary/[0.04] via-transparent to-transparent overflow-hidden">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
              <Layout className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">{isTr ? "Title & Thumbnail A/B Lab" : "Title & Thumbnail A/B Lab"}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isTr ? "5 başlık + 5 thumbnail varyasyonu, CTR tahmini, kazanan önerisi." : "5 titles + 5 thumbnails, CTR forecast, winner pick."}
              </p>
            </div>
          </div>
          <Button size="sm" onClick={run} disabled={loading} className="rounded-xl shrink-0">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {loading ? (isTr ? "Üretiliyor…" : "Running…") : (isTr ? "A/B Üret" : "Run A/B")}
          </Button>
        </div>

        {data && (
          <div className="space-y-3 pt-2">
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-start gap-2">
              <Trophy className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-emerald-400">{isTr ? "Kazanan" : "Winner"} — #{data.winnerIndex + 1}</p>
                <p className="text-xs text-foreground mt-0.5">{data.winnerWhy}</p>
              </div>
            </div>

            {data.variants.map((v, i) => (
              <div key={i} className={`rounded-xl border p-3 space-y-2 ${i === data.winnerIndex ? "border-emerald-500/40 bg-emerald-500/[0.03]" : "border-border/40 bg-muted/30"}`}>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] rounded-md">{v.lever}</Badge>
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md border ${tone(v.ctrScore)}`}>
                    CTR {v.ctrScore}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground leading-snug flex-1">{v.title}</p>
                  <Button variant="ghost" size="sm" className="h-7 px-2 shrink-0" onClick={() => copy(v.title, "Title")}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>

                <div className="rounded-lg bg-background/50 border border-border/30 p-2.5 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{isTr ? "Thumbnail" : "Thumbnail"}</span>
                    <Badge variant="secondary" className="text-[10px] rounded">{v.thumbnail.driver}</Badge>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{v.thumbnail.visual}</p>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs"><span className="text-muted-foreground mr-1">{isTr ? "Yazı:" : "Text:"}</span><span className="font-bold text-foreground">{v.thumbnail.overlay}</span></p>
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => copy(`${v.thumbnail.visual}\nOverlay: ${v.thumbnail.overlay}`, "Thumbnail")}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground italic leading-snug">{v.reason}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}