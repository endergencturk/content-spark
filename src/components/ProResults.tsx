import React, { memo, useState } from "react";
import {
  Copy, Trophy, FileText, Youtube, Hash, Instagram, Film, Image, Mic,
  CalendarClock, Target, Music, TrendingUp, Package, ChevronDown, Clock, Layout, Shuffle,
} from "lucide-react";

const safeArray = (val: any): string[] =>
  Array.isArray(val) ? val : typeof val === "string" ? val.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { t, type Locale } from "@/lib/i18n";
import { ViralAnalysisCard, type ViralAnalysis } from "@/components/ViralAnalysisCard";

interface EditingScene {
  scene: number;
  visual: string;
  onScreenText?: string;
  mood?: string;
}

interface MusicSuggestion {
  type: string;
  source: string;
  why: string;
}

interface ThumbnailIdea {
  image: string;
  text: string;
}

interface TypedHook {
  type: string;
  hook: string;
}

interface AngleVariation {
  type: string;
  hook: string;
}

export interface ProResult {
  bestHook: string;
  hooks?: TypedHook[] | string[];
  hookVariations: string[];
  script: string;
  editingPlan: EditingScene[];
  voiceStyle: string;
  postingStrategy: { bestTime: string; platformTip: string };
  imagePrompts: string[];
  youtube: { title: string; description: string; tags: string[] };
  tiktok: { caption: string; hashtags: string[] };
  instagramCaption?: string;
  music?: MusicSuggestion[];
  seriesPotential?: string;
  viralAnalysis: ViralAnalysis;
  thumbnails?: ThumbnailIdea[];
  angleVariations?: AngleVariation[];
}

const CopyBtn = memo(function CopyBtn({
  text, label, copied, onCopy, locale = "en", customLabel,
}: { text: string; label: string; copied: string; onCopy: (k: string, t: string) => void; locale?: Locale; customLabel?: string }) {
  return (
    <button
      className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => onCopy(label, text)}
    >
      <Copy className="h-3 w-3 inline mr-1" />
      {copied === label ? t("btn.copied", locale) : (customLabel || t("btn.copy", locale))}
    </button>
  );
});

