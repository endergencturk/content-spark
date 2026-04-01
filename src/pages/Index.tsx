import React, { useState, useCallback, memo, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Copy, Loader2, Sparkles, FileText, MessageSquare, RefreshCw,
  Image, Clock, Flame, Crown, Hash, Youtube, Mic, Film,
  CalendarClock, Target, Trophy, Zap, Instagram, ChevronDown,
  Package, Lock, TrendingUp, History, Shuffle, Lightbulb,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useSettings } from "@/contexts/SettingsContext";
import { t, type Locale } from "@/lib/i18n";
import { UpsellBanner } from "@/components/UpsellBanner";
import { BlurredPreview } from "@/components/BlurredPreview";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { getTopicSuggestions, getRandomTopic } from "@/lib/topicSuggestions";

// ── Constants ───────────────────────────────────────────────────────

const FREE_STYLES = [
  { value: "viral", label: "Viral" },
  { value: "educational", label: "Educational" },
  { value: "story", label: "Story" },
];

const PRO_STYLES = [
  { value: "high-retention", label: "High Retention" },
  { value: "emotional", label: "Emotional" },
  { value: "suspense", label: "Suspense / Mystery" },
  { value: "controversial", label: "Controversial" },
  { value: "curiosity", label: "Curiosity Driven" },
];

const FREE_CONTENT_TYPES = [
  { value: "story", label: "Story" },
  { value: "educational", label: "Educational" },
  { value: "entertainment", label: "Entertainment" },
];

const PRO_CONTENT_TYPES = [
  { value: "selling", label: "Selling" },
  { value: "personal-brand", label: "Personal Brand" },
  { value: "hooks-only", label: "Hooks Only" },
  { value: "script-only", label: "Script Only" },
];

const FREE_GOALS = [
  { value: "viral", label: "Go viral" },
  { value: "followers", label: "Get followers" },
];

const PRO_GOALS = [
  { value: "sell", label: "Sell product" },
  { value: "brand", label: "Build brand" },
  { value: "leads", label: "Lead generation" },
  { value: "storytelling", label: "Advanced storytelling" },
];

const PLATFORM_OPTIONS = [
  { value: "tiktok", label: "TikTok", icon: Hash },
  { value: "youtube-shorts", label: "Shorts", icon: Youtube },
  { value: "instagram-reels", label: "Reels", icon: Instagram },
];

const LENGTH_OPTIONS = ["15", "30", "60"];

const DEPTH_OPTIONS = [
  { value: "concise", label: "Concise" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" },
];

type Mode = "general" | "pro";

// ── Types ───────────────────────────────────────────────────────────

interface SeoPack {
  youtube: { title: string; description: string; tags: string[] };
  tiktok: { caption: string; hashtags: string[] };
}

interface EditingScene {
  scene: number;
  visual: string;
  onScreenText?: string;
  mood?: string;
}

interface ViralScoreCategory {
  name: string;
  score: number;
}

interface ViralAnalysis {
  score: number;
  categories: ViralScoreCategory[];
  strengths: string[];
  weaknesses: string[];
}

interface GeneralResult {
  hooks: string[];
  bestHook: string;
  script: string;
  editingPlan: EditingScene[];
  imagePrompts: string[];
  youtube: SeoPack["youtube"];
  tiktok: SeoPack["tiktok"];
  viralAnalysis: ViralAnalysis;
}

interface ProResult {
  bestHook: string;
  hookVariations: string[];
  script: string;
  editingPlan: EditingScene[];
  voiceStyle: string;
  postingStrategy: { bestTime: string; platformTip: string };
  imagePrompts: string[];
  youtube: SeoPack["youtube"];
  tiktok: SeoPack["tiktok"];
  instagramCaption?: string;
  viralAnalysis: ViralAnalysis;
}

// ── Micro components ────────────────────────────────────────────────

const CopyBtn = memo(function CopyBtn({
  text, label, copied, onCopy, locale = "en",
}: { text: string; label: string; copied: string; onCopy: (k: string, t: string) => void; locale?: Locale }) {
  return (
    <button
      className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => onCopy(label, text)}
    >
      <Copy className="h-3 w-3 inline mr-1" />
      {copied === label ? t("btn.copied", locale) : t("btn.copy", locale)}
    </button>
  );
});

