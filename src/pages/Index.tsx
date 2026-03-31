import React, { useState, useCallback, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Copy, Loader2, Sparkles, FileText, MessageSquare, RefreshCw,
  Image, Clock, Flame, Crown, Hash, Youtube, Mic, Film,
  CalendarClock, Target, Trophy, Zap, Instagram, ChevronDown,
  Package, Lock, AlertTriangle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useSettings } from "@/contexts/SettingsContext";
import { t } from "@/lib/i18n";
import { UpgradeDialog } from "@/components/UpgradeDialog";
import { UpsellBanner } from "@/components/UpsellBanner";
import { BlurredPreview } from "@/components/BlurredPreview";
import { useUsageLimit } from "@/hooks/useUsageLimit";

// ── Constants ───────────────────────────────────────────────────────

const STYLE_OPTIONS = [
  { value: "viral", label: "Viral" },
  { value: "dark", label: "Dark" },
  { value: "educational", label: "Educational" },
  { value: "storytelling", label: "Story" },
  { value: "aggressive", label: "Aggressive" },
];

const PLATFORM_OPTIONS = [
  { value: "tiktok", label: "TikTok", icon: Hash },
  { value: "youtube-shorts", label: "Shorts", icon: Youtube },
  { value: "instagram-reels", label: "Reels", icon: Instagram },
];

const CONTENT_TYPE_OPTIONS = [
  { value: "story", label: "Story" },
  { value: "educational", label: "Edu" },
  { value: "selling", label: "Selling" },
  { value: "entertainment", label: "Fun" },
];

const GOAL_OPTIONS = [
  { value: "viral", label: "Go viral" },
  { value: "followers", label: "Followers" },
  { value: "sell", label: "Sell" },
  { value: "story", label: "Story" },
];

const LENGTH_OPTIONS_FREE = ["15", "30", "60"];
const LENGTH_OPTIONS_PRO = ["15", "30", "60", "90"];
const IMAGE_COUNT_OPTIONS = ["2", "4", "6"];
const DEPTH_OPTIONS = [
  { value: "concise", label: "Concise" },
  { value: "standard", label: "Standard" },
  { value: "detailed", label: "Detailed" },
];

type Mode = "general" | "pro";

// ── Types ───────────────────────────────────────────────────────────

interface GeneralResult {
  hooks: string[];
  script: string;
  caption: string;
  imagePrompts: string[];
}

interface StructuredScript {
  hook: string;
  beat1: string;
  beat2: string;
  beat3: string;
  cta: string;
}

interface EditingScene {
  scene: number;
  visual: string;
  audio: string;
  duration: string;
}

interface ProResult {
  bestHook: string;
  hookVariations: string[];
  script: StructuredScript;
  editingPlan: EditingScene[];
  voiceStyle: string;
  postingStrategy: { bestTime: string; platformTip: string };
  imagePrompts: string[];
  tiktokCaption?: string;
  youtubeTitle?: string;
  youtubeDescription?: string;
  instagramCaption?: string;
}

// ── Micro components ────────────────────────────────────────────────

const CopyBtn = memo(function CopyBtn({
  text, label, copied, onCopy,
}: { text: string; label: string; copied: string; onCopy: (k: string, t: string) => void }) {
  return (
    <button
      className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
      onClick={() => onCopy(label, text)}
    >
      <Copy className="h-3 w-3 inline mr-1" />
      {copied === label ? "Copied" : "Copy"}
    </button>
  );
});

const Pill = memo(function Pill({
  selected, onClick, children,
}: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        selected
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
});

