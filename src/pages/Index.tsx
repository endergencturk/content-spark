import React, { useState, useCallback, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Copy, Loader2, Sparkles, Lightbulb, FileText, MessageSquare, RefreshCw,
  Image, Clock, Flame, Crown, Hash, Youtube, ImageIcon, Mic, Film,
  CalendarClock, Target, Trophy, Zap, Instagram, ChevronRight,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useSettings } from "@/contexts/SettingsContext";
import { t } from "@/lib/i18n";

// ── Constants ───────────────────────────────────────────────────────

const STYLE_OPTIONS = [
  { value: "viral", label: "Viral" },
  { value: "dark", label: "Dark / Mystery" },
  { value: "educational", label: "Educational" },
  { value: "storytelling", label: "Storytelling" },
  { value: "aggressive", label: "Aggressive" },
];

const PLATFORM_OPTIONS = [
  { value: "tiktok", label: "TikTok", icon: Hash },
  { value: "youtube-shorts", label: "YouTube Shorts", icon: Youtube },
  { value: "instagram-reels", label: "Instagram Reels", icon: Instagram },
];

const CONTENT_TYPE_OPTIONS = [
  { value: "story", label: "Story" },
  { value: "educational", label: "Educational" },
  { value: "selling", label: "Selling" },
  { value: "entertainment", label: "Entertainment" },
];

const FREE_LENGTH_OPTIONS = [
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
  { value: "60", label: "60s" },
];

const PRO_LENGTH_OPTIONS = [
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
  { value: "60", label: "60s" },
  { value: "90", label: "90s" },
];

const GOAL_OPTIONS = [
  { value: "viral", label: "Go viral" },
  { value: "followers", label: "Get followers" },
  { value: "sell", label: "Sell product" },
  { value: "story", label: "Tell a story" },
];

const IMAGE_FORMAT_OPTIONS = [
  { value: "9:16", label: "9:16" },
  { value: "1:1", label: "1:1" },
  { value: "16:9", label: "16:9" },
];

const IMAGE_COUNT_OPTIONS = [
  { value: "2", label: "2" },
  { value: "4", label: "4" },
  { value: "6", label: "6" },
];

const OUTPUT_DEPTH_OPTIONS = [
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
  // Dynamic platform outputs
  tiktokCaption?: string;
  youtubeTitle?: string;
  youtubeDescription?: string;
  instagramCaption?: string;
}

// ── Reusable sub-components ─────────────────────────────────────────

const CopyButton = memo(function CopyButton({
  text, label, copied, onCopy,
}: { text: string; label: string; copied: string; onCopy: (k: string, t: string) => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground shrink-0"
      onClick={() => onCopy(label, text)}
    >
      <Copy className="h-3 w-3" />
      {copied === label ? "Copied" : "Copy"}
    </Button>
  );
});

const SelectorField = memo(function SelectorField({
  label, icon, children,
}: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}{label}
      </label>
      {children}
    </div>
  );
});

const ResultCard = memo(function ResultCard({
  title, icon, children, noPadding,
}: { title: string; icon: React.ReactNode; children: React.ReactNode; noPadding?: boolean }) {
  return (
    <Card className="shadow-[var(--shadow-card)] border-border/50 hover:shadow-[var(--shadow-card-hover)] transition-shadow">
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          {icon}{title}
        </CardTitle>
      </CardHeader>
      <CardContent className={noPadding ? "px-0 pb-0" : "px-5 pb-4 space-y-3"}>
        {children}
      </CardContent>
    </Card>
  );
});

// ── Structured Script Display ───────────────────────────────────────

const ScriptSection = memo(function ScriptSection({
  label, content, accent,
}: { label: string; content: string; accent?: boolean }) {
  return (
    <div className={`px-5 py-3 ${accent ? "bg-primary/5 border-l-2 border-primary" : "border-l-2 border-border"}`}>
      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-1.5">{label}</p>
      <div className="space-y-0.5">
        {content.split("\n").map((line, i) => (
          <p key={i} className="text-sm text-foreground leading-relaxed">{line || <br />}</p>
        ))}
      </div>
    </div>
  );
});

