import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Loader2, Copy, Sparkles, Check, Wand2, Star, ArrowUpDown, Crown,
  Flame, ChevronDown, ChevronUp, Download, Heart, Trophy, Zap,
} from "lucide-react";

interface HookLabProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  topic: string;
  language: string;
  platform: string;
  audience?: string;
  style?: string;
  onUseHook?: (hookText: string) => void;
}

interface HookVariation {
  angle: string;
  text: string;
  score: number;
  curiosityGap: string;
  emotionalTrigger: string;
  retentionForecast: "3s" | "10s" | "full";
  tip: string;
}

const ANGLE_COLORS: Record<string, string> = {
  Shock:           "bg-red-500/15 text-red-400 border-red-500/30",
  Curiosity:       "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Fear:            "bg-rose-500/15 text-rose-400 border-rose-500/30",
  Controversy:     "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Authority:       "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Story:           "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Question:        "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  Contrast:        "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "Stat Bomb":     "bg-violet-500/15 text-violet-400 border-violet-500/30",
  Forbidden:       "bg-pink-500/15 text-pink-400 border-pink-500/30",
  "Numbered List": "bg-teal-500/15 text-teal-400 border-teal-500/30",
  Cliffhanger:     "bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30",
};

const FAV_KEY = "hook_lab_favorites_v1";

function scoreColor(s: number) {
  if (s >= 90) return "from-amber-500 to-orange-600 text-white";
  if (s >= 75) return "from-emerald-500 to-teal-600 text-white";
  if (s >= 60) return "from-blue-500 to-cyan-600 text-white";
  return "from-slate-500 to-slate-700 text-white";
}

function scoreLabel(s: number, isTr: boolean) {
  if (s >= 90) return isTr ? "Endüstri katili" : "Industry killer";
  if (s >= 75) return isTr ? "Çok güçlü" : "Strong";
  if (s >= 60) return isTr ? "Solid" : "Solid";
  return isTr ? "Zayıf" : "Weak";
}