const MiniSelect = memo(function MiniSelect({
  label, value, options, onChange, locked, onLocked,
}: { label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void; locked?: boolean; onLocked?: () => void }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground flex items-center gap-1">
        {label}
        {locked && <Lock className="h-2.5 w-2.5 text-primary" />}
      </p>
      <div className="flex gap-1.5 flex-wrap">
        {options.map((o) => (
          <button
            key={o.value}
            onClick={() => {
              if (locked && onLocked) onLocked();
              else onChange(o.value);
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !locked && value === o.value
                ? "bg-primary/10 text-primary border border-primary/30"
                : locked
                  ? "bg-muted/40 text-muted-foreground/60 border border-transparent cursor-not-allowed"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground border border-transparent"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
});

// ── Script section ──────────────────────────────────────────────────

const ScriptBlock = memo(function ScriptBlock({
  label, content, accent,
}: { label: string; content: string; accent?: boolean }) {
  return (
    <div className={`py-3 px-4 ${accent ? "bg-primary/5 border-l-2 border-primary" : "border-l-2 border-border/60"}`}>
      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1">{label}</p>
      {content.split("\n").map((line, i) => (
        <p key={i} className="text-sm text-foreground leading-relaxed">{line || <br />}</p>
      ))}
    </div>
  );
});

// ── Usage limit banner ──────────────────────────────────────────────

const UsageBanner = memo(function UsageBanner({
  remaining, isNearLimit, isAtLimit, onUpgrade,
}: { remaining: number; isNearLimit: boolean; isAtLimit: boolean; onUpgrade: () => void }) {
  if (!isNearLimit && !isAtLimit) return null;

  return (
    <div className={`rounded-2xl p-4 flex items-start gap-3 ${
      isAtLimit
        ? "bg-destructive/10 border border-destructive/20"
        : "bg-primary/5 border border-primary/15"
    }`}>
      <div className={`shrink-0 h-8 w-8 rounded-xl flex items-center justify-center ${
        isAtLimit ? "bg-destructive/15" : "bg-primary/10"
      }`}>
        {isAtLimit
          ? <Lock className="h-4 w-4 text-destructive" />
          : <AlertTriangle className="h-4 w-4 text-primary" />
        }
      </div>
      <div className="flex-1 space-y-1.5">
        <p className="text-sm font-semibold text-foreground">
          {isAtLimit
            ? "Daily limit reached"
            : `${remaining} generation${remaining === 1 ? "" : "s"} left today`}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isAtLimit
            ? "Upgrade to Pro for unlimited generations and premium outputs."
            : "You're close to your limit. Upgrade for unlimited access + better outputs."}
        </p>
        <button
          onClick={onUpgrade}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors mt-1"
        >
          <Crown className="h-3 w-3" />
          Upgrade to continue
        </button>
      </div>
    </div>
  );
});

// ── General Results ─────────────────────────────────────────────────

const GeneralResults = memo(function GeneralResults({
  result, copied, onCopy, onUpgrade,
}: { result: GeneralResult; copied: string; onCopy: (k: string, t: string) => void; onUpgrade: () => void }) {
  return (
    <div className="space-y-5">
      {/* Hooks */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Hooks</h3>
        {result.hooks.map((hook, i) => (
          <div key={i} className="flex items-start justify-between gap-3 bg-muted/40 rounded-2xl p-4">
            <p className="text-sm text-foreground leading-relaxed">
              <span className="text-primary font-bold mr-1.5">#{i + 1}</span>{hook}
            </p>
            <CopyBtn text={hook} label={`hook-${i}`} copied={copied} onCopy={onCopy} />
          </div>
        ))}
        {/* Upsell after hooks */}
        <UpsellBanner
          message="Get higher-converting hooks with Pro — scroll-stopping variations that increase retention"
          onUpgrade={onUpgrade}
        />
      </section>

      {/* Script */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Script</h3>
          <CopyBtn text={result.script} label="script" copied={copied} onCopy={onCopy} />
        </div>
        <div className="bg-muted/40 rounded-2xl p-4">
          {result.script.split("\n").map((line, i) => (
            <p key={i} className="text-sm text-foreground leading-loose">{line || <br />}</p>
          ))}
        </div>
        {/* Upsell after script */}
        <UpsellBanner
          message="Make this script voiceover-ready with structured beats and pro editing plan"
          onUpgrade={onUpgrade}
        />
      </section>

      {/* Caption */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Caption</h3>
          <CopyBtn text={result.caption} label="caption" copied={copied} onCopy={onCopy} />
        </div>
        <div className="bg-muted/40 rounded-2xl p-4">
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.caption}</p>
        </div>
      </section>

      {/* Image Prompts */}
      <section className="space-y-2.5">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">Image Prompts</h3>
        {result.imagePrompts.map((p, i) => (
          <div key={i} className="flex items-start justify-between gap-3 bg-muted/40 rounded-2xl p-4">
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="text-foreground font-semibold mr-1">{i + 1}.</span>{p}
            </p>
            <CopyBtn text={p} label={`img-${i}`} copied={copied} onCopy={onCopy} />
          </div>
        ))}
      </section>

      {/* Blurred Pro previews */}
      <div className="space-y-5 pt-3">
        <div className="flex items-center gap-2 px-1">
          <Crown className="h-3.5 w-3.5 text-primary" />
          <p className="text-[10px] uppercase tracking-widest font-bold text-primary">Available with Pro</p>
        </div>

        <BlurredPreview
          title="Hook variations that increase retention"
          previewLines={[
            "V1: " + (result.hooks[0]?.slice(0, 50) || "What if everything you knew about this was wrong?") + "…",
            "V2: A completely different angle that hooks in the first 0.5 seconds",
            "V3: The emotional rewrite that keeps viewers watching till the end",
          ]}
          onUpgrade={onUpgrade}
        />

        <BlurredPreview
          title="Scene-by-scene editing plan"
          previewLines={[
            "Scene 1 (0-3s): Quick zoom into subject with trending audio drop",
            "Scene 2 (3-8s): B-roll montage with text overlay animation",
            "Scene 3 (8-15s): Direct-to-camera with cinematic lighting shift",
          ]}
          onUpgrade={onUpgrade}
        />
      </div>

      {/* Bottom CTA */}
      <div className="text-center py-4 space-y-2">
        <p className="text-xs text-muted-foreground">
          Creators using Pro get 3× more engagement
        </p>
        <button
          onClick={onUpgrade}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
        >
          <Crown className="h-4 w-4" />
          Upgrade to stand out
        </button>
      </div>
    </div>
  );
});

// ── Pro Results ─────────────────────────────────────────────────────

const ProResults = memo(function ProResults({
  result, platforms, copied, onCopy,
}: { result: ProResult; platforms: string[]; copied: string; onCopy: (k: string, t: string) => void }) {
  const [showPack, setShowPack] = useState(false);
  const fullScript = `${result.script.hook}\n\n${result.script.beat1}\n\n${result.script.beat2}\n\n${result.script.beat3}\n\n${result.script.cta}`;

  return (
    <div className="space-y-6">
      {/* ─── FIRST SCREEN: Core visible output ─── */}

      {/* Best Hook — hero card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-widest font-bold text-primary mb-1.5">Best Hook</p>
            <p className="text-base font-semibold text-foreground leading-relaxed">{result.bestHook}</p>
          </div>
          <CopyBtn text={result.bestHook} label="best-hook" copied={copied} onCopy={onCopy} />
        </div>
      </div>

      {/* Script — structured */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-primary" />Voiceover-ready script
          </h3>
          <CopyBtn text={fullScript} label="pro-script" copied={copied} onCopy={onCopy} />
        </div>
        <div className="rounded-2xl overflow-hidden border border-border/50 divide-y divide-border/40">
          <ScriptBlock label="Hook" content={result.script.hook} accent />
          <ScriptBlock label="Beat 1" content={result.script.beat1} />
          <ScriptBlock label="Beat 2" content={result.script.beat2} />
          <ScriptBlock label="Beat 3" content={result.script.beat3} />
          <ScriptBlock label="CTA" content={result.script.cta} accent />
        </div>
      </section>

      {/* Platform captions — only selected */}
      {platforms.includes("tiktok") && result.tiktokCaption && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-primary" />TikTok Caption
            </h3>
            <CopyBtn text={result.tiktokCaption} label="tiktok" copied={copied} onCopy={onCopy} />
          </div>
          <div className="bg-muted/40 rounded-2xl p-4">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.tiktokCaption}</p>
          </div>
        </section>
      )}
      {platforms.includes("youtube-shorts") && result.youtubeTitle && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Youtube className="h-3.5 w-3.5 text-primary" />YouTube Shorts
            </h3>
            <CopyBtn text={`${result.youtubeTitle}\n\n${result.youtubeDescription}`} label="youtube" copied={copied} onCopy={onCopy} />
          </div>
          <div className="bg-muted/40 rounded-2xl p-4 space-y-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Title</p>
              <p className="text-sm font-semibold text-foreground">{result.youtubeTitle}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Description</p>
              <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{result.youtubeDescription}</p>
            </div>
          </div>
        </section>
      )}
      {platforms.includes("instagram-reels") && result.instagramCaption && (
        <section className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <Instagram className="h-3.5 w-3.5 text-primary" />Instagram Reels
            </h3>
            <CopyBtn text={result.instagramCaption} label="instagram" copied={copied} onCopy={onCopy} />
          </div>
          <div className="bg-muted/40 rounded-2xl p-4">
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.instagramCaption}</p>
          </div>
        </section>
      )}

      {/* ─── VIEW FULL CONTENT PACK BUTTON ─── */}
      {!showPack && (
        <button
          onClick={() => setShowPack(true)}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-primary/30 bg-primary/5 text-primary text-sm font-semibold hover:bg-primary/10 transition-colors"
        >
          <Package className="h-4 w-4" />
          View Full Content Pack
          <ChevronDown className="h-4 w-4" />
        </button>
      )}

      {/* ─── FULL CONTENT PACK (collapsible) ─── */}
      {showPack && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Full Content Pack</p>
            <button
              onClick={() => setShowPack(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
            >
              Hide
            </button>
          </div>

          <Accordion type="multiple" defaultValue={["hooks"]} className="space-y-2.5">
            {/* Hook Variations */}
            {result.hookVariations?.length > 0 && (
              <AccordionItem value="hooks" className="border border-border/50 rounded-2xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" />Hooks that increase retention
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    {result.hookVariations.map((v, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 bg-muted/40 rounded-xl p-3">
                        <p className="text-sm text-foreground leading-relaxed">
                          <span className="text-xs font-bold text-primary mr-1.5">V{i + 1}</span>{v}
                        </p>
                        <CopyBtn text={v} label={`hv-${i}`} copied={copied} onCopy={onCopy} />
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Editing Plan */}
            {result.editingPlan?.length > 0 && (
              <AccordionItem value="editing" className="border border-border/50 rounded-2xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Film className="h-4 w-4 text-primary" />Scene-by-scene editing plan
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2.5">
                    {result.editingPlan.map((scene, i) => (
                      <div key={i} className="bg-muted/40 rounded-xl p-3 space-y-1">
                        <p className="text-xs font-bold text-primary">
                          Scene {scene.scene}
                          <span className="text-muted-foreground font-normal ml-2">{scene.duration}</span>
                        </p>
                        <p className="text-sm text-foreground"><span className="text-muted-foreground text-[10px] uppercase mr-1">Visual:</span>{scene.visual}</p>
                        <p className="text-sm text-foreground"><span className="text-muted-foreground text-[10px] uppercase mr-1">Audio:</span>{scene.audio}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Image Prompts */}
            <AccordionItem value="images" className="border border-border/50 rounded-2xl overflow-hidden">
              <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Image className="h-4 w-4 text-primary" />Cinematic image prompts ({result.imagePrompts.length})
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-2">
                  {result.imagePrompts.map((p, i) => (
                    <div key={i} className="flex items-start justify-between gap-3 bg-muted/40 rounded-xl p-3">
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        <span className="text-foreground font-semibold mr-1">{i + 1}.</span>{p}
                      </p>
                      <CopyBtn text={p} label={`pi-${i}`} copied={copied} onCopy={onCopy} />
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* Voice Style */}
            {result.voiceStyle && (
              <AccordionItem value="voice" className="border border-border/50 rounded-2xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2">
                    <Mic className="h-4 w-4 text-primary" />Voice style recommendation
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="bg-muted/40 rounded-xl p-3">
                    <p className="text-sm font-medium text-foreground">{result.voiceStyle}</p>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            {/* Posting Strategy */}
            {result.postingStrategy && (
              <AccordionItem value="posting" className="border border-border/50 rounded-2xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-primary" />Growth strategy & timing
                  </span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2">
                    <div className="bg-muted/40 rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Best Time</p>
                      <p className="text-sm font-medium text-foreground">{result.postingStrategy.bestTime}</p>
                    </div>
                    <div className="bg-muted/40 rounded-xl p-3">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-0.5">Platform Tip</p>
                      <p className="text-sm text-foreground">{result.postingStrategy.platformTip}</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}
          </Accordion>
        </div>
      )}
    </div>
  );
});

// ── Loading ─────────────────────────────────────────────────────────

const LoadingState = memo(function LoadingState({ mode }: { mode: Mode }) {
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
          {mode === "pro" ? "Building your content pipeline…" : "Creating your content…"}
        </p>
        <p className="text-xs text-muted-foreground">Usually takes 5–10 seconds</p>
      </div>
    </div>
  );
});

// ── Main page ───────────────────────────────────────────────────────

export default function Index() {
  const { settings } = useSettings();
  const locale = settings.language;
  const { remaining, isAtLimit, isNearLimit, increment } = useUsageLimit();

  const [mode, setMode] = useState<Mode>("general");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("viral");
  const [platform, setPlatform] = useState(settings.defaultPlatform);
  const [platforms, setPlatforms] = useState<string[]>(["tiktok"]);
  const [contentType, setContentType] = useState("story");
  const [scriptLength, setScriptLength] = useState(settings.defaultScriptLength);
  const [goal, setGoal] = useState("viral");
  const [hookIntensity, setHookIntensity] = useState(1);
  const [imagePromptCount, setImagePromptCount] = useState("4");
  const [outputDepth, setOutputDepth] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [generalResult, setGeneralResult] = useState<GeneralResult | null>(null);
  const [proResult, setProResult] = useState<ProResult | null>(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState("");

  const openUpgrade = useCallback((trigger?: string) => {
    setUpgradeTrigger(trigger || "");
    setUpgradeOpen(true);
  }, []);

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
    toast.success(t("btn.copied", locale));
    setTimeout(() => setCopied(""), 1200);
  }, [locale]);

  const generateContent = useCallback(async () => {
    if (!topic.trim()) return;

    // Check free limit
    if (mode === "general" && isAtLimit) {
      openUpgrade("You've reached your daily free limit. Upgrade to Pro for unlimited generations and premium outputs.");
      return;
    }

    setLoading(true);
    try {
      const body =
        mode === "pro"
          ? { mode, topic, platforms, contentType, style, scriptLength, goal, hookIntensity, imageFormat: "9:16", imagePromptCount: parseInt(imagePromptCount), outputDepth }
          : { mode, topic, platform, contentType, style, scriptLength, goal, hookIntensity, imageFormat: "9:16", outputStyle: settings.outputStyle };

      const { data, error } = await supabase.functions.invoke("generate-content", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (mode === "pro") {
        setProResult(data as ProResult);
        setGeneralResult(null);
      } else {
        setGeneralResult(data as GeneralResult);
        setProResult(null);
        increment(); // Count free usage
      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      const msg = error?.message || "";
      if (/temporarily busy|try again/i.test(msg)) {
        toast.error("AI is temporarily busy — please try again in a few seconds.");
      } else {
        toast.error(msg || "Generation failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [mode, topic, platform, platforms, contentType, style, scriptLength, goal, hookIntensity, imagePromptCount, outputDepth, settings.outputStyle, isAtLimit, increment, openUpgrade]);

  const hasResults = mode === "general" ? generalResult !== null : proResult !== null;

  const copyAll = useCallback(() => {
    let all = "";
    if (mode === "general" && generalResult) {
      all = [
        generalResult.hooks.map((h, i) => `Hook ${i + 1}: ${h}`).join("\n"),
        `Script:\n${generalResult.script}`,
        `Caption:\n${generalResult.caption}`,
        `Image Prompts:\n${generalResult.imagePrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
      ].filter(Boolean).join("\n\n");
    } else if (mode === "pro" && proResult) {
      const s = proResult.script;
      all = [
        `🏆 BEST HOOK:\n${proResult.bestHook}`,
        `📝 SCRIPT:\nHook: ${s.hook}\nBeat 1: ${s.beat1}\nBeat 2: ${s.beat2}\nBeat 3: ${s.beat3}\nCTA: ${s.cta}`,
        proResult.tiktokCaption ? `TikTok: ${proResult.tiktokCaption}` : "",
        proResult.youtubeTitle ? `YouTube: ${proResult.youtubeTitle}\n${proResult.youtubeDescription}` : "",
        proResult.instagramCaption ? `Instagram: ${proResult.instagramCaption}` : "",
        proResult.hookVariations?.length ? `🎯 VARIATIONS:\n${proResult.hookVariations.map((v, i) => `V${i + 1}: ${v}`).join("\n")}` : "",
        proResult.voiceStyle ? `🎙️ Voice: ${proResult.voiceStyle}` : "",
        proResult.postingStrategy ? `📅 Post: ${proResult.postingStrategy.bestTime} — ${proResult.postingStrategy.platformTip}` : "",
        `🖼️ Images:\n${proResult.imagePrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
      ].filter(Boolean).join("\n\n");
    }
    copyToClipboard("all", all);
  }, [mode, generalResult, proResult, copyToClipboard]);

  const hookLabel = useMemo(
    () => [t("hook.low", locale), t("hook.medium", locale), t("hook.high", locale)][hookIntensity],
    [hookIntensity, locale]
  );

  const lengthOpts = mode === "pro" ? LENGTH_OPTIONS_PRO : LENGTH_OPTIONS_FREE;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="py-8 px-4">
        <div className="mx-auto max-w-lg space-y-7">

          {/* ─── HEADER ─── */}
          <div className="text-center space-y-2 pt-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              What do you want to create?
            </h1>
            <p className="text-muted-foreground text-sm">
              Pick a platform, drop your topic, and let AI do the rest.
            </p>
          </div>

          {/* ─── MODE TOGGLE ─── */}
          <div className="flex gap-2 p-1 rounded-2xl bg-muted/60">
            <button
              onClick={() => setMode("general")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === "general" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Zap className="h-4 w-4" />Free
            </button>
            <button
              onClick={() => setMode("pro")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === "pro" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Crown className="h-4 w-4" />Pro
            </button>
          </div>

          {/* ─── USAGE BANNER (Free mode) ─── */}
          {mode === "general" && (
            <UsageBanner
              remaining={remaining}
              isNearLimit={isNearLimit}
              isAtLimit={isAtLimit}
              onUpgrade={() => openUpgrade()}
            />
          )}

          {/* ─── INPUT AREA ─── */}
          <div className="space-y-5">

            {/* 1. Platform */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Platform</p>
              <div className="flex gap-2">
                {PLATFORM_OPTIONS.map((o) => {
                  const sel = mode === "pro" ? platforms.includes(o.value) : platform === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => {
                        if (mode === "pro") togglePlatform(o.value);
                        else setPlatform(o.value);
                      }}
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
              {mode === "pro" && (
                <p className="text-[10px] text-muted-foreground text-center">Select multiple platforms</p>
              )}
            </div>

            {/* 2. Topic */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Topic</p>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. fitness tips, AI tools, crypto..."
                className="h-12 rounded-2xl text-base border-border/60 bg-muted/30 px-4"
                onKeyDown={(e) => e.key === "Enter" && generateContent()}
              />
            </div>

            {/* 3. Controls */}
            <div className="grid grid-cols-2 gap-4">
              <MiniSelect label="Length" value={scriptLength} options={lengthOpts.map(v => ({ value: v, label: `${v}s` }))} onChange={setScriptLength} />
              <MiniSelect label="Style" value={style} options={STYLE_OPTIONS} onChange={setStyle} />
              <MiniSelect label="Type" value={contentType} options={CONTENT_TYPE_OPTIONS} onChange={setContentType} />
              <MiniSelect label="Goal" value={goal} options={GOAL_OPTIONS} onChange={setGoal} />
            </div>

            {/* Hook intensity */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1">
                <Flame className="h-3 w-3" />Hook Intensity
              </p>
              <div className="flex gap-2">
                {[0, 1, 2].map((lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setHookIntensity(lvl)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                      hookIntensity === lvl
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "bg-muted/60 text-muted-foreground border border-transparent"
                    }`}
                  >
                    {[t("hook.low", locale), t("hook.medium", locale), t("hook.high", locale)][lvl]}
                  </button>
                ))}
              </div>
            </div>

            {/* Pro-only controls */}
            {mode === "pro" && (
              <div className="grid grid-cols-2 gap-4 pt-1 border-t border-border/40">
                <MiniSelect label="Image Prompts" value={imagePromptCount} options={IMAGE_COUNT_OPTIONS.map(v => ({ value: v, label: v }))} onChange={setImagePromptCount} />
                <MiniSelect label="Depth" value={outputDepth} options={DEPTH_OPTIONS} onChange={setOutputDepth} />
              </div>
            )}

            {/* Locked Pro controls in Free mode */}
            {mode === "general" && (
              <div className="grid grid-cols-2 gap-4 pt-1 border-t border-border/40 opacity-60">
                <MiniSelect
                  label="Image Prompts"
                  value=""
                  options={IMAGE_COUNT_OPTIONS.map(v => ({ value: v, label: v }))}
                  onChange={() => {}}
                  locked
                  onLocked={() => openUpgrade("Customize image prompt count with Pro — generate up to 6 cinematic prompts per topic.")}
                />
                <MiniSelect
                  label="Depth"
                  value=""
                  options={DEPTH_OPTIONS}
                  onChange={() => {}}
                  locked
                  onLocked={() => openUpgrade("Control output depth with Pro — get concise or detailed content based on your needs.")}
                />
              </div>
            )}

            {/* Generate */}
            <Button
              variant="generate"
              className="w-full h-13 text-base rounded-2xl"
              disabled={!topic.trim() || loading || (mode === "general" && isAtLimit)}
              onClick={generateContent}
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" />Generating…</>
              ) : mode === "general" && isAtLimit ? (
                <><Lock className="h-5 w-5" />Upgrade to continue</>
              ) : (
                <><Sparkles className="h-5 w-5" />{mode === "pro" ? "Generate Full Pipeline" : "Generate Content"}</>
              )}
            </Button>

            {/* Free remaining indicator */}
            {mode === "general" && !isAtLimit && !isNearLimit && remaining < 4 && (
              <p className="text-center text-[11px] text-muted-foreground">
                {remaining} free generation{remaining === 1 ? "" : "s"} remaining today
              </p>
            )}
          </div>

          {/* ─── ACTION BAR ─── */}
          {hasResults && !loading && (
            <div className="flex justify-center gap-3">
              <button
                onClick={generateContent}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="h-3 w-3" />Regenerate
              </button>
              <button
                onClick={copyAll}
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="h-3 w-3" />{copied === "all" ? "Copied!" : "Copy All"}
              </button>
            </div>
          )}

          {/* ─── LOADING ─── */}
          {loading && <LoadingState mode={mode} />}

          {/* ─── RESULTS ─── */}
          {!loading && mode === "general" && generalResult && (
            <GeneralResults result={generalResult} copied={copied} onCopy={copyToClipboard} onUpgrade={() => openUpgrade()} />
          )}
          {!loading && mode === "pro" && proResult && (
            <ProResults result={proResult} platforms={platforms} copied={copied} onCopy={copyToClipboard} />
          )}

          {/* Empty */}
          {!hasResults && !loading && (
            <div className="text-center py-16 space-y-2">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {t("empty.text", locale)}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* ─── UPGRADE DIALOG ─── */}
      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} trigger={upgradeTrigger} />
    </div>
  );
}