const StructuredScriptDisplay = memo(function StructuredScriptDisplay({
  script, copied, onCopy,
}: { script: StructuredScript; copied: string; onCopy: (k: string, t: string) => void }) {
  const fullText = `${script.hook}\n\n${script.beat1}\n\n${script.beat2}\n\n${script.beat3}\n\n${script.cta}`;
  return (
    <Card className="shadow-[var(--shadow-card)] border-border/50 overflow-hidden">
      <CardHeader className="pb-2 pt-4 px-5 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          <FileText className="h-4 w-4 text-primary" />Voiceover Script
        </CardTitle>
        <CopyButton text={fullText} label="pro-script" copied={copied} onCopy={onCopy} />
      </CardHeader>
      <CardContent className="px-0 pb-0">
        <div className="divide-y divide-border/50">
          <ScriptSection label="Hook" content={script.hook} accent />
          <ScriptSection label="Beat 1" content={script.beat1} />
          <ScriptSection label="Beat 2" content={script.beat2} />
          <ScriptSection label="Beat 3" content={script.beat3} />
          <ScriptSection label="CTA" content={script.cta} accent />
        </div>
      </CardContent>
    </Card>
  );
});

// ── General Results ─────────────────────────────────────────────────

const GeneralResults = memo(function GeneralResults({
  result, copied, onCopy,
}: { result: GeneralResult; copied: string; onCopy: (k: string, t: string) => void }) {
  return (
    <div className="space-y-4">
      <ResultCard title="Hooks" icon={<Lightbulb className="h-4 w-4 text-primary" />}>
        <div className="space-y-2">
          {result.hooks.map((hook, i) => (
            <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-semibold text-primary mr-1">#{i + 1}</span>{hook}
              </p>
              <CopyButton text={hook} label={`hook-${i}`} copied={copied} onCopy={onCopy} />
            </div>
          ))}
        </div>
      </ResultCard>

      <ResultCard title="Script" icon={<FileText className="h-4 w-4 text-primary" />}>
        <div className="rounded-lg bg-muted/50 p-4">
          {result.script.split("\n").map((line, i) => (
            <p key={i} className="text-sm text-foreground leading-loose">{line || <br />}</p>
          ))}
        </div>
        <CopyButton text={result.script} label="script" copied={copied} onCopy={onCopy} />
      </ResultCard>

      <ResultCard title="Caption" icon={<MessageSquare className="h-4 w-4 text-primary" />}>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.caption}</p>
        <CopyButton text={result.caption} label="caption" copied={copied} onCopy={onCopy} />
      </ResultCard>

      <ResultCard title="Image Prompts" icon={<Image className="h-4 w-4 text-primary" />}>
        <div className="space-y-2">
          {result.imagePrompts.map((p, i) => (
            <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground mr-1">{i + 1}.</span>{p}
              </p>
              <CopyButton text={p} label={`img-${i}`} copied={copied} onCopy={onCopy} />
            </div>
          ))}
        </div>
      </ResultCard>
    </div>
  );
});

// ── Pro Results ─────────────────────────────────────────────────────