const Pill = memo(function Pill({
  selected, onClick, children, locked, icon,
}: { selected: boolean; onClick: () => void; children: React.ReactNode; locked?: boolean; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
        locked
          ? "bg-muted/30 text-muted-foreground/50 border border-dashed border-border/50 cursor-not-allowed"
          : selected
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-muted/60 text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
      {locked && <Lock className="h-3 w-3 ml-0.5" />}
    </button>
  );
});

// (ScriptBlock removed — scripts are now plain text)

// ── Viral Analysis Card ─────────────────────────────────────────────

const CATEGORY_KEY_MAP: Record<string, string> = {
  hookStrength: "viral.hookStrength",
  curiosityGap: "viral.curiosityGap",
  emotionalTrigger: "viral.emotionalTrigger",
  clarity: "viral.clarity",
  rewatchPotential: "viral.rewatchPotential",
  commentPotential: "viral.commentPotential",
  platformFit: "viral.platformFit",
};

function scoreColor(score: number): string {
  if (score >= 8) return "text-green-500";
  if (score >= 6) return "text-primary";
  if (score >= 4) return "text-yellow-500";
  return "text-destructive";
}

const ViralAnalysisCard = memo(function ViralAnalysisCard({
  analysis, locale = "en",
}: { analysis: ViralAnalysis; locale?: Locale }) {
  return (
    <section className="space-y-2.5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
        <TrendingUp className="h-3.5 w-3.5 text-primary" />{t("result.viralAnalysis", locale)}
      </h3>
      <div className="bg-gradient-to-br from-primary/5 to-transparent border border-primary/15 rounded-2xl p-4 space-y-4">
        {/* Overall score */}
        <div className="flex items-center gap-2">
          <span className={`text-2xl font-extrabold ${scoreColor(analysis.score)}`}>{analysis.score}</span>
          <span className="text-sm text-muted-foreground font-medium">/ 10</span>
        </div>

        {/* Category subscores */}
        {analysis.categories?.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {analysis.categories.map((cat, i) => (
              <div key={i} className="flex items-center justify-between bg-muted/40 rounded-xl px-3 py-2">
                <span className="text-[11px] text-muted-foreground">
                  {t(CATEGORY_KEY_MAP[cat.name] || cat.name, locale)}
                </span>
                <span className={`text-xs font-bold ${scoreColor(cat.score)}`}>{cat.score}</span>
              </div>
            ))}
          </div>
        )}

        {/* Strengths */}
        {analysis.strengths?.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-green-500">{t("viral.strengths", locale)}</p>
            {analysis.strengths.map((s, i) => (
              <p key={i} className="text-sm text-foreground leading-relaxed flex items-start gap-2">
                <span className="text-green-500 mt-0.5">✓</span>{s}
              </p>
            ))}
          </div>
        )}

        {/* Weaknesses */}
        {analysis.weaknesses?.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-yellow-500">{t("viral.weaknesses", locale)}</p>
            {analysis.weaknesses.map((w, i) => (
              <p key={i} className="text-sm text-foreground leading-relaxed flex items-start gap-2">
                <span className="text-yellow-500 mt-0.5">△</span>{w}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
});

// ── Usage limit banner ──────────────────────────────────────────────

const UsageBanner = memo(function UsageBanner({
  remaining, isAtLimit, nextRefillLabel, locale = "en",
}: { remaining: number; isAtLimit: boolean; nextRefillLabel: string; locale?: Locale }) {
  return (
    <div className={`rounded-2xl p-4 flex items-start gap-3 ${
      isAtLimit
        ? "bg-destructive/10 border border-destructive/20"
        : "bg-muted/60 border border-border/50"
    }`}>
      <div className={`shrink-0 h-8 w-8 rounded-xl flex items-center justify-center ${
        isAtLimit ? "bg-destructive/15" : "bg-primary/10"
      }`}>
        {isAtLimit
          ? <Lock className="h-4 w-4 text-destructive" />
          : <Zap className="h-4 w-4 text-primary" />
        }
      </div>
      <div className="flex-1 space-y-1.5">
        <p className="text-sm font-semibold text-foreground">
          {isAtLimit
            ? t("usage.noCredits", locale)
            : t("usage.remaining", locale).replace("{count}", String(remaining)).replace("{s}", remaining === 1 ? "" : "s")}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isAtLimit
            ? t("usage.upgradeMsg", locale)
            : nextRefillLabel
              ? t("usage.nextRefill", locale).replace("{time}", nextRefillLabel)
              : t("usage.refillInfo", locale)}
        </p>
        {isAtLimit && (
          <p className="text-xs text-muted-foreground mt-1">
            {t("usage.switchPro", locale)}
          </p>
        )}
      </div>
    </div>
  );
});

// ── General Results ─────────────────────────────────────────────────

const GeneralResults = memo(function GeneralResults({
  result, copied, onCopy, locale = "en",
}: { result: GeneralResult; copied: string; onCopy: (k: string, t: string) => void; locale?: Locale }) {
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
        {result.hooks.map((hook, i) => (
          <div key={i} className="flex items-start justify-between gap-3 bg-muted/40 rounded-2xl p-4">
            <p className="text-sm text-foreground leading-relaxed">
              <span className="text-primary font-bold mr-1.5">#{i + 1}</span>{hook}
            </p>
            <CopyBtn text={hook} label={`hook-${i}`} copied={copied} onCopy={onCopy} locale={locale} />
          </div>
        ))}
        <UpsellBanner
          message={t("upsell.hooks", locale)}
          onUpgrade={() => {}}
          locale={locale}
        />
      </section>

      {/* Script */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("result.script", locale)}</h3>
          <CopyBtn text={result.script} label="script" copied={copied} onCopy={onCopy} locale={locale} />
        </div>
        <div className="bg-muted/40 rounded-2xl p-4">
          {result.script.split("\n").map((line, i) => (
            <p key={i} className="text-sm text-foreground leading-loose">{line || <br />}</p>
          ))}
        </div>
        <UpsellBanner
          message={t("upsell.script", locale)}
          onUpgrade={() => {}}
          locale={locale}
        />
      </section>

      {/* Editing Plan */}
      {result.editingPlan?.length > 0 && (
        <section className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">{t("result.editingPlan", locale)}</h3>
          {result.editingPlan.map((scene, i) => (
            <div key={i} className="bg-muted/40 rounded-2xl p-4 space-y-1">
              <p className="text-xs font-bold text-primary">Scene {scene.scene}</p>
              <p className="text-sm text-foreground"><span className="text-muted-foreground text-[10px] uppercase mr-1">Visual:</span>{scene.visual}</p>
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
          <CopyBtn text={`${result.youtube.title}\n${result.youtube.description}\n${result.youtube.tags.join(", ")}`} label="yt-seo" copied={copied} onCopy={onCopy} locale={locale} />
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
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{t("result.tags", locale)}</p>
            <div className="flex flex-wrap gap-1.5">
              {result.youtube.tags.map((tag, i) => (
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
          <CopyBtn text={`${result.tiktok.caption}\n${result.tiktok.hashtags.join(" ")}`} label="tt-seo" copied={copied} onCopy={onCopy} locale={locale} />
        </div>
        <div className="bg-muted/40 rounded-2xl p-4 space-y-2">
          <p className="text-sm text-foreground leading-relaxed">{result.tiktok.caption}</p>
          <div className="flex flex-wrap gap-1.5">
            {result.tiktok.hashtags.map((ht, i) => (
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

      {/* Viral Analysis */}
      {result.viralAnalysis && (
        <ViralAnalysisCard analysis={result.viralAnalysis} locale={locale} />
      )}

      {/* Blurred Pro previews */}
      <div className="space-y-5 pt-3">
        <div className="flex items-center gap-2 px-1">
          <Crown className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-primary">{t("result.proAvailable", locale)}</p>
        </div>

        <BlurredPreview
          title={t("blurred.hookVariations", locale)}
          previewLines={[
            "V1: " + (result.hooks[0]?.slice(0, 50) || "What if everything you knew was wrong?") + "…",
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

        <BlurredPreview
          title={t("blurred.postingStrategy", locale)}
          previewLines={[
            "Best time: Tuesday 7-9 PM EST",
            "Platform tip: Use trending sounds within first 2 hours",
          ]}
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

// ── Pro Results ─────────────────────────────────────────────────────

const ProResults = memo(function ProResults({
  result, platforms, copied, onCopy, locale = "en",
}: { result: ProResult; platforms: string[]; copied: string; onCopy: (k: string, t: string) => void; locale?: Locale }) {
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

      {/* Script — plain voiceover */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" />{t("result.voiceover", locale)}
          </h3>
          <CopyBtn text={result.script} label="pro-script" copied={copied} onCopy={onCopy} locale={locale} />
        </div>
        <div className="bg-muted/40 rounded-2xl p-4">
          {result.script.split("\n").map((line, i) => (
            <p key={i} className="text-sm text-foreground leading-loose">{line || <br />}</p>
          ))}
        </div>
      </section>

      {/* SEO — YouTube */}
      <section className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <Youtube className="h-3.5 w-3.5 text-primary" />{t("result.youtube", locale)}
          </h3>
          <CopyBtn text={`${result.youtube.title}\n${result.youtube.description}\n${result.youtube.tags.join(", ")}`} label="yt" copied={copied} onCopy={onCopy} locale={locale} />
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
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{t("result.tags", locale)}</p>
            <div className="flex flex-wrap gap-1.5">
              {result.youtube.tags.map((tag, i) => (
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
          <CopyBtn text={`${result.tiktok.caption}\n${result.tiktok.hashtags.join(" ")}`} label="tt" copied={copied} onCopy={onCopy} locale={locale} />
        </div>
        <div className="bg-muted/40 rounded-2xl p-4 space-y-2">
          <p className="text-sm text-foreground leading-relaxed">{result.tiktok.caption}</p>
          <div className="flex flex-wrap gap-1.5">
            {result.tiktok.hashtags.map((ht, i) => (
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

            {result.postingStrategy && (
              <AccordionItem value="posting" className="border border-border/50 rounded-2xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" />{t("result.postingStrategy", locale)}</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    <div className="bg-muted/40 rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{t("result.bestTime", locale)}</p>
                      <p className="text-sm font-medium text-foreground">{result.postingStrategy.bestTime}</p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">{t("result.platformTip", locale)}</p>
                      <p className="text-sm text-foreground">{result.postingStrategy.platformTip}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      )}
      {/* Viral Analysis */}
      {result.viralAnalysis && (
        <ViralAnalysisCard analysis={result.viralAnalysis} locale={locale} />
      )}
    </div>
  );
});

// ── Loading ─────────────────────────────────────────────────────────

const LoadingState = memo(function LoadingState({ mode, locale = "en" }: { mode: Mode; locale?: Locale }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-4">
      <div className="relative h-12 w-12">
        <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
        <div className="relative h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-1">
        <p className="text-sm font-semibold text-foreground">
          {mode === "pro" ? t("loading.pro", locale) : t("loading.general", locale)}
        </p>
        <p className="text-xs text-muted-foreground">{t("loading.time", locale)}</p>
      </div>
    </div>
  );
});

// ── Main page ───────────────────────────────────────────────────────

export default function Index() {
  const { settings } = useSettings();
  const locale = settings.language;
  const { remaining, isAtLimit, increment, nextRefillLabel } = useUsageLimit();

  // Device ID for history (anonymous, no auth)
  const [deviceId] = useState<string>(() => {
    const key = "viralengine-device-id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  });

  const [mode, setMode] = useState<Mode>("general");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("viral");
  const [platform, setPlatform] = useState(settings.defaultPlatform);
  const [platforms, setPlatforms] = useState<string[]>(["tiktok"]);
  const [contentType, setContentType] = useState("story");
  const [scriptLength, setScriptLength] = useState(settings.defaultScriptLength);
  const [goal, setGoal] = useState("viral");
  const [hookIntensity, setHookIntensity] = useState(1);
  const [imagePromptCount, setImagePromptCount] = useState(3);
  const [outputDepth, setOutputDepth] = useState("standard");
  const [customDescription, setCustomDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [generalResult, setGeneralResult] = useState<GeneralResult | null>(null);
  const [proResult, setProResult] = useState<ProResult | null>(null);

  // Topic suggestions
  const isProMode = mode === "pro";
  const suggestCount = isProMode ? 6 : 3;
  const [suggestions, setSuggestions] = useState(() => getTopicSuggestions(suggestCount, contentType, style));

  // Refresh suggestions when mode/content/style changes
  useEffect(() => {
    setSuggestions(getTopicSuggestions(isProMode ? 6 : 3, contentType, style));
  }, [isProMode, contentType, style]);

  const togglePlatform = useCallback((value: string) => {
    setPlatforms((prev) =>
      prev.includes(value)
        ? prev.length > 1 ? prev.filter((p) => p !== value) : prev
        : [...prev, value]
    );
  }, []);

  const copyToClipboard = useCallback(async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success(t("toast.copied", locale));
    setTimeout(() => setCopied(""), 1200);
  }, [locale]);

  const generateContent = useCallback(async () => {
    if (!topic.trim()) return;

    // Free mode: check credits
    if (!isProMode && isAtLimit) {
      toast.error(t("usage.noCredits", locale));
      return;
    }

    setLoading(true);
    try {
      const body = isProMode
        ? {
            mode: "pro", topic, platforms, contentType, style, scriptLength, goal, hookIntensity,
            imageFormat: "9:16", imagePromptCount, outputDepth,
            customDescription: customDescription.trim() || undefined,
            language: locale,
          }
        : {
            mode: "general", topic, platform, contentType, style, scriptLength, goal, hookIntensity,
            imageFormat: "9:16", outputStyle: settings.outputStyle,
            language: locale,
          };

      const { data, error } = await supabase.functions.invoke("generate-content", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (isProMode) {
        setProResult(data as ProResult);
        setGeneralResult(null);
      } else {
        setGeneralResult(data as GeneralResult);
        setProResult(null);
        increment(); // only deduct credit in Free mode
      }

      // Auto-save to history
      try {
        await supabase.from("generations").insert({
          device_id: deviceId,
          topic: topic.trim(),
          platforms: isProMode ? platforms : [platform],
          duration: scriptLength,
          style,
          content_type: contentType,
          goal,
          plan_type: isProMode ? "pro" : "free",
          output_json: data,
          language: locale,
        } as any);
        toast.success(t("history.saved", locale), { duration: 2000 });
      } catch (saveErr) {
        console.warn("Failed to save to history:", saveErr);
      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      const msg = error?.message || "";
      if (/temporarily busy|try again/i.test(msg)) {
        toast.error(t("toast.error.busy", locale));
      } else {
        toast.error(msg || t("toast.error.generic", locale));
      }
    } finally {
      setLoading(false);
    }
  }, [isProMode, topic, platform, platforms, contentType, style, scriptLength, goal, hookIntensity, imagePromptCount, outputDepth, customDescription, settings.outputStyle, isAtLimit, increment, locale, deviceId]);

  // History reopen handler
  const handleHistoryReopen = useCallback((item: any) => {
    setTopic(item.topic);
    if (item.plan_type === "pro") {
      setMode("pro");
      setPlatforms(item.platforms || ["tiktok"]);
      setProResult(item.output_json as ProResult);
      setGeneralResult(null);
    } else {
      setMode("general");
      setPlatform(item.platforms?.[0] || "tiktok");
      setGeneralResult(item.output_json as GeneralResult);
      setProResult(null);
    }
    setStyle(item.style || "viral");
    setContentType(item.content_type || "story");
    setScriptLength(item.duration || "30");
    setGoal(item.goal || "viral");
  }, []);

  const hasResults = isProMode ? proResult !== null : generalResult !== null;

  const copyAll = useCallback(() => {
    let all = "";
    if (!isProMode && generalResult) {
      all = [
        `⭐ BEST HOOK:\n${generalResult.bestHook}`,
        generalResult.hooks.map((h, i) => `Hook ${i + 1}: ${h}`).join("\n"),
        `Script:\n${generalResult.script}`,
        `YouTube:\n${generalResult.youtube.title}\n${generalResult.youtube.description}\nTags: ${generalResult.youtube.tags.join(", ")}`,
        `TikTok:\n${generalResult.tiktok.caption}\n${generalResult.tiktok.hashtags.join(" ")}`,
        `Image Prompts:\n${generalResult.imagePrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
        generalResult.viralAnalysis ? `📊 VIRAL SCORE: ${generalResult.viralAnalysis.score}/10\n${(generalResult.viralAnalysis.strengths || []).map(r => `✓ ${r}`).join("\n")}\n${(generalResult.viralAnalysis.weaknesses || []).map(r => `△ ${r}`).join("\n")}` : "",
      ].filter(Boolean).join("\n\n");
    } else if (isProMode && proResult) {
      all = [
        `⭐ BEST HOOK:\n${proResult.bestHook}`,
        `📝 SCRIPT:\n${proResult.script}`,
        `YouTube:\n${proResult.youtube.title}\n${proResult.youtube.description}\nTags: ${proResult.youtube.tags.join(", ")}`,
        `TikTok:\n${proResult.tiktok.caption}\n${proResult.tiktok.hashtags.join(" ")}`,
        proResult.instagramCaption ? `Instagram: ${proResult.instagramCaption}` : "",
        proResult.hookVariations?.length ? `🎯 VARIATIONS:\n${proResult.hookVariations.map((v, i) => `V${i + 1}: ${v}`).join("\n")}` : "",
        proResult.voiceStyle ? `🎙️ Voice: ${proResult.voiceStyle}` : "",
        proResult.postingStrategy ? `📅 Post: ${proResult.postingStrategy.bestTime} — ${proResult.postingStrategy.platformTip}` : "",
        `🖼️ Images:\n${proResult.imagePrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
        proResult.viralAnalysis ? `📊 VIRAL SCORE: ${proResult.viralAnalysis.score}/10\n${(proResult.viralAnalysis.strengths || []).map(r => `✓ ${r}`).join("\n")}\n${(proResult.viralAnalysis.weaknesses || []).map(r => `△ ${r}`).join("\n")}` : "",
      ].filter(Boolean).join("\n\n");
    }
    copyToClipboard("all", all);
  }, [isProMode, generalResult, proResult, copyToClipboard]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="py-8 px-4">
        <div className="mx-auto max-w-lg space-y-7">

          {/* HEADER */}
          <div className="text-center space-y-2 pt-2">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {t("app.title", locale)}
              </h1>
              <HistoryDrawer
                deviceId={deviceId}
                isPro={isProMode}
                locale={locale}
                onReuse={(t) => setTopic(t)}
                onReopen={handleHistoryReopen}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              {t("app.subtitle", locale)}
            </p>
          </div>

          {/* MODE TOGGLE */}
          <div className="flex gap-2 p-1 rounded-2xl bg-muted/60">
            <button
              onClick={() => setMode("general")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                !isProMode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Zap className="h-4 w-4" />{t("mode.free", locale)}
            </button>
            <button
              onClick={() => setMode("pro")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isProMode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Crown className="h-4 w-4" />{t("mode.pro", locale)}
            </button>
          </div>

          {/* USAGE BANNER (Free mode only) */}
          {!isProMode && (
            <UsageBanner remaining={remaining} isAtLimit={isAtLimit} nextRefillLabel={nextRefillLabel} locale={locale} />
          )}

          {/* INPUT AREA */}
          <div className="space-y-5">

            {/* 1. Platform */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.platform", locale)}</p>
              <div className="flex gap-2">
                {PLATFORM_OPTIONS.map((o) => {
                  const sel = isProMode ? platforms.includes(o.value) : platform === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => isProMode ? togglePlatform(o.value) : setPlatform(o.value)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all ${
                        sel
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <o.icon className="h-4 w-4" />
                      {o.label.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
              {isProMode && <p className="text-[10px] text-muted-foreground text-center">{t("selector.platform.multi", locale)}</p>}
            </div>

            {/* 2. Topic */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("input.topic", locale)}</p>

              {/* Topic Suggestions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/70 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />{t("topics.suggestions", locale)}
                  </p>
                  <button
                    onClick={() => {
                      const random = getRandomTopic(contentType, style);
                      setTopic(random);
                    }}
                    className="text-[10px] font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                  >
                    <Shuffle className="h-3 w-3" />{t("topics.surprise", locale)}
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setTopic(s.topic)}
                      className="text-[11px] px-2.5 py-1.5 rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors truncate max-w-[200px]"
                    >
                      {s.topic}
                    </button>
                  ))}
                </div>
                {!isProMode && (
                  <p className="text-[10px] text-muted-foreground/50">{t("topics.more", locale)}</p>
                )}
              </div>

              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={t("input.topic.placeholder", locale)}
                className="h-12 rounded-2xl text-base border-border/60 bg-muted/30 px-4"
                onKeyDown={(e) => e.key === "Enter" && generateContent()}
              />
            </div>

            {/* 3. Length */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.length", locale)}</p>
              <div className="flex gap-2">
                {LENGTH_OPTIONS.map((len) => {
                  const isLocked = !isProMode && len === "60";
                  return (
                    <Pill
                      key={len}
                      selected={scriptLength === len}
                      locked={isLocked}
                      onClick={() => {
                        if (!isLocked) setScriptLength(len);
                      }}
                    >
                      {len}s
                    </Pill>
                  );
                })}
              </div>
            </div>

            {/* 4. Style */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.style", locale)}</p>
              <div className="flex gap-2 flex-wrap">
                {FREE_STYLES.map((s) => (
                  <Pill key={s.value} selected={style === s.value} onClick={() => setStyle(s.value)}>
                    {s.label}
                  </Pill>
                ))}
                {PRO_STYLES.map((s) => (
                  <Pill
                    key={s.value}
                    selected={style === s.value}
                    locked={!isProMode}
                    onClick={() => {
                      if (isProMode) setStyle(s.value);
                    }}
                  >
                    {s.label}
                  </Pill>
                ))}
              </div>
            </div>

            {/* 5. Content Type */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.content", locale)}</p>
              <div className="flex gap-2 flex-wrap">
                {FREE_CONTENT_TYPES.map((ct) => (
                  <Pill key={ct.value} selected={contentType === ct.value} onClick={() => setContentType(ct.value)}>
                    {ct.label}
                  </Pill>
                ))}
                {PRO_CONTENT_TYPES.map((ct) => (
                  <Pill
                    key={ct.value}
                    selected={contentType === ct.value}
                    locked={!isProMode}
                    onClick={() => {
                      if (isProMode) setContentType(ct.value);
                    }}
                  >
                    {ct.label}
                  </Pill>
                ))}
              </div>
            </div>

            {/* 6. Goal */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.goal", locale)}</p>
              <div className="flex gap-2 flex-wrap">
                {FREE_GOALS.map((g) => (
                  <Pill key={g.value} selected={goal === g.value} onClick={() => setGoal(g.value)}>
                    {g.label}
                  </Pill>
                ))}
                {PRO_GOALS.map((g) => (
                  <Pill
                    key={g.value}
                    selected={goal === g.value}
                    locked={!isProMode}
                    onClick={() => {
                      if (isProMode) setGoal(g.value);
                    }}
                  >
                    {g.label}
                  </Pill>
                ))}
              </div>
            </div>

            {/* 7. Hook Intensity */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1">
                <Flame className="h-3 w-3" />{t("selector.hookIntensity", locale)}
              </p>
              <div className="flex gap-2">
                {[t("hook.low", locale), t("hook.medium", locale), t("hook.high", locale)].map((label, lvl) => {
                  const isLocked = !isProMode && lvl === 2;
                  return (
                    <button
                      key={lvl}
                      onClick={() => {
                        if (!isLocked) setHookIntensity(lvl);
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                        isLocked
                          ? "bg-muted/30 text-muted-foreground/50 border border-dashed border-border/50 cursor-not-allowed"
                          : hookIntensity === lvl
                            ? "bg-primary/10 text-primary border border-primary/30"
                            : "bg-muted/60 text-muted-foreground border border-transparent"
                      }`}
                    >
                      {label}{isLocked && " 🔒"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 8. Image Prompts */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1">
                <Image className="h-3 w-3" />{t("selector.imagePrompts", locale)}
                {!isProMode && <span className="text-muted-foreground/60 ml-1">{t("selector.imagePrompts.fixed", locale)}</span>}
              </p>
              {isProMode ? (
                <div className="space-y-1.5">
                  <Slider
                    value={[imagePromptCount]}
                    onValueChange={(v) => setImagePromptCount(v[0])}
                    min={1}
                    max={10}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground text-center">{imagePromptCount} prompt{imagePromptCount !== 1 ? "s" : ""}</p>
                </div>
              ) : (
                <div className="w-full py-2 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
                  <Lock className="h-3 w-3" />
                  {t("selector.imagePrompts.slider", locale)}
                </div>
              )}
            </div>

            {/* 9. Depth */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.depth", locale)}</p>
              <div className="flex gap-2">
                {DEPTH_OPTIONS.map((d) => {
                  const isLocked = d.value === "detailed" && !isProMode;
                  return (
                    <Pill
                      key={d.value}
                      selected={outputDepth === d.value}
                      locked={isLocked}
                      onClick={() => {
                        if (!isLocked) setOutputDepth(d.value);
                      }}
                    >
                      {t(`selector.depth.${d.value}`, locale)}
                    </Pill>
                  );
                })}
              </div>
            </div>

            {/* 10. Custom description (Pro mode only) */}
            {isProMode && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  {t("selector.customDesc", locale)} <span className="text-muted-foreground/60">{t("selector.customDesc.optional", locale)}</span>
                </p>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder={t("selector.customDesc.placeholder", locale)}
                  rows={3}
                  className="w-full rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            )}
            {!isProMode && (
              <div className="w-full py-2.5 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
                <Lock className="h-3 w-3" />
                {t("selector.customDesc.locked", locale)}
              </div>
            )}

            {/* Generate */}
            <Button
              className="w-full h-13 text-base rounded-2xl font-bold"
              disabled={!topic.trim() || loading || (!isProMode && isAtLimit)}
              onClick={generateContent}
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" />{t("btn.generating", locale)}</>
              ) : !isProMode && isAtLimit ? (
                <><Lock className="h-5 w-5" />{t("btn.noCredits", locale)}</>
              ) : (
                <><Sparkles className="h-5 w-5" />{isProMode ? t("btn.generatePro", locale) : t("btn.generate", locale)}</>
              )}
            </Button>

            {!isProMode && !isAtLimit && (
              <p className="text-center text-[11px] text-muted-foreground">
                {t("usage.remaining", locale).replace("{count}", String(remaining)).replace("{s}", remaining === 1 ? "" : "s")}
                {nextRefillLabel ? ` · ${t("usage.nextRefill", locale).replace("{time}", nextRefillLabel)}` : ""}
              </p>
            )}
          </div>

          {/* ACTION BAR */}
          {hasResults && !loading && (
            <div className="flex justify-center gap-3">
              <button onClick={generateContent} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw className="h-3 w-3" />{t("btn.regenerate", locale)}
              </button>
              <button onClick={copyAll} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                <Copy className="h-3 w-3" />{copied === "all" ? t("btn.copied", locale) : t("btn.copyAll", locale)}
              </button>
            </div>
          )}

          {loading && <LoadingState mode={mode} locale={locale} />}

          {!loading && !isProMode && generalResult && (
            <GeneralResults result={generalResult} copied={copied} onCopy={copyToClipboard} locale={locale} />
          )}
          {!loading && isProMode && proResult && (
            <ProResults result={proResult} platforms={platforms} copied={copied} onCopy={copyToClipboard} locale={locale} />
          )}

          {!hasResults && !loading && (
            <div className="text-center py-16 space-y-2">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t("empty.text", locale)}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
