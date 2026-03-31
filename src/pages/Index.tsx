import React, { useState, useCallback, useMemo, memo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
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
import { useProStatus } from "@/hooks/useProStatus";

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

const LENGTH_OPTIONS = ["15", "30", "60", "90"];

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
  selected, onClick, children, locked, icon,
}: { selected: boolean; onClick: () => void; children: React.ReactNode; locked?: boolean; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
        locked
          ? "bg-muted/30 text-muted-foreground/50 border border-dashed border-border/50 cursor-pointer"
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
        <UpsellBanner
          message="Get 10 higher-converting hooks with Pro — scroll-stopping variations that increase retention"
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
            "V1: " + (result.hooks[0]?.slice(0, 50) || "What if everything you knew was wrong?") + "…",
            "V2: A completely different angle that hooks in 0.5 seconds",
            "V3: The emotional rewrite that keeps viewers watching",
          ]}
          onUpgrade={onUpgrade}
        />

        <BlurredPreview
          title="Scene-by-scene editing plan"
          previewLines={[
            "Scene 1 (0-3s): Quick zoom with trending audio drop",
            "Scene 2 (3-8s): B-roll montage with text overlay",
            "Scene 3 (8-15s): Direct-to-camera with cinematic shift",
          ]}
          onUpgrade={onUpgrade}
        />

        <BlurredPreview
          title="Voice style recommendation"
          previewLines={["Dark & slow — dramatic pauses, low energy open"]}
          onUpgrade={onUpgrade}
        />

        <BlurredPreview
          title="Posting strategy & timing"
          previewLines={[
            "Best time: Tuesday 7-9 PM EST",
            "Platform tip: Use trending sounds within first 2 hours",
          ]}
          onUpgrade={onUpgrade}
        />
      </div>

      {/* Bottom CTA */}
      <div className="text-center py-4 space-y-2">
        <p className="text-xs text-muted-foreground">Creators using Pro get 3× more engagement</p>
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

      {/* Platform captions */}
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

      {/* VIEW FULL CONTENT PACK */}
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

      {showPack && (
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Full Content Pack</p>
            <button onClick={() => setShowPack(false)} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors">Hide</button>
          </div>

          <Accordion type="multiple" defaultValue={["hooks"]} className="space-y-2.5">
            {result.hookVariations?.length > 0 && (
              <AccordionItem value="hooks" className="border border-border/50 rounded-2xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2"><Target className="h-4 w-4 text-primary" />Hook Variations ({result.hookVariations.length})</span>
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

            {result.editingPlan?.length > 0 && (
              <AccordionItem value="editing" className="border border-border/50 rounded-2xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2"><Film className="h-4 w-4 text-primary" />Editing Plan</span>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-2.5">
                    {result.editingPlan.map((scene, i) => (
                      <div key={i} className="bg-muted/40 rounded-xl p-3 space-y-1">
                        <p className="text-xs font-bold text-primary">
                          Scene {scene.scene}<span className="text-muted-foreground font-normal ml-2">{scene.duration}</span>
                        </p>
                        <p className="text-sm text-foreground"><span className="text-muted-foreground text-[10px] uppercase mr-1">Visual:</span>{scene.visual}</p>
                        <p className="text-sm text-foreground"><span className="text-muted-foreground text-[10px] uppercase mr-1">Audio:</span>{scene.audio}</p>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )}

            <AccordionItem value="images" className="border border-border/50 rounded-2xl overflow-hidden">
              <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                <span className="flex items-center gap-2"><Image className="h-4 w-4 text-primary" />Image Prompts ({result.imagePrompts.length})</span>
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

            {result.voiceStyle && (
              <AccordionItem value="voice" className="border border-border/50 rounded-2xl overflow-hidden">
                <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                  <span className="flex items-center gap-2"><Mic className="h-4 w-4 text-primary" />Voice Style</span>
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
                  <span className="flex items-center gap-2"><CalendarClock className="h-4 w-4 text-primary" />Posting Strategy</span>
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
  const { isPro, openGumroad } = useProStatus();

  const [mode, setMode] = useState<Mode>(isPro ? "pro" : "general");
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
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState("");

  const isProMode = mode === "pro";

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
    toast.success("Copied — ready to post 🚀");
    setTimeout(() => setCopied(""), 1200);
  }, []);

  const generateContent = useCallback(async () => {
    if (!topic.trim()) return;

    if (!isPro && isAtLimit) {
      openUpgrade("You've reached your daily free limit. Upgrade to Pro for unlimited generations and premium outputs.");
      return;
    }

    setLoading(true);
    try {
      const body = isProMode
        ? {
            mode: "pro", topic, platforms, contentType, style, scriptLength, goal, hookIntensity,
            imageFormat: "9:16", imagePromptCount, outputDepth,
            customDescription: customDescription.trim() || undefined,
          }
        : {
            mode: "general", topic, platform, contentType, style, scriptLength, goal, hookIntensity,
            imageFormat: "9:16", outputStyle: settings.outputStyle,
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
        if (!isPro) increment();
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
  }, [isProMode, topic, platform, platforms, contentType, style, scriptLength, goal, hookIntensity, imagePromptCount, outputDepth, customDescription, settings.outputStyle, isAtLimit, increment, openUpgrade]);

  const hasResults = isProMode ? proResult !== null : generalResult !== null;

  const copyAll = useCallback(() => {
    let all = "";
    if (!isProMode && generalResult) {
      all = [
        generalResult.hooks.map((h, i) => `Hook ${i + 1}: ${h}`).join("\n"),
        `Script:\n${generalResult.script}`,
        `Caption:\n${generalResult.caption}`,
        `Image Prompts:\n${generalResult.imagePrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
      ].filter(Boolean).join("\n\n");
    } else if (isProMode && proResult) {
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
  }, [isProMode, generalResult, proResult, copyToClipboard]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="py-8 px-4">
        <div className="mx-auto max-w-lg space-y-7">

          {/* HEADER */}
          <div className="text-center space-y-2 pt-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              AI Content Engine
            </h1>
            <p className="text-muted-foreground text-sm">
              Generate viral hooks, scripts & captions in seconds.
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
              <Zap className="h-4 w-4" />Free
            </button>
            <button
              onClick={() => {
                if (isPro) setMode("pro");
                else openUpgrade("Unlock Pro mode for advanced styles, better hooks, editing plans, and unlimited generations.");
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isProMode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Crown className="h-4 w-4" />{isPro ? "Pro" : "Pro 🔒"}
            </button>
          </div>

          {/* USAGE BANNER (Free) */}
          {!isPro && (
            <UsageBanner remaining={remaining} isNearLimit={isNearLimit} isAtLimit={isAtLimit} onUpgrade={() => openUpgrade()} />
          )}

          {/* INPUT AREA */}
          <div className="space-y-5">

            {/* 1. Platform */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Platform</p>
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
              {isProMode && <p className="text-[10px] text-muted-foreground text-center">Select multiple platforms</p>}
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

            {/* 3. Length */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Length</p>
              <div className="flex gap-2">
                {LENGTH_OPTIONS.map((len) => (
                  <Pill
                    key={len}
                    selected={scriptLength === len}
                    onClick={() => setScriptLength(len)}
                  >
                    {len}s
                  </Pill>
                ))}
              </div>
            </div>

            {/* 4. Style */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Style</p>
              <div className="flex gap-2 flex-wrap">
                {FREE_STYLES.map((s) => (
                  <Pill key={s.value} selected={style === s.value} onClick={() => setStyle(s.value)}>
                    {s.label}
                  </Pill>
                ))}
                {PRO_STYLES.map((s) => (
                  <Pill
                    key={s.value}
                    selected={isPro && style === s.value}
                    locked={!isPro}
                    onClick={() => {
                      if (isPro) setStyle(s.value);
                      else openUpgrade(`Unlock "${s.label}" style — ${s.label === "High Retention" ? "fast pacing, pattern interrupts, open loops" : "advanced content style for higher performance"}`);
                    }}
                  >
                    {s.label}
                  </Pill>
                ))}
              </div>
            </div>

            {/* 5. Content Type */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Content Type</p>
              <div className="flex gap-2 flex-wrap">
                {FREE_CONTENT_TYPES.map((ct) => (
                  <Pill key={ct.value} selected={contentType === ct.value} onClick={() => setContentType(ct.value)}>
                    {ct.label}
                  </Pill>
                ))}
                {PRO_CONTENT_TYPES.map((ct) => (
                  <Pill
                    key={ct.value}
                    selected={isPro && contentType === ct.value}
                    locked={!isPro}
                    onClick={() => {
                      if (isPro) setContentType(ct.value);
                      else openUpgrade(`Unlock "${ct.label}" content type for specialized output.`);
                    }}
                  >
                    {ct.label}
                  </Pill>
                ))}
              </div>
            </div>

            {/* 6. Goal */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Goal</p>
              <div className="flex gap-2 flex-wrap">
                {FREE_GOALS.map((g) => (
                  <Pill key={g.value} selected={goal === g.value} onClick={() => setGoal(g.value)}>
                    {g.label}
                  </Pill>
                ))}
                {PRO_GOALS.map((g) => (
                  <Pill
                    key={g.value}
                    selected={isPro && goal === g.value}
                    locked={!isPro}
                    onClick={() => {
                      if (isPro) setGoal(g.value);
                      else openUpgrade(`Unlock "${g.label}" goal for targeted content.`);
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
                <Flame className="h-3 w-3" />Hook Intensity
              </p>
              <div className="flex gap-2">
                {["Low", "Medium", "High"].map((label, lvl) => (
                  <button
                    key={lvl}
                    onClick={() => setHookIntensity(lvl)}
                    className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                      hookIntensity === lvl
                        ? "bg-primary/10 text-primary border border-primary/30"
                        : "bg-muted/60 text-muted-foreground border border-transparent"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* 8. Image Prompts */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1">
                <Image className="h-3 w-3" />Image Prompts
                {!isPro && <span className="text-muted-foreground/60 ml-1">(fixed: 3)</span>}
              </p>
              {isPro ? (
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
                <button
                  onClick={() => openUpgrade("Unlock custom image prompt count (1–10) with Pro.")}
                  className="w-full py-2 rounded-xl bg-muted/30 border border-dashed border-border/50 text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5 cursor-pointer hover:border-primary/30 transition-colors"
                >
                  <Lock className="h-3 w-3" />
                  Slider unlocked with Pro (1–10)
                </button>
              )}
            </div>

            {/* 9. Depth */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Depth</p>
              <div className="flex gap-2">
                {DEPTH_OPTIONS.map((d) => {
                  const isLocked = d.value === "detailed" && !isPro;
                  return (
                    <Pill
                      key={d.value}
                      selected={outputDepth === d.value}
                      locked={isLocked}
                      onClick={() => {
                        if (isLocked) openUpgrade("Unlock Detailed depth for maximum output quality.");
                        else setOutputDepth(d.value);
                      }}
                    >
                      {d.label}
                    </Pill>
                  );
                })}
              </div>
            </div>

            {/* 10. PRO ONLY: Custom description */}
            {isPro && (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  Describe your video <span className="text-muted-foreground/60">(optional)</span>
                </p>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="e.g. I want to sell my course, target 18-25 year olds, use dark humor..."
                  rows={3}
                  className="w-full rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
            )}
            {!isPro && (
              <button
                onClick={() => openUpgrade("Describe your exact video intent with Pro — get AI-tailored output.")}
                className="w-full py-2.5 rounded-xl bg-muted/30 border border-dashed border-border/50 text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5 cursor-pointer hover:border-primary/30 transition-colors"
              >
                <Lock className="h-3 w-3" />
                Describe your video (Pro only)
              </button>
            )}

            {/* Generate */}
            <Button
              className="w-full h-13 text-base rounded-2xl font-bold"
              disabled={!topic.trim() || loading || (!isPro && isAtLimit)}
              onClick={generateContent}
            >
              {loading ? (
                <><Loader2 className="h-5 w-5 animate-spin" />Generating…</>
              ) : !isPro && isAtLimit ? (
                <><Lock className="h-5 w-5" />Upgrade to continue</>
              ) : (
                <><Sparkles className="h-5 w-5" />{isProMode ? "Generate Full Pipeline" : "Generate Content"}</>
              )}
            </Button>

            {!isPro && !isAtLimit && !isNearLimit && remaining < 4 && (
              <p className="text-center text-[11px] text-muted-foreground">
                {remaining} free generation{remaining === 1 ? "" : "s"} remaining today
              </p>
            )}
          </div>

          {/* ACTION BAR */}
          {hasResults && !loading && (
            <div className="flex justify-center gap-3">
              <button onClick={generateContent} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                <RefreshCw className="h-3 w-3" />Regenerate
              </button>
              <button onClick={copyAll} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                <Copy className="h-3 w-3" />{copied === "all" ? "Copied!" : "Copy All"}
              </button>
            </div>
          )}

          {loading && <LoadingState mode={mode} />}

          {!loading && !isProMode && generalResult && (
            <GeneralResults result={generalResult} copied={copied} onCopy={copyToClipboard} onUpgrade={() => openUpgrade()} />
          )}
          {!loading && isProMode && proResult && (
            <ProResults result={proResult} platforms={platforms} copied={copied} onCopy={copyToClipboard} />
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

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} trigger={upgradeTrigger} />
    </div>
  );
}