const ProResults = memo(function ProResults({
  result, platforms, copied, onCopy,
}: { result: ProResult; platforms: string[]; copied: string; onCopy: (k: string, t: string) => void }) {
  return (
    <div className="space-y-6">
      {/* ── A) CORE OUTPUT ─────────────────── */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-1">Core Output</p>
        <div className="space-y-4">
          {/* Best Hook */}
          <Card className="shadow-[var(--shadow-card)] border-primary/30 bg-primary/5">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5 h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Trophy className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-primary mb-1">Best Hook</p>
                    <p className="text-base font-semibold text-foreground leading-relaxed">{result.bestHook}</p>
                  </div>
                </div>
                <CopyButton text={result.bestHook} label="best-hook" copied={copied} onCopy={onCopy} />
              </div>
            </CardContent>
          </Card>

          {/* Hook Variations */}
          {result.hookVariations?.length > 0 && (
            <ResultCard title="Hook Variations" icon={<Target className="h-4 w-4 text-primary" />}>
              <div className="space-y-2">
                {result.hookVariations.map((v, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-3">
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="text-xs font-bold text-primary mr-2">V{i + 1}</span>{v}
                    </p>
                    <CopyButton text={v} label={`hook-var-${i}`} copied={copied} onCopy={onCopy} />
                  </div>
                ))}
              </div>
            </ResultCard>
          )}

          {/* Structured Script */}
          <StructuredScriptDisplay script={result.script} copied={copied} onCopy={onCopy} />

          {/* Platform Outputs */}
          {platforms.includes("tiktok") && result.tiktokCaption && (
            <ResultCard title="TikTok Caption" icon={<Hash className="h-4 w-4 text-primary" />}>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.tiktokCaption}</p>
              <CopyButton text={result.tiktokCaption} label="tiktok" copied={copied} onCopy={onCopy} />
            </ResultCard>
          )}
          {platforms.includes("youtube-shorts") && result.youtubeTitle && (
            <ResultCard title="YouTube Shorts" icon={<Youtube className="h-4 w-4 text-primary" />}>
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Title</p>
                  <p className="text-sm font-semibold text-foreground">{result.youtubeTitle}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{result.youtubeDescription}</p>
                </div>
              </div>
              <CopyButton text={`${result.youtubeTitle}\n\n${result.youtubeDescription}`} label="youtube" copied={copied} onCopy={onCopy} />
            </ResultCard>
          )}
          {platforms.includes("instagram-reels") && result.instagramCaption && (
            <ResultCard title="Instagram Reels" icon={<Instagram className="h-4 w-4 text-primary" />}>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.instagramCaption}</p>
              <CopyButton text={result.instagramCaption} label="instagram" copied={copied} onCopy={onCopy} />
            </ResultCard>
          )}
        </div>
      </div>

      {/* ── B) PRODUCTION KIT (collapsible) ─── */}
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-1">Production Kit</p>
        <Accordion type="multiple" defaultValue={["editing", "images"]} className="space-y-3">
          {/* Editing Plan */}
          {result.editingPlan?.length > 0 && (
            <AccordionItem value="editing" className="border rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
              <AccordionTrigger className="px-5 py-3 text-sm font-bold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Film className="h-4 w-4 text-primary" />Editing Plan
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-4">
                <div className="space-y-3">
                  {result.editingPlan.map((scene, i) => (
                    <div key={i} className="rounded-lg bg-muted/50 p-3 space-y-1.5">
                      <p className="text-xs font-bold text-primary">
                        Scene {scene.scene}
                        <span className="text-muted-foreground font-normal ml-2">{scene.duration}</span>
                      </p>
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground text-xs mr-1">Visual:</span>{scene.visual}
                      </p>
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground text-xs mr-1">Audio:</span>{scene.audio}
                      </p>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Image Prompts */}
          <AccordionItem value="images" className="border rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
            <AccordionTrigger className="px-5 py-3 text-sm font-bold hover:no-underline">
              <span className="flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />Image Prompts ({result.imagePrompts.length})
              </span>
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-4">
              <div className="space-y-2">
                {result.imagePrompts.map((p, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      <span className="font-semibold text-foreground mr-1">{i + 1}.</span>{p}
                    </p>
                    <CopyButton text={p} label={`pro-img-${i}`} copied={copied} onCopy={onCopy} />
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Voice Style */}
          {result.voiceStyle && (
            <AccordionItem value="voice" className="border rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
              <AccordionTrigger className="px-5 py-3 text-sm font-bold hover:no-underline">
                <span className="flex items-center gap-2">
                  <Mic className="h-4 w-4 text-primary" />Voice Style
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-sm font-semibold text-foreground">{result.voiceStyle}</p>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>

      {/* ── C) GROWTH EXTRAS (collapsed by default) ── */}
      {result.postingStrategy && (
        <div className="space-y-1.5">
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-1">Growth Extras</p>
          <Accordion type="single" collapsible className="space-y-3">
            <AccordionItem value="posting" className="border rounded-xl overflow-hidden shadow-[var(--shadow-card)]">
              <AccordionTrigger className="px-5 py-3 text-sm font-bold hover:no-underline">
                <span className="flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />Posting Strategy
                </span>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-4">
                <div className="space-y-2">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">Best Time</p>
                    <p className="text-sm font-semibold text-foreground">{result.postingStrategy.bestTime}</p>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">Platform Tip</p>
                    <p className="text-sm text-foreground">{result.postingStrategy.platformTip}</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      )}
    </div>
  );
});

// ── Loading skeleton ────────────────────────────────────────────────

const LoadingSkeleton = memo(function LoadingSkeleton({ mode }: { mode: Mode }) {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="text-center py-8 space-y-3">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <p className="text-sm font-medium text-foreground">
            {mode === "pro" ? "Building your content pipeline..." : "Generating content..."}
          </p>
        </div>
        <p className="text-xs text-muted-foreground">This usually takes 5–10 seconds</p>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-24 rounded-xl bg-muted/50" />
      ))}
    </div>
  );
});

// ── Main page ───────────────────────────────────────────────────────

export default function Index() {
  const { settings } = useSettings();
  const locale = settings.language;

  const [mode, setMode] = useState<Mode>("general");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("viral");
  const [platform, setPlatform] = useState(settings.defaultPlatform);
  const [platforms, setPlatforms] = useState<string[]>(["tiktok"]);
  const [contentType, setContentType] = useState("story");
  const [scriptLength, setScriptLength] = useState(settings.defaultScriptLength);
  const [goal, setGoal] = useState("viral");
  const [hookIntensity, setHookIntensity] = useState(
    settings.hookStyle === "safe" ? 0 : settings.hookStyle === "aggressive" ? 2 : 1
  );
  const [imageFormat, setImageFormat] = useState("9:16");
  const [imagePromptCount, setImagePromptCount] = useState("4");
  const [outputDepth, setOutputDepth] = useState("standard");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [generalResult, setGeneralResult] = useState<GeneralResult | null>(null);
  const [proResult, setProResult] = useState<ProResult | null>(null);

  const togglePlatform = useCallback((value: string) => {
    setPlatforms((prev) => {
      if (prev.includes(value)) {
        return prev.length > 1 ? prev.filter((p) => p !== value) : prev;
      }
      return [...prev, value];
    });
  }, []);

  const copyToClipboard = useCallback(async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success(t("btn.copied", locale));
    setTimeout(() => setCopied(""), 1200);
  }, [locale]);

  const generateContent = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const body =
        mode === "pro"
          ? {
              mode,
              topic,
              platforms,
              contentType,
              style,
              scriptLength,
              goal,
              hookIntensity,
              imageFormat,
              imagePromptCount: parseInt(imagePromptCount),
              outputDepth,
            }
          : {
              mode,
              topic,
              platform,
              contentType,
              style,
              scriptLength,
              goal,
              hookIntensity,
              imageFormat,
              outputStyle: settings.outputStyle,
            };

      const { data, error } = await supabase.functions.invoke("generate-content", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (mode === "pro") {
        setProResult(data as ProResult);
        setGeneralResult(null);
      } else {
        setGeneralResult(data as GeneralResult);
        setProResult(null);
      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      toast.error(error?.message || "Generation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [mode, topic, platform, platforms, contentType, style, scriptLength, goal, hookIntensity, imageFormat, imagePromptCount, outputDepth, settings.outputStyle]);

  const hasResults = mode === "general" ? generalResult !== null : proResult !== null;

  const copyAll = useCallback(() => {
    let all = "";
    if (mode === "general" && generalResult) {
      all = [
        generalResult.hooks.map((h, i) => `Hook ${i + 1}: ${h}`).join("\n"),
        `Script:\n${generalResult.script}`,
        `Caption:\n${generalResult.caption}`,
        generalResult.imagePrompts.length > 0 ? `Image Prompts:\n${generalResult.imagePrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}` : "",
      ].filter(Boolean).join("\n\n");
    } else if (mode === "pro" && proResult) {
      const s = proResult.script;
      const scriptText = `Hook:\n${s.hook}\n\nBeat 1:\n${s.beat1}\n\nBeat 2:\n${s.beat2}\n\nBeat 3:\n${s.beat3}\n\nCTA:\n${s.cta}`;
      all = [
        `🏆 BEST HOOK:\n${proResult.bestHook}`,
        proResult.hookVariations?.length ? `🎯 HOOK VARIATIONS:\n${proResult.hookVariations.map((v, i) => `V${i + 1}: ${v}`).join("\n")}` : "",
        `📝 SCRIPT:\n${scriptText}`,
        proResult.tiktokCaption ? `TikTok:\n${proResult.tiktokCaption}` : "",
        proResult.youtubeTitle ? `YouTube:\n${proResult.youtubeTitle}\n${proResult.youtubeDescription}` : "",
        proResult.instagramCaption ? `Instagram:\n${proResult.instagramCaption}` : "",
        proResult.editingPlan?.length ? `🎬 EDITING PLAN:\n${proResult.editingPlan.map((sc) => `Scene ${sc.scene} (${sc.duration})\nVisual: ${sc.visual}\nAudio: ${sc.audio}`).join("\n\n")}` : "",
        proResult.voiceStyle ? `🎙️ VOICE: ${proResult.voiceStyle}` : "",
        proResult.postingStrategy ? `📅 POSTING:\nBest Time: ${proResult.postingStrategy.bestTime}\nTip: ${proResult.postingStrategy.platformTip}` : "",
        `🖼️ IMAGE PROMPTS:\n${proResult.imagePrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
      ].filter(Boolean).join("\n\n");
    }
    copyToClipboard("all", all);
  }, [mode, generalResult, proResult, copyToClipboard]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") generateContent();
  }, [generateContent]);

  const hookLabel = useMemo(() => [
    t("hook.low", locale), t("hook.medium", locale), t("hook.high", locale),
  ][hookIntensity], [hookIntensity, locale]);

  const lengthOptions = mode === "pro" ? PRO_LENGTH_OPTIONS : FREE_LENGTH_OPTIONS;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="py-10 px-4 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-3 pt-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              {t("app.title", locale)}
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
              {t("app.subtitle", locale)}
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center justify-center gap-2 p-1 rounded-xl bg-muted">
            <button
              onClick={() => setMode("general")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "general" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Zap className="h-4 w-4" />
              Free
            </button>
            <button
              onClick={() => setMode("pro")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "pro" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Crown className="h-4 w-4" />
              Pro
            </button>
          </div>

          {/* Input Card */}
          <Card className="shadow-[var(--shadow-card)] border-border/50">
            <CardContent className="p-5 space-y-4">
              {/* Topic */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-foreground">{t("input.topic", locale)}</label>
                <Input
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={t("input.topic.placeholder", locale)}
                  className="h-11 rounded-xl border-border/60 bg-background"
                  onKeyDown={handleKeyDown}
                />
              </div>

              {/* Platform: single select for free, multi-select for pro */}
              {mode === "general" ? (
                <SelectorField label={t("selector.platform", locale)}>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORM_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </SelectorField>
              ) : (
                <SelectorField label="Platforms (select multiple)">
                  <div className="flex gap-2">
                    {PLATFORM_OPTIONS.map((o) => {
                      const selected = platforms.includes(o.value);
                      return (
                        <button
                          key={o.value}
                          onClick={() => togglePlatform(o.value)}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                            selected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-background text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          <o.icon className="h-3.5 w-3.5" />
                          {o.label.split(" ")[0]}
                        </button>
                      );
                    })}
                  </div>
                </SelectorField>
              )}

              {/* Shared selectors */}
              <div className="grid grid-cols-3 gap-3">
                <SelectorField label={t("selector.content", locale)}>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SelectorField>
                <SelectorField label={t("selector.style", locale)}>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STYLE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SelectorField>
                <SelectorField label={t("selector.length", locale)} icon={<Clock className="h-3 w-3" />}>
                  <Select value={scriptLength} onValueChange={setScriptLength}>
                    <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {lengthOptions.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SelectorField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <SelectorField label={t("selector.goal", locale)}>
                  <Select value={goal} onValueChange={setGoal}>
                    <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GOAL_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SelectorField>
                <SelectorField label={t("selector.format", locale)} icon={<ImageIcon className="h-3 w-3" />}>
                  <Select value={imageFormat} onValueChange={setImageFormat}>
                    <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {IMAGE_FORMAT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SelectorField>
              </div>

              {/* Pro-only controls */}
              {mode === "pro" && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-border/50">
                  <SelectorField label="Image Prompts" icon={<Image className="h-3 w-3" />}>
                    <Select value={imagePromptCount} onValueChange={setImagePromptCount}>
                      <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {IMAGE_COUNT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </SelectorField>
                  <SelectorField label="Output Depth">
                    <Select value={outputDepth} onValueChange={setOutputDepth}>
                      <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OUTPUT_DEPTH_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </SelectorField>
                </div>
              )}

              {/* Hook intensity */}
              <div className="space-y-2">
                <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Flame className="h-3 w-3" /> {t("selector.hookIntensity", locale)}
                </label>
                <div className="flex items-center gap-3">
                  <Slider
                    value={[hookIntensity]}
                    onValueChange={(v) => setHookIntensity(v[0])}
                    min={0} max={2} step={1}
                    className="flex-1"
                  />
                  <span className="text-xs font-semibold text-foreground w-14 text-right">{hookLabel}</span>
                </div>
              </div>

              {/* Generate */}
              <Button
                variant="generate"
                size="lg"
                className="w-full h-11"
                disabled={!topic.trim() || loading}
                onClick={generateContent}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t("btn.generating", locale)}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {mode === "pro" ? t("btn.generatePro", locale) : t("btn.generate", locale)}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Action Bar */}
          {hasResults && !loading && (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" disabled={loading} onClick={generateContent}>
                <RefreshCw className="h-3 w-3" />
                {t("btn.regenerate", locale)}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={copyAll}>
                <Copy className="h-3 w-3" />
                {copied === "all" ? t("btn.copied", locale) : t("btn.copyAll", locale)}
              </Button>
            </div>
          )}

          {/* Loading */}
          {loading && <LoadingSkeleton mode={mode} />}

          {/* Results */}
          {!loading && mode === "general" && generalResult && (
            <GeneralResults result={generalResult} copied={copied} onCopy={copyToClipboard} />
          )}
          {!loading && mode === "pro" && proResult && (
            <ProResults result={proResult} platforms={platforms} copied={copied} onCopy={copyToClipboard} />
          )}

          {/* Empty state */}
          {!hasResults && !loading && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {t("empty.text", locale)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