export const ProResults = memo(function ProResults({
  result, platforms, copied, onCopy, locale = "en", targetAudience = "global",
}: { result: ProResult; platforms: string[]; copied: string; onCopy: (k: string, t: string) => void; locale?: Locale; targetAudience?: string }) {
  const [showPack, setShowPack] = useState(false);

  return (
    <div className="space-y-6">
      {/* Best Hook — hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-bold text-primary mb-1.5">⭐ {t("result.bestHook", locale)}</p>
            <p className="text-base font-semibold text-foreground leading-relaxed">{result.bestHook}</p>
          </div>
          <CopyBtn text={result.bestHook} label="best-hook" copied={copied} onCopy={onCopy} locale={locale} />
        </div>
      </div>

      {/* Script */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" />{t("result.voiceover", locale)}
          </h3>
          <CopyBtn text={result.script.split("\n").filter(l => !/^\[.+\]$/.test(l.trim())).map(l => l.replace(/^LOOP:\s*/i, '')).join("\n")} label="pro-script" copied={copied} onCopy={onCopy} locale={locale} />
        </div>
        <div className="bg-muted/40 rounded-2xl p-4">
          {result.script.split("\n").filter(line => !/^\[.+\]$/.test(line.trim())).map((line, i) => (
            <p key={i} className="text-sm leading-loose text-foreground">{line.replace(/^LOOP:\s*/i, '') || <br />}</p>
          ))}
        </div>
      </section>

      {/* SEO — YouTube */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Youtube className="h-3.5 w-3.5 text-primary" />{t("result.youtube", locale)}
          </h3>
          <CopyBtn text={`${result.youtube.title}\n${result.youtube.description}\n${safeArray(result.youtube.tags).join(", ")}`} label="yt" copied={copied} onCopy={onCopy} locale={locale} />
        </div>
        <div className="bg-muted/40 rounded-2xl p-4 space-y-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{t("result.title", locale)}</p>
            <p className="text-sm font-semibold text-foreground">{result.youtube.title}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{t("result.description", locale)}</p>
            <p className="text-sm text-foreground">{result.youtube.description}</p>
          </div>
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("result.tags", locale)}</p>
              <CopyBtn text={safeArray(result.youtube.tags).join(", ")} label="yt-tags-pro" copied={copied} onCopy={onCopy} locale={locale} customLabel={t("btn.copyTags", locale)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {safeArray(result.youtube.tags).map((tag, i) => (
                <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-lg">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEO — TikTok */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-primary" />{t("result.tiktok", locale)}
          </h3>
          <CopyBtn text={`${result.tiktok.caption}\n${safeArray(result.tiktok.hashtags).join(" ")}`} label="tt" copied={copied} onCopy={onCopy} locale={locale} />
        </div>
        <div className="bg-muted/40 rounded-2xl p-4 space-y-2">
          <p className="text-sm text-foreground leading-relaxed">{result.tiktok.caption}</p>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Hashtags</span>
            <CopyBtn text={safeArray(result.tiktok.hashtags).map(h => h.startsWith("#") ? h : `#${h}`).join(" ")} label="tt-hashtags-pro" copied={copied} onCopy={onCopy} locale={locale} customLabel={t("btn.copyHashtags", locale)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {safeArray(result.tiktok.hashtags).map((ht, i) => (
              <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-lg">{ht}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Instagram */}
      {platforms.includes("instagram-reels") && result.instagramCaption && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Instagram className="h-3.5 w-3.5 text-primary" />{t("result.instagram", locale)}
            </h3>
            <CopyBtn text={result.instagramCaption} label="instagram" copied={copied} onCopy={onCopy} locale={locale} />
          </div>
          <div className="bg-muted/40 rounded-2xl p-4">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.instagramCaption}</p>
          </div>
        </section>
      )}

      {/* VIEW FULL CONTENT PACK */}
      {!showPack && (
        <button
          onClick={() => setShowPack(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-primary/30 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
        >
          <Package className="h-4 w-4" />
          {t("result.viewPack", locale)}
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {showPack && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("result.fullPack", locale)}</p>
            <button onClick={() => setShowPack(false)} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">{t("result.hidePack", locale)}</button>
          </div>

          <Accordion type="multiple" defaultValue={["hooks"]} className="space-y-2.5">
            {result.hookVariations?.length > 0 && (
              <AccordionItem value="hooks" className="border border-border/50 rounded-2xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" />{t("result.hookVariations", locale)} ({result.hookVariations.length})</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {result.hookVariations.map((v, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 bg-muted/40 rounded-xl p-3">
                        <p className="text-sm text-foreground leading-relaxed">
                          <span className="text-xs font-bold text-primary mr-1.5">V{i + 1}</span>{v}
                        </p>
                        <CopyBtn text={v} label={`hv-${i}`} copied={copied} onCopy={onCopy} locale={locale} />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Typed Hooks (5 psychological angles) */}
            {result.hooks && result.hooks.length > 0 && (
              <AccordionItem value="typed-hooks" className="border border-border/50 rounded-2xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" />{t("result.hooks", locale)} ({result.hooks.length})</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {result.hooks.map((hook, i) => {
                      const isTyped = typeof hook === "object" && hook !== null;
                      const hookText = isTyped ? (hook as TypedHook).hook : (hook as string);
                      const hookType = isTyped ? (hook as TypedHook).type : undefined;
                      return (
                        <div key={i} className="flex items-start justify-between gap-3 bg-muted/40 rounded-xl p-3">
                          <p className="text-sm text-foreground leading-relaxed">
                            <span className="text-xs font-bold text-primary mr-1.5">#{i + 1}</span>
                            {hookType && <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mr-1.5">[{hookType}]</span>}
                            {hookText}
                          </p>
                          <CopyBtn text={hookText} label={`typed-hook-${i}`} copied={copied} onCopy={onCopy} locale={locale} />
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Angle Variations */}
            {result.angleVariations && result.angleVariations.length > 0 && (
              <AccordionItem value="angles" className="border border-border/50 rounded-2xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2"><Shuffle className="h-4 w-4 text-primary" />{t("result.angleVariations", locale)} ({result.angleVariations.length})</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {result.angleVariations.map((angle, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 bg-muted/40 rounded-xl p-3">
                        <p className="text-sm text-foreground leading-relaxed">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-primary mr-1.5">[{angle.type}]</span>
                          {angle.hook}
                        </p>
                        <CopyBtn text={angle.hook} label={`angle-pro-${i}`} copied={copied} onCopy={onCopy} locale={locale} />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {result.editingPlan?.length > 0 && (
              <AccordionItem value="editing" className="border border-border/50 rounded-2xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2"><Film className="h-4 w-4 text-primary" />{t("result.editingPlan", locale)}</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2.5">
                    {result.editingPlan.map((scene, i) => (
                      <div key={i} className="bg-muted/40 rounded-xl p-3 space-y-1">
                        <p className="text-xs font-bold text-primary">Scene {scene.scene}</p>
                        <p className="text-sm text-foreground"><span className="text-muted-foreground text-[10px] uppercase mr-1">Visual:</span>{scene.visual}</p>
                        {scene.onScreenText && <p className="text-sm text-foreground"><span className="text-muted-foreground text-[10px] uppercase mr-1">Text:</span>{scene.onScreenText}</p>}
                        {scene.mood && <p className="text-sm text-foreground"><span className="text-muted-foreground text-[10px] uppercase mr-1">Mood:</span>{scene.mood}</p>}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="images" className="border border-border/50 rounded-2xl overflow-hidden">
              <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                <span className="flex items-center gap-2"><Image className="h-4 w-4 text-primary" />{t("result.imagePrompts", locale)} ({result.imagePrompts.length})</span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  {result.imagePrompts.map((p, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 bg-muted/40 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="text-foreground font-semibold mr-1">{i + 1}.</span>{p}
                      </p>
                      <CopyBtn text={p} label={`pi-${i}`} copied={copied} onCopy={onCopy} locale={locale} />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {result.voiceStyle && (
              <AccordionItem value="voice" className="border border-border/50 rounded-2xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2"><Mic className="h-4 w-4 text-primary" />{t("result.voiceStyle", locale)}</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="bg-muted/40 rounded-xl p-3">
                    <p className="text-sm font-medium text-foreground">{result.voiceStyle}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

          </Accordion>
        </div>
      )}

      {/* Music Suggestions */}
      {result.music && result.music.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
            <Music className="h-3.5 w-3.5 text-primary" />{t("result.music", locale)}
          </h3>
          <div className="space-y-1.5">
            {result.music.map((m, i) => (
              <div key={i} className="bg-muted/40 rounded-2xl px-4 py-2.5 space-y-1">
                <p className="text-sm font-medium text-foreground">{typeof m === 'string' ? m : m.type}</p>
                {typeof m !== 'string' && (
                  <>
                    <p className="text-[10px] text-muted-foreground"><span className="font-bold uppercase tracking-widest mr-1">{t("result.music.source", locale)}:</span>{m.source}</p>
                    <p className="text-[10px] text-muted-foreground"><span className="font-bold uppercase tracking-widest mr-1">{t("result.music.why", locale)}:</span>{m.why}</p>
                  </>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Series Potential */}
      {result.seriesPotential && (
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />{t("result.seriesPotential", locale)}
          </h3>
          <div className="bg-muted/40 rounded-2xl px-4 py-3">
            <p className="text-sm text-foreground leading-relaxed">{result.seriesPotential}</p>
          </div>
        </section>
      )}

      {/* Viral Analysis */}
      {result.viralAnalysis && (
        <ViralAnalysisCard analysis={result.viralAnalysis} locale={locale} />
      )}

      {/* Thumbnail Ideas */}
      {result.thumbnails && result.thumbnails.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
            <Layout className="h-3.5 w-3.5 text-primary" />{t("result.thumbnails", locale)}
          </h3>
          {result.thumbnails.map((thumb, i) => (
            <div key={i} className="bg-muted/40 rounded-2xl p-4 space-y-2">
              <p className="text-xs font-bold text-primary">THUMBNAIL {i + 1}</p>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{t("result.thumbnail.image", locale)}</p>
                <p className="text-sm text-foreground leading-relaxed">{thumb.image}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{t("result.thumbnail.text", locale)}</p>
                <p className="text-sm font-bold text-foreground">{thumb.text}</p>
              </div>
              <CopyBtn text={`Image: ${thumb.image}\nText: ${thumb.text}`} label={`thumb-pro-${i}`} copied={copied} onCopy={onCopy} locale={locale} />
            </div>
          ))}
        </section>
      )}

      {/* Best Posting Time */}
      {(() => {
        const times: Record<string, { primary: string; backup: string; reason: string; reasonTr: string }> = {
          usa: { primary: "21:00", backup: "00:30", reason: "Best overlap for USA peak scrolling hours.", reasonTr: "ABD'nin en yoğun sosyal medya saatlerine denk gelir." },
          europe: { primary: "19:00", backup: "21:00", reason: "Peak evening hours across European time zones.", reasonTr: "Avrupa saat dilimlerinde akşam zirve saatleri." },
          latam: { primary: "22:00", backup: "00:00", reason: "Latin America evening peak overlapping with USA.", reasonTr: "Latin Amerika akşam zirvesi, ABD ile örtüşür." },
          global: { primary: "21:00", backup: "23:00", reason: "Optimal overlap across major global audiences.", reasonTr: "Büyük küresel kitlelerde en iyi örtüşme." },
          turkey: { primary: "20:00", backup: "22:00", reason: "Turkey evening prime time for social media.", reasonTr: "Türkiye'de sosyal medya için akşam zirve saati." },
        };
        const pt = times[targetAudience] || times.global;
        return (
          <section className="space-y-2.5">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-primary" />{t("result.postingTime", locale)}
            </h3>
            <div className="bg-muted/40 rounded-2xl p-4 space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("result.postingTime.primary", locale)}</p>
                <p className="text-sm font-bold text-foreground">{pt.primary}</p>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("result.postingTime.backup", locale)}</p>
                <p className="text-sm font-medium text-foreground">{pt.backup}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{t("result.postingTime.reason", locale)}</p>
                <p className="text-xs text-muted-foreground">{locale === "tr" ? pt.reasonTr : pt.reason}</p>
              </div>
            </div>
          </section>
        );
      })()}
    </div>
  );
});
