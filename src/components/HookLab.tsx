import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Copy, Sparkles, Check, Wand2 } from "lucide-react";

interface HookLabProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: string;
  language: string;
  platform: string;
  onUseHook?: (hookText: string) => void;
}

interface HookVariation {
  angle: string;
  text: string;
}

const ANGLE_COLORS: Record<string, string> = {
  Shock:        "bg-red-500/15 text-red-400 border-red-500/30",
  Curiosity:    "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Fear:         "bg-rose-500/15 text-rose-400 border-rose-500/30",
  Controversy:  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Authority:    "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Story:        "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Question:     "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Contrast:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Stat Bomb":  "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Forbidden:    "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

export function HookLab({ open, onOpenChange, topic, language, platform, onUseHook }: HookLabProps) {
  const [loading, setLoading] = useState(false);
  const [hooks, setHooks] = useState<HookVariation[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const isTr = language === "tr";

  async function generate() {
    if (!topic.trim()) {
      toast.error(isTr ? "Önce bir topic gir" : "Enter a topic first");
      return;
    }
    setLoading(true);
    setHooks([]);
    try {
      const { data, error } = await supabase.functions.invoke("hook-lab", {
        body: { topic, language, platform },
      });
      if (error) throw error;
      const list: HookVariation[] = Array.isArray(data?.hooks) ? data.hooks : [];
      if (list.length === 0) throw new Error("No hooks");
      setHooks(list);
      toast.success(isTr ? "10 hook varyasyonu hazır 🔥" : "10 hook variations ready 🔥");
    } catch (e: any) {
      console.error("Hook lab error", e);
      toast.error(isTr ? "Üretilemedi, tekrar dene" : "Failed, try again");
    } finally {
      setLoading(false);
    }
  }

  function copyHook(idx: number, text: string) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success(isTr ? "Kopyalandı" : "Copied");
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            {isTr ? "Hook Lab — 10 Psikolojik Açı" : "Hook Lab — 10 Psychological Angles"}
          </DialogTitle>
          <DialogDescription className="line-clamp-2">
            {isTr ? "Topic" : "Topic"}: <span className="font-medium text-foreground">{topic || "—"}</span>
          </DialogDescription>
        </DialogHeader>

        {hooks.length === 0 && !loading && (
          <div className="py-8 text-center space-y-4">
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {isTr
                ? "Aynı topic için 10 farklı psikolojik açıdan hook üret ve karşılaştır."
                : "Generate 10 hook variations from different psychological angles for the same topic."}
            </p>
            <Button onClick={generate} disabled={!topic.trim()} variant="generate" size="lg" className="gap-2">
              <Sparkles className="h-4 w-4" />
              {isTr ? "10 Hook Üret" : "Generate 10 Hooks"}
            </Button>
          </div>
        )}

        {loading && (
          <div className="py-12 text-center space-y-3">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
            <p className="text-sm text-muted-foreground">{isTr ? "10 hook üretiliyor…" : "Generating 10 hooks…"}</p>
          </div>
        )}

        {hooks.length > 0 && (
          <div className="space-y-2">
            {hooks.map((h, i) => {
              const colorClass = ANGLE_COLORS[h.angle] || "bg-muted text-muted-foreground border-border";
              return (
                <Card key={i} className="hover:border-primary/40 transition-colors">
                  <CardContent className="p-3 flex items-start gap-3">
                    <Badge variant="outline" className={`${colorClass} text-[10px] uppercase tracking-wider whitespace-nowrap`}>
                      {h.angle}
                    </Badge>
                    <p className="flex-1 text-sm font-medium leading-relaxed">{h.text}</p>
                    <div className="flex flex-col gap-1">
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => copyHook(i, h.text)}>
                        {copiedIdx === i ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                      {onUseHook && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-[10px] text-primary"
                          onClick={() => { onUseHook(h.text); onOpenChange(false); toast.success(isTr ? "Hook seçildi" : "Hook applied"); }}
                        >
                          {isTr ? "Kullan" : "Use"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            <div className="pt-2 flex justify-center">
              <Button onClick={generate} variant="outline" size="sm" disabled={loading} className="gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                {isTr ? "Yeniden üret" : "Regenerate"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}