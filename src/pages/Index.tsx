import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Copy, Loader2, Sparkles, Lightbulb, FileText, MessageSquare, RefreshCw, Image, Clock, Flame, Star, Zap, Crown, Hash, Youtube, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

const HOOK_INTENSITY_LABELS = ["Low", "Medium", "High"] as const;

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

function CopyButton({ text, label, copied, onCopy }: { text: string; label: string; copied: string; onCopy: (k: string, t: string) => void }) {
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
}

function SelectorField({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

export default function Index() {
  const [mode, setMode] = useState<Mode>("general");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("viral");
  const [platform, setPlatform] = useState("tiktok");
  const [contentType, setContentType] = useState("story");
  const [scriptLength, setScriptLength] = useState("30");
  const [goal, setGoal] = useState("viral");
  const [hookIntensity, setHookIntensity] = useState(1);
  const [imageFormat, setImageFormat] = useState("9:16");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [generalResult, setGeneralResult] = useState<GeneralResult | null>(null);
  const [proResult, setProResult] = useState<ProResult | null>(null);

  const copyToClipboard = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1200);
  };

  const generateContent = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-content", {
        body: { mode, topic, platform, contentType, style, scriptLength, goal, hookIntensity, imageFormat },
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
  };

  const hasResults = mode === "general" ? generalResult !== null : proResult !== null;

  const copyAll = () => {
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
  };

  return (
    <div className="min-h-screen bg-background py-10 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 pt-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-sm">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            AI Content Engine
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Create content that stops the scroll
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto leading-relaxed">
            Your content isn't bad. Your hook is. Fix it in seconds.
          </p>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center justify-center gap-2 p-1 rounded-xl bg-muted">
          <button
            onClick={() => setMode("general")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === "general"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="h-4 w-4" />
            General
          </button>
          <button
            onClick={() => setMode("pro")}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === "pro"
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Crown className="h-4 w-4" />
            Shorts Creator Pro
          </button>
        </div>

        {/* Input Card */}
        <Card className="shadow-[var(--shadow-card)] border-border/50">
          <CardContent className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Topic</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. fitness tips, AI tools, crypto investing..."
                className="h-11 rounded-xl border-border/60 bg-background"
                onKeyDown={(e) => e.key === "Enter" && generateContent()}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <SelectorField label="Platform">
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </SelectorField>
              <SelectorField label="Content">
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </SelectorField>
              <SelectorField label="Style">
                <Select value={style} onValueChange={setStyle}>
                  <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STYLE_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </SelectorField>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <SelectorField label="Length" icon={<Clock className="h-3 w-3" />}>
                <Select value={scriptLength} onValueChange={setScriptLength}>
                  <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SCRIPT_LENGTH_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </SelectorField>
              <SelectorField label="Goal">
                <Select value={goal} onValueChange={setGoal}>
                  <SelectTrigger className="h-9 rounded-lg text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {GOAL_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </SelectorField>
              <SelectorField label="Format" icon={<ImageIcon className="h-3 w-3" />}>
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
                <Flame className="h-3 w-3" /> Hook Intensity
              </label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[hookIntensity]}
                  onValueChange={(v) => setHookIntensity(v[0])}
                  min={0} max={2} step={1}
                  className="flex-1"
                />
                <span className="text-xs font-semibold text-foreground w-14 text-right">
                  {HOOK_INTENSITY_LABELS[hookIntensity]}
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
                  Generating viral content...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  {mode === "pro" ? "Generate Full Pipeline" : "Generate Content"}
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
              Regenerate
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground" onClick={copyAll}>
              <Copy className="h-3 w-3" />
              {copied === "all" ? "Copied!" : "Copy All"}
            </Button>
          </div>
        )}

        {/* General Mode Results */}
        {mode === "general" && generalResult && (
          <div className="space-y-4">
            <ResultCard title="Hooks" icon={<Lightbulb className="h-4 w-4 text-primary" />}>
              <div className="space-y-2">
                {generalResult.hooks.map((hook, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-3">
                    <p className="text-sm text-foreground leading-relaxed">
                      <span className="font-semibold text-primary mr-1">#{i + 1}</span>
                      {hook}
                    </p>
                    <CopyButton text={hook} label={`hook-${i}`} copied={copied} onCopy={copyToClipboard} />
                  </div>
                ))}
              </div>
            </ResultCard>

            <ResultCard title="Script" icon={<FileText className="h-4 w-4 text-primary" />}>
              <div className="rounded-lg bg-muted/50 p-4">
                {generalResult.script.split("\n").map((line, i) => (
                  <p key={i} className="text-sm text-foreground leading-loose">{line || <br />}</p>
                ))}
              </div>
              <CopyButton text={generalResult.script} label="script" copied={copied} onCopy={copyToClipboard} />
            </ResultCard>

            <ResultCard title="Caption" icon={<MessageSquare className="h-4 w-4 text-primary" />}>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{generalResult.caption}</p>
              <CopyButton text={generalResult.caption} label="caption" copied={copied} onCopy={copyToClipboard} />
            </ResultCard>

            <ResultCard title="Image Prompts" icon={<Image className="h-4 w-4 text-primary" />}>
              <div className="space-y-2">
                {generalResult.imagePrompts.map((p, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground leading-relaxed"><span className="font-semibold text-foreground mr-1">{i + 1}.</span>{p}</p>
                    <CopyButton text={p} label={`img-${i}`} copied={copied} onCopy={copyToClipboard} />
                  </div>
                ))}
              </div>
            </ResultCard>
          </div>
        )}

        {/* Pro Mode Results */}
        {mode === "pro" && proResult && (
          <div className="space-y-4">
            {/* Topics & Hooks */}
            <ResultCard title="Viral Topics & Hooks" icon={<Lightbulb className="h-4 w-4 text-primary" />}>
              <div className="space-y-4">
                {proResult.topics.map((topic, ti) => (
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
                        <CopyButton text={hook.text} label={`pro-hook-${ti}-${hi}`} copied={copied} onCopy={copyToClipboard} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </ResultCard>

            {/* Script */}
            <ResultCard title="Voiceover Script" icon={<FileText className="h-4 w-4 text-primary" />}>
              <div className="rounded-lg bg-muted/50 p-4">
                {proResult.script.split("\n").map((line, i) => (
                  <p key={i} className="text-sm text-foreground leading-loose">{line || <br />}</p>
                ))}
              </div>
              <CopyButton text={proResult.script} label="pro-script" copied={copied} onCopy={copyToClipboard} />
            </ResultCard>

            {/* YouTube */}
            <ResultCard title="YouTube Title & Description" icon={<Youtube className="h-4 w-4 text-primary" />}>
              <div className="space-y-3">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Title</p>
                  <p className="text-sm font-semibold text-foreground">{proResult.youtubeTitle}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1">Description</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{proResult.youtubeDescription}</p>
                </div>
              </div>
              <CopyButton text={`${proResult.youtubeTitle}\n\n${proResult.youtubeDescription}`} label="youtube" copied={copied} onCopy={copyToClipboard} />
            </ResultCard>

            {/* TikTok Caption */}
            <ResultCard title="TikTok Caption" icon={<Hash className="h-4 w-4 text-primary" />}>
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{proResult.tiktokCaption}</p>
              <CopyButton text={proResult.tiktokCaption} label="tiktok" copied={copied} onCopy={copyToClipboard} />
            </ResultCard>

            {/* Image Prompts */}
            <ResultCard title="Image Prompts" icon={<Image className="h-4 w-4 text-primary" />}>
              <div className="space-y-2">
                {proResult.imagePrompts.map((p, i) => (
                  <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs text-muted-foreground leading-relaxed"><span className="font-semibold text-foreground mr-1">{i + 1}.</span>{p}</p>
                    <CopyButton text={p} label={`pro-img-${i}`} copied={copied} onCopy={copyToClipboard} />
                  </div>
                ))}
              </div>
            </ResultCard>
          </div>
        )}

        {/* Empty state */}
        {!hasResults && !loading && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            Enter a topic and hit generate to create your content.
          </div>
        )}
      </div>
    </div>
  );
}

function ResultCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
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
}