export function HookLab({ open, onOpenChange, topic, language, platform, audience = "global", style = "viral", onUseHook }: HookLabProps) {
  const [loading, setLoading] = useState(false);
  const [hooks, setHooks] = useState<HookVariation[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [sortMode, setSortMode] = useState<"score" | "default">("score");
  const [filterAngle, setFilterAngle] = useState<string | "all">("all");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [view, setView] = useState<"all" | "favorites">("all");

  const isTr = language === "tr";

  // Load favorites
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAV_KEY);
      if (raw) setFavorites(JSON.parse(raw));
    } catch { /* noop */ }
  }, []);

  function persistFavorites(next: string[]) {
    setFavorites(next);
    try { localStorage.setItem(FAV_KEY, JSON.stringify(next.slice(0, 100))); } catch { /* noop */ }
  }

  function toggleFavorite(text: string) {
    if (favorites.includes(text)) {
      persistFavorites(favorites.filter(f => f !== text));
      toast.success(isTr ? "Favorilerden çıkarıldı" : "Removed from favorites");
    } else {
      persistFavorites([text, ...favorites]);
      toast.success(isTr ? "Favorilere eklendi ⭐" : "Saved to favorites ⭐");
    }
  }

  async function generate() {
    if (!topic.trim()) {
      toast.error(isTr ? "Önce bir topic gir" : "Enter a topic first");
      return;
    }
    setLoading(true);
    setHooks([]);
    setExpandedIdx(null);
    try {
      const { data, error } = await supabase.functions.invoke("hook-lab", {
        body: { topic, language, platform, audience, style },
      });
      if (error) throw error;
      const list: HookVariation[] = Array.isArray(data?.hooks) ? data.hooks : [];
      if (list.length === 0) throw new Error("No hooks");
      setHooks(list);
      const top = Math.max(...list.map(h => h.score || 0));
      toast.success(isTr ? `${list.length} hook hazır — en yüksek skor ${top}` : `${list.length} hooks ready — top score ${top}`);
    } catch (e: any) {
      console.error("Hook lab error", e);
      const msg = e?.message?.includes("Rate") ? (isTr ? "Çok hızlı, biraz bekle" : "Slow down a moment")
        : e?.message?.includes("credits") ? (isTr ? "AI kredisi bitti" : "AI credits exhausted")
        : (isTr ? "Üretilemedi, tekrar dene" : "Failed, try again");
      toast.error(msg);
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

  function copyAll() {
    const txt = displayHooks.map((h, i) => `${i + 1}. [${h.angle} • ${h.score}] ${h.text}`).join("\n");
    navigator.clipboard.writeText(txt);
    toast.success(isTr ? "Tüm hook'lar kopyalandı" : "All hooks copied");
  }

  function exportTxt() {
    const txt = `HOOK LAB EXPORT\nTopic: ${topic}\nPlatform: ${platform}\n\n` +
      displayHooks.map((h, i) =>
        `${i + 1}. [${h.angle}] (Score ${h.score}/100 • ${h.retentionForecast} retention • ${h.emotionalTrigger})\n   "${h.text}"\n   Curiosity gap: ${h.curiosityGap}\n   Tip: ${h.tip}\n`
      ).join("\n");
    const blob = new Blob([txt], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hooks-${topic.slice(0, 24).replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isTr ? "İndirildi" : "Downloaded");
  }

  const allAngles = useMemo(() => Array.from(new Set(hooks.map(h => h.angle))), [hooks]);

  const displayHooks = useMemo(() => {
    let list = [...hooks];
    if (view === "favorites") list = list.filter(h => favorites.includes(h.text));
    if (filterAngle !== "all") list = list.filter(h => h.angle === filterAngle);
    if (sortMode === "score") list.sort((a, b) => (b.score || 0) - (a.score || 0));
    return list;
  }, [hooks, sortMode, filterAngle, favorites, view]);

  const stats = useMemo(() => {
    if (hooks.length === 0) return null;
    const scores = hooks.map(h => h.score || 0);
    const top = Math.max(...scores);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const elite = scores.filter(s => s >= 85).length;
    return { top, avg, elite };
  }, [hooks]);

  const favoriteCount = useMemo(() => hooks.filter(h => favorites.includes(h.text)).length, [hooks, favorites]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border/40 bg-gradient-to-br from-primary/5 via-fuchsia-500/5 to-transparent">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-primary to-fuchsia-600 flex items-center justify-center shadow-lg shadow-primary/30">
              <Wand2 className="h-4 w-4 text-white" />
            </div>
            {isTr ? "Hook Lab" : "Hook Lab"}
            <Badge variant="outline" className="ml-1 text-[10px] uppercase tracking-widest border-primary/30 text-primary">
              {isTr ? "12 açı • skorlu" : "12 angles • scored"}
            </Badge>
          </DialogTitle>
          <DialogDescription className="line-clamp-2 text-xs sm:text-sm">
            {isTr ? "Konu" : "Topic"}: <span className="font-medium text-foreground">{topic || "—"}</span>
          </DialogDescription>

          {stats && (
            <div className="flex items-center gap-3 sm:gap-5 pt-3 flex-wrap text-xs">
              <div className="flex items-center gap-1.5">
                <Trophy className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-muted-foreground">{isTr ? "En yüksek" : "Top"}:</span>
                <span className="font-bold text-foreground">{stats.top}/100</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-muted-foreground">{isTr ? "Ortalama" : "Avg"}:</span>
                <span className="font-bold text-foreground">{stats.avg}/100</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-muted-foreground">{isTr ? "Elit" : "Elite"} (85+):</span>
                <span className="font-bold text-foreground">{stats.elite}</span>
              </div>
              {favoriteCount > 0 && (
                <div className="flex items-center gap-1.5">
                  <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                  <span className="font-bold text-foreground">{favoriteCount}</span>
                </div>
              )}
            </div>
          )}
        </DialogHeader>

        <div className="px-6 py-5">

          {/* EMPTY */}
          {hooks.length === 0 && !loading && (
            <div className="py-12 text-center space-y-5">
              <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-fuchsia-500/20 flex items-center justify-center">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base">
                  {isTr ? "12 hook varyasyonu üret ve karşılaştır" : "Generate & rank 12 hook variations"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                  {isTr
                    ? "Aynı konu için 12 farklı psikolojik açıdan hook üret. Her biri 0-100 skorlanır, retention tahmini ve iyileştirme önerisi ile gelir."
                    : "Generate 12 hooks from different psychological angles. Each scored 0-100, with retention forecast and a sharpening tip."}
                </p>
              </div>
              <Button onClick={generate} disabled={!topic.trim()} variant="generate" size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" />
                {isTr ? "12 Hook Üret" : "Generate 12 Hooks"}
              </Button>
              <p className="text-[11px] text-muted-foreground">~6s • {isTr ? "skor + breakdown dahil" : "score + breakdown included"}</p>
            </div>
          )}

          {/* LOADING */}
          {loading && (
            <div className="py-14 text-center space-y-4">
              <div className="relative h-12 w-12 mx-auto">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary to-fuchsia-600 animate-pulse-glow" />
                <Loader2 className="absolute inset-0 m-auto h-6 w-6 animate-spin text-white" />
              </div>
              <p className="text-sm text-muted-foreground">{isTr ? "Hook'lar üretiliyor ve skorlanıyor…" : "Generating & scoring hooks…"}</p>
              <div className="space-y-1.5 max-w-sm mx-auto">
                {[0, 1, 2].map(i => (
                  <div key={i} className="h-12 rounded-lg bg-muted/40 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}

          {/* RESULTS */}
          {hooks.length > 0 && !loading && (
            <div className="space-y-4">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Tabs value={view} onValueChange={(v) => setView(v as any)} className="flex-shrink-0">
                  <TabsList className="h-8 p-0.5">
                    <TabsTrigger value="all" className="h-7 px-3 text-xs">
                      {isTr ? "Tümü" : "All"} ({hooks.length})
                    </TabsTrigger>
                    <TabsTrigger value="favorites" className="h-7 px-3 text-xs gap-1">
                      <Heart className="h-3 w-3" />
                      {isTr ? "Favoriler" : "Favorites"} ({favoriteCount})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-xs gap-1.5"
                    onClick={() => setSortMode(sortMode === "score" ? "default" : "score")}
                  >
                    <ArrowUpDown className="h-3.5 w-3.5" />
                    {sortMode === "score" ? (isTr ? "Skora göre" : "By score") : (isTr ? "Sıralı" : "Default")}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1.5" onClick={copyAll}>
                    <Copy className="h-3.5 w-3.5" />
                    {isTr ? "Hepsini kopyala" : "Copy all"}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 px-2 text-xs gap-1.5" onClick={exportTxt}>
                    <Download className="h-3.5 w-3.5" />
                    TXT
                  </Button>
                </div>
              </div>

              {/* Angle filter chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-thin">
                <button
                  onClick={() => setFilterAngle("all")}
                  className={`shrink-0 h-7 px-2.5 rounded-full text-[11px] font-medium border transition ${
                    filterAngle === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/40 text-muted-foreground border-border hover:text-foreground"
                  }`}
                >
                  {isTr ? "Tüm açılar" : "All angles"}
                </button>
                {allAngles.map(a => (
                  <button
                    key={a}
                    onClick={() => setFilterAngle(filterAngle === a ? "all" : a)}
                    className={`shrink-0 h-7 px-2.5 rounded-full text-[11px] font-medium border transition ${
                      filterAngle === a
                        ? "bg-foreground text-background border-foreground"
                        : `${ANGLE_COLORS[a] || "bg-muted/40 text-muted-foreground border-border"} hover:opacity-80`
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>

              {/* Hook list */}
              {displayHooks.length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">
                  {view === "favorites"
                    ? (isTr ? "Henüz favori yok. ⭐ ile ekle." : "No favorites yet. Tap ⭐ to save.")
                    : (isTr ? "Filtrede sonuç yok." : "No hooks match this filter.")}
                </div>
              ) : (
                <div className="space-y-2">
                  {displayHooks.map((h, i) => {
                    const colorClass = ANGLE_COLORS[h.angle] || "bg-muted text-muted-foreground border-border";
                    const isExpanded = expandedIdx === i;
                    const isTop = h.score === stats?.top && h.score >= 85;
                    const isFav = favorites.includes(h.text);
                    return (
                      <Card
                        key={`${h.angle}-${i}`}
                        className={`group transition-all overflow-hidden ${
                          isTop ? "border-amber-500/40 shadow-md shadow-amber-500/10" : "hover:border-primary/40"
                        }`}
                      >
                        <CardContent className="p-0">
                          {/* Top bar */}
                          <div className="flex items-stretch gap-0">
                            {/* Score column */}
                            <div className={`relative flex flex-col items-center justify-center px-3 sm:px-4 py-3 bg-gradient-to-br ${scoreColor(h.score)} min-w-[68px]`}>
                              {isTop && (
                                <Crown className="absolute -top-1.5 -right-1.5 h-4 w-4 text-amber-400 fill-amber-400 drop-shadow" />
                              )}
                              <span className="text-2xl font-extrabold tabular-nums leading-none">{h.score}</span>
                              <span className="text-[9px] uppercase tracking-widest opacity-80 mt-0.5">{scoreLabel(h.score, isTr)}</span>
                            </div>

                            {/* Hook body */}
                            <div className="flex-1 min-w-0 p-3 space-y-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge variant="outline" className={`${colorClass} text-[10px] uppercase tracking-wider`}>
                                  {h.angle}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] uppercase tracking-wider bg-muted/40 border-border/60 text-muted-foreground">
                                  {h.emotionalTrigger}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] uppercase tracking-wider bg-muted/40 border-border/60 text-muted-foreground">
                                  ▶ {h.retentionForecast}
                                </Badge>
                              </div>
                              <p className="text-sm sm:text-[15px] font-semibold leading-snug text-foreground">
                                {h.text}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col items-center gap-1 p-2 border-l border-border/40 bg-muted/20">
                              <button
                                onClick={() => toggleFavorite(h.text)}
                                className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-rose-500/10 transition"
                                title={isFav ? "Unfavorite" : "Favorite"}
                              >
                                <Heart className={`h-3.5 w-3.5 ${isFav ? "fill-rose-500 text-rose-500" : "text-muted-foreground"}`} />
                              </button>
                              <button
                                onClick={() => copyHook(i, h.text)}
                                className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-primary/10 transition"
                                title="Copy"
                              >
                                {copiedIdx === i ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                              </button>
                              <button
                                onClick={() => setExpandedIdx(isExpanded ? null : i)}
                                className="h-7 w-7 rounded-md flex items-center justify-center hover:bg-muted transition"
                                title="Breakdown"
                              >
                                {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                              </button>
                            </div>
                          </div>

                          {/* Breakdown */}
                          {isExpanded && (
                            <div className="px-3 pb-3 pt-0 space-y-2 animate-fade-in">
                              <Separator />
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                                <div className="rounded-md bg-muted/30 p-2.5 space-y-0.5">
                                  <p className="text-[9px] uppercase tracking-widest font-bold text-muted-foreground">
                                    {isTr ? "Curiosity Gap" : "Curiosity Gap"}
                                  </p>
                                  <p className="text-xs text-foreground leading-relaxed">{h.curiosityGap}</p>
                                </div>
                                <div className="rounded-md bg-primary/5 border border-primary/20 p-2.5 space-y-0.5">
                                  <p className="text-[9px] uppercase tracking-widest font-bold text-primary">
                                    {isTr ? "💡 Daha keskin" : "💡 Sharpen it"}
                                  </p>
                                  <p className="text-xs text-foreground leading-relaxed">{h.tip}</p>
                                </div>
                              </div>
                              {onUseHook && (
                                <Button
                                  size="sm"
                                  variant="generate"
                                  className="w-full h-8 text-xs gap-1.5"
                                  onClick={() => { onUseHook(h.text); onOpenChange(false); toast.success(isTr ? "Hook seçildi 🎯" : "Hook applied 🎯"); }}
                                >
                                  <Star className="h-3.5 w-3.5" />
                                  {isTr ? "Bu hook'u kullan" : "Use this hook"}
                                </Button>
                              )}
                            </div>
                          )}

                          {/* Quick "Use" when collapsed */}
                          {!isExpanded && onUseHook && (
                            <div className="px-3 pb-2.5">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="w-full h-7 text-[11px] text-primary hover:bg-primary/10 gap-1.5"
                                onClick={() => { onUseHook(h.text); onOpenChange(false); toast.success(isTr ? "Hook seçildi 🎯" : "Hook applied 🎯"); }}
                              >
                                <Star className="h-3 w-3" />
                                {isTr ? "Bu hook'u kullan" : "Use this hook"}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <div className="pt-2 flex justify-center">
                <Button onClick={generate} variant="outline" size="sm" disabled={loading} className="gap-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  {isTr ? "Yeni 12 hook üret" : "Regenerate 12 hooks"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}