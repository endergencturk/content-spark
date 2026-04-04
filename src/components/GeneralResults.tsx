import React, { memo } from "react";
import { Copy, Trophy, Crown, Youtube, Hash, Image, Music, TrendingUp, Clock, Layout, Shuffle } from "lucide-react";

const safeArray = (val: any): string[] =>
  Array.isArray(val) ? val : typeof val === "string" ? val.split(",").map((s: string) => s.trim()).filter(Boolean) : [];
import { t, type Locale } from "@/lib/i18n";
import { UpsellBanner } from "@/components/UpsellBanner";
import { BlurredPreview } from "@/components/BlurredPreview";
import { ScriptEditor } from "@/components/ScriptEditor";
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

export interface ThumbnailIdea {
  image: string;
  text: string;
}

export interface TypedHook {
  type: string;
  hook: string;
}

export interface AngleVariation {
  type: string;
  hook: string;
}

export interface GeneralResult {
  hooks: TypedHook[] | string[];
  bestHook: string;
  script: string;
  editingPlan: EditingScene[];
  imagePrompts: string[];
  youtube: { title: string; description: string; tags: string[] };
  tiktok: { caption: string; hashtags: string[] };
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

export const GeneralResults = memo(function GeneralResults({
  result, copied, onCopy, locale = "en", targetAudience = "global", scriptLength = "30",
}: { result: GeneralResult; copied: string; onCopy: (k: string, t: string) => void; locale?: Locale; targetAudience?: string; scriptLength?: string }) {
  return (
    <div className="space-y-5">
      {/* ⭐ Best Hook */}
      {result.bestHook && (
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
      )}
      {/* Hooks */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">{t("result.hooks", locale)}</h3>
        {result.hooks.map((hook, i) => {
          const isTyped = typeof hook === "object" && hook !== null;
          const hookText = isTyped ? (hook as TypedHook).hook : (hook as string);
          const hookType = isTyped ? (hook as TypedHook).type : undefined;
          return (
            <div key={i} className="flex items-start justify-between gap-3 bg-muted/40 rounded-2xl p-4">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="text-primary font-bold mr-1.5">#{i + 1}</span>
                {hookType && <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mr-1.5">[{hookType}]</span>}
                {hookText}
              </p>
              <CopyBtn text={hookText} label={`hook-${i}`} copied={copied} onCopy={onCopy} locale={locale} />
            </div>
          );
        })}
        <UpsellBanner message={t("upsell.hooks", locale)} onUpgrade={() => {}} locale={locale} />
      </section>

      {/* Script */}
      <section className="space-y-2.5">
        <ScriptEditor initialScript={result.script} scriptLength={scriptLength} copied={copied} onCopy={onCopy} copyLabel="script" locale={locale} />
        <UpsellBanner message={t("upsell.script", locale)} onUpgrade={() => {}} locale={locale} />
      </section>

      {/* Editing Plan */}
      {result.editingPlan?.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">{t("result.editingPlan", locale)}</h3>
          {result.editingPlan.map((scene, i) => (
            <div key={i} className="bg-muted/40 rounded-2xl p-4 space-y-1">
              <p className="text-xs font-bold text-primary">Scene {scene.scene ?? i + 1}</p>
              <p className="text-sm text-foreground"><span className="text-muted-foreground text-[10px] uppercase mr-1">Visual:</span>{String(scene.visual || '').replace(/^Scene\s*\d*[:\-–—]?\s*/i, '')}</p>
              {scene.onScreenText && <p className="text-sm text-foreground"><span className="text-muted-foreground text-[10px] uppercase mr-1">Text:</span>{scene.onScreenText}</p>}
              {scene.mood && <p className="text-sm text-foreground"><span className="text-muted-foreground text-[10px] uppercase mr-1">Mood:</span>{scene.mood}</p>}
            </div>
          ))}
        </section>
      )}

      {/* SEO — YouTube */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Youtube className="h-3.5 w-3.5 text-primary" />{t("result.youtube", locale)}
          </h3>
          <CopyBtn text={`${result.youtube.title}\n${result.youtube.description}\n${safeArray(result.youtube.tags).join(", ")}`} label="yt-seo" copied={copied} onCopy={onCopy} locale={locale} />
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
              <CopyBtn text={safeArray(result.youtube.tags).join(", ")} label="yt-tags" copied={copied} onCopy={onCopy} locale={locale} customLabel={t("btn.copyTags", locale)} />
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
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Hash className="h-3.5 w-3.5 text-primary" />{t("result.tiktok", locale)}
          </h3>
          <CopyBtn text={`${result.tiktok.caption}\n${safeArray(result.tiktok.hashtags).join(" ")}`} label="tt-seo" copied={copied} onCopy={onCopy} locale={locale} />
        </div>
        <div className="bg-muted/40 rounded-2xl p-4 space-y-2">
          <p className="text-sm text-foreground leading-relaxed">{result.tiktok.caption}</p>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Hashtags</span>
            <CopyBtn text={safeArray(result.tiktok.hashtags).map(h => h.startsWith("#") ? h : `#${h}`).join(" ")} label="tt-hashtags" copied={copied} onCopy={onCopy} locale={locale} customLabel={t("btn.copyHashtags", locale)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {safeArray(result.tiktok.hashtags).map((ht, i) => (
              <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-lg">{ht}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Image Prompts */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">{t("result.imagePrompts", locale)}</h3>
        {result.imagePrompts.map((p, i) => (
          <div key={i} className="flex items-start justify-between gap-3 bg-muted/40 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-semibold mr-1">{i + 1}.</span>{p}
            </p>
            <CopyBtn text={p} label={`img-${i}`} copied={copied} onCopy={onCopy} locale={locale} />
          </div>
        ))}
      </section>

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
              <CopyBtn text={`Image: ${thumb.image}\nText: ${thumb.text}`} label={`thumb-${i}`} copied={copied} onCopy={onCopy} locale={locale} />
            </div>
          ))}
        </section>
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
      {result.viralAnalysis && (
        <ViralAnalysisCard analysis={result.viralAnalysis} locale={locale} />
      )}

      {/* Angle Variations */}
      {result.angleVariations && result.angleVariations.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
            <Shuffle className="h-3.5 w-3.5 text-primary" />{t("result.angleVariations", locale)}
          </h3>
          {result.angleVariations.map((angle, i) => (
            <div key={i} className="flex items-start justify-between gap-3 bg-muted/40 rounded-2xl p-4">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="text-[10px] uppercase tracking-widest font-bold text-primary mr-1.5">[{angle.type}]</span>
                {angle.hook}
              </p>
              <CopyBtn text={angle.hook} label={`angle-${i}`} copied={copied} onCopy={onCopy} locale={locale} />
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

      {/* Blurred Pro previews */}
      <div className="space-y-5 pt-3">
        <div className="flex items-center gap-2 px-1">
          <Crown className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-primary">{t("result.proAvailable", locale)}</p>
        </div>
        <BlurredPreview
          title={t("blurred.hookVariations", locale)}
          previewLines={[
            "V1: " + (typeof result.hooks[0] === "object" ? (result.hooks[0] as TypedHook).hook?.slice(0, 50) : (result.hooks[0] as string)?.slice(0, 50) || "What if everything you knew was wrong?") + "…",
            "V2: A completely different angle that hooks in 0.5 seconds",
            "V3: The emotional rewrite that keeps viewers watching",
          ]}
          onUpgrade={() => {}}
          locale={locale}
        />
        <BlurredPreview
          title={t("blurred.editingPlan", locale)}
          previewLines={[
            "Scene 1 (0-3s): Quick zoom with trending audio drop",
            "Scene 2 (3-8s): B-roll montage with text overlay",
            "Scene 3 (8-15s): Direct-to-camera with cinematic shift",
          ]}
          onUpgrade={() => {}}
          locale={locale}
        />
        <BlurredPreview
          title={t("blurred.voiceStyle", locale)}
          previewLines={["Dark & slow — dramatic pauses, low energy open"]}
          onUpgrade={() => {}}
          locale={locale}
        />
      </div>

      {/* Bottom CTA */}
      <div className="text-center py-4 space-y-2">
        <p className="text-xs text-muted-foreground">{t("upsell.bottom", locale)}</p>
      </div>
    </div>
  );
});
