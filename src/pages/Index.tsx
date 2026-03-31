import React, { useState, useCallback, useMemo, memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Copy, Loader2, Sparkles, Lightbulb, FileText, MessageSquare, RefreshCw, Image, Clock, Flame, Star, Zap, Crown, Hash, Youtube, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useSettings } from "@/contexts/SettingsContext";
import { t } from "@/lib/i18n";

const STYLE_OPTIONS = [
  { value: "viral", label: "Viral (general)" },
  { value: "dark", label: "Dark / Mystery" },
  { value: "educational", label: "Educational" },
  { value: "storytelling", label: "Storytelling" },
  { value: "aggressive", label: "Aggressive" },
];

const PLATFORM_OPTIONS = [
  { value: "tiktok", label: "TikTok" },
  { value: "youtube-shorts", label: "YouTube Shorts" },
  { value: "instagram-reels", label: "Instagram Reels" },
];

const CONTENT_TYPE_OPTIONS = [
  { value: "story", label: "Story" },
  { value: "educational", label: "Educational" },
  { value: "selling", label: "Selling" },
  { value: "entertainment", label: "Entertainment" },
];

const SCRIPT_LENGTH_OPTIONS = [
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
  { value: "60", label: "60s" },
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

type Mode = "general" | "pro";

interface GeneralResult {
  hooks: string[];
  script: string;
  caption: string;
  imagePrompts: string[];
}

interface ProTopic {
  title: string;
  hooks: { type: string; text: string; best: boolean }[];
}

interface ProResult {
  topics: ProTopic[];
  script: string;
  youtubeTitle: string;
  youtubeDescription: string;
  tiktokCaption: string;
  imagePrompts: string[];
}

// ─── Memoized sub-components ────────────────────────────────────────

const CopyButton = memo(function CopyButton({ text, label, copied, onCopy }: { text: string; label: string; copied: string; onCopy: (k: string, t: string) => void }) {
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

const SelectorField = memo(function SelectorField({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
});

const ResultCard = memo(function ResultCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="shadow-[var(--shadow-card)] border-border/50 hover:shadow-[var(--shadow-card-hover)] transition-shadow">
      <CardHeader className="pb-3 pt-4 px-5">
        <CardTitle className="text-sm font-bold flex items-center gap-2 text-foreground">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 pb-4 space-y-3">
        {children}
      </CardContent>
    </Card>
  );
});

// ─── General results ────────────────────────────────────────────────

const GeneralResults = memo(function GeneralResults({ result, copied, onCopy }: { result: GeneralResult; copied: string; onCopy: (k: string, t: string) => void }) {
  return (
    <div className="space-y-4">
      <ResultCard title="Hooks" icon={<Lightbulb className="h-4 w-4 text-primary" />}>
        <div className="space-y-2">
          {result.hooks.map((hook, i) => (
            <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-3">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="font-semibold text-primary mr-1">#{i + 1}</span>
                {hook}
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
              <p className="text-xs text-muted-foreground leading-relaxed"><span className="font-semibold text-foreground mr-1">{i + 1}.</span>{p}</p>
              <CopyButton text={p} label={`img-${i}`} copied={copied} onCopy={onCopy} />
            </div>
          ))}
        </div>
      </ResultCard>
    </div>
  );
});

// ─── Pro results ────────────────────────────────────────────────────

const ProResults = memo(function ProResults({ result, copied, onCopy }: { result: ProResult; copied: string; onCopy: (k: string, t: string) => void }) {
  return (
    <div className="space-y-4">
      <ResultCard title="Viral Topics & Hooks" icon={<Lightbulb className="h-4 w-4 text-primary" />}>
        <div className="space-y-4">
          {result.topics.map((topic, ti) => (
            <div key={ti} className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                <span className="text-xs font-bold text-primary bg-primary/10 rounded px-1.5 py-0.5">{ti + 1}</span>
                {topic.title}
              </h4>
              {topic.hooks.map((hook, hi) => (
                <div key={hi} className={`flex items-start justify-between gap-2 rounded-lg p-3 ${hook.best ? "bg-primary/5 border border-primary/20" : "bg-muted/50"}`}>
                  <p className="text-sm text-foreground leading-relaxed">
                    {hook.best && <Star className="h-3.5 w-3.5 text-primary inline mr-1 -mt-0.5" />}
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mr-2">{hook.type}</span>
                    {hook.text}
                  </p>
                  <CopyButton text={hook.text} label={`pro-hook-${ti}-${hi}`} copied={copied} onCopy={onCopy} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </ResultCard>

      <ResultCard title="Voiceover Script" icon={<FileText className="h-4 w-4 text-primary" />}>
        <div className="rounded-lg bg-muted/50 p-4">
          {result.script.split("\n").map((line, i) => (
            <p key={i} className="text-sm text-foreground leading-loose">{line || <br />}</p>
          ))}
        </div>
        <CopyButton text={result.script} label="pro-script" copied={copied} onCopy={onCopy} />
      </ResultCard>

      <ResultCard title="YouTube Title & Description" icon={<Youtube className="h-4 w-4 text-primary" />}>
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

      <ResultCard title="TikTok Caption" icon={<Hash className="h-4 w-4 text-primary" />}>
        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{result.tiktokCaption}</p>
        <CopyButton text={result.tiktokCaption} label="tiktok" copied={copied} onCopy={onCopy} />
      </ResultCard>

      <ResultCard title="Image Prompts" icon={<Image className="h-4 w-4 text-primary" />}>
        <div className="space-y-2">
          {result.imagePrompts.map((p, i) => (
            <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground leading-relaxed"><span className="font-semibold text-foreground mr-1">{i + 1}.</span>{p}</p>
              <CopyButton text={p} label={`pro-img-${i}`} copied={copied} onCopy={onCopy} />
            </div>
          ))}
        </div>
      </ResultCard>
    </div>
  );
});

// ─── Main page ──────────────────────────────────────────────────────

export default function Index() {
  const { settings } = useSettings();
  const locale = settings.language;

  const [mode, setMode] = useState<Mode>("general");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("viral");
  const [platform, setPlatform] = useState(settings.defaultPlatform);
  const [contentType, setContentType] = useState("story");
  const [scriptLength, setScriptLength] = useState(settings.defaultScriptLength);
  const [goal, setGoal] = useState("viral");
  const [hookIntensity, setHookIntensity] = useState(
    settings.hookStyle === "safe" ? 0 : settings.hookStyle === "aggressive" ? 2 : 1
  );
  const [imageFormat, setImageFormat] = useState("9:16");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [generalResult, setGeneralResult] = useState<GeneralResult | null>(null);
  const [proResult, setProResult] = useState<ProResult | null>(null);

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
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { mode, topic, platform, contentType, style, scriptLength, goal, hookIntensity, imageFormat, outputStyle: settings.outputStyle },
      });
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
  }, [mode, topic, platform, contentType, style, scriptLength, goal, hookIntensity, imageFormat, settings.outputStyle]);

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
      const topicsText = proResult.topics.map((t, i) => {
        const hooks = t.hooks.map(h => `  ${h.best ? "⭐ " : ""}[${h.type}] ${h.text}`).join("\n");
        return `Topic ${i + 1}: ${t.title}\n${hooks}`;
      }).join("\n\n");
      all = [
        topicsText,
        `Script:\n${proResult.script}`,
        `YouTube Title: ${proResult.youtubeTitle}`,
        `YouTube Description:\n${proResult.youtubeDescription}`,
        `TikTok Caption:\n${proResult.tiktokCaption}`,
        `Image Prompts:\n${proResult.imagePrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`,
      ].filter(Boolean).join("\n\n");
    }
    copyToClipboard("all", all);
  }, [mode, generalResult, proResult, copyToClipboard]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") generateContent();
  }, [generateContent]);

  const hookLabel = useMemo(() => [
    t("hook.low", locale),
    t("hook.medium", locale),
    t("hook.high", locale),
  ][hookIntensity], [hookIntensity, locale]);

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
              {t("mode.general", locale)}
            </button>
            <button
              onClick={() => setMode("pro")}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                mode === "pro" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Crown className="h-4 w-4" />
              {t("mode.pro", locale)}
            </button>
          </div>

          {/* Input Card */}
          <Card className="shadow-[var(--shadow-card)] border-border/50">
            <CardContent className="p-5 space-y-4">
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

              <div className="grid grid-cols-3 gap-3">
                <SelectorField label={t("selector.platform", locale)}>
                  <Select value={platform} onValueChange={setPlatform}>
                    <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PLATFORM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SelectorField>
                <SelectorField label={t("selector.content", locale)}>
                  <Select value={contentType} onValueChange={setContentType}>
                    <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CONTENT_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SelectorField>
                <SelectorField label={t("selector.style", locale)}>
                  <Select value={style} onValueChange={setStyle}>
                    <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STYLE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SelectorField>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <SelectorField label={t("selector.length", locale)} icon={<Clock className="h-3 w-3" />}>
                  <Select value={scriptLength} onValueChange={setScriptLength}>
                    <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SCRIPT_LENGTH_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SelectorField>
                <SelectorField label={t("selector.goal", locale)}>
                  <Select value={goal} onValueChange={setGoal}>
                    <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GOAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SelectorField>
                <SelectorField label={t("selector.format", locale)} icon={<ImageIcon className="h-3 w-3" />}>
                  <Select value={imageFormat} onValueChange={setImageFormat}>
                    <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {IMAGE_FORMAT_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </SelectorField>
              </div>

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
                  <span className="text-xs font-semibold text-foreground w-14 text-right">
                    {hookLabel}
                  </span>
                </div>
              </div>

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
          {hasResults && (
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" disabled={loading} onClick={generateContent}>
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                {t("btn.regenerate", locale)}
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={copyAll}>
                <Copy className="h-3 w-3" />
                {copied === "all" ? t("btn.copied", locale) : t("btn.copyAll", locale)}
              </Button>
            </div>
          )}

          {/* Results */}
          {mode === "general" && generalResult && (
            <GeneralResults result={generalResult} copied={copied} onCopy={copyToClipboard} />
          )}
          {mode === "pro" && proResult && (
            <ProResults result={proResult} copied={copied} onCopy={copyToClipboard} />
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
