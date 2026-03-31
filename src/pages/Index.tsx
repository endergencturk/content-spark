import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Copy, Loader2, Sparkles, Lightbulb, FileText, MessageSquare, RefreshCw, Image } from "lucide-react";

const STYLE_OPTIONS = [
  { value: "viral", label: "Viral (general)" },
  { value: "dark", label: "Dark / Mystery" },
  { value: "educational", label: "Educational" },
  { value: "storytelling", label: "Storytelling" },
  { value: "aggressive", label: "Aggressive / Controversial" },
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

interface GeneratedResult {
  hooks: string[];
  script: string;
  caption: string;
  imagePrompts: string[];
}

async function fakeGenerateApi(
  topic: string,
  style: string,
  platform: string,
  contentType: string
): Promise<GeneratedResult> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  const styleLabel = STYLE_OPTIONS.find((s) => s.value === style)?.label ?? style;
  const platformLabel = PLATFORM_OPTIONS.find((p) => p.value === platform)?.label ?? platform;
  const contentLabel = CONTENT_TYPE_OPTIONS.find((c) => c.value === contentType)?.label ?? contentType;

  const platformTone = {
    tiktok: "fast-paced, punchy, trend-driven",
    "youtube-shorts": "slightly longer, value-packed, search-friendly",
    "instagram-reels": "aesthetic, polished, visually driven",
  }[platform] ?? "engaging";

  const contentTone = {
    story: "narrative arc with a personal angle",
    educational: "clear takeaways and actionable steps",
    selling: "desire-building with a strong CTA",
    entertainment: "humor and relatability",
  }[contentType] ?? "engaging";

  return {
    hooks: [
      `Nobody talks about this part of ${topic}... [${styleLabel} · ${platformLabel}]`,
      `3 things I wish I knew earlier about ${topic} [${contentLabel} · ${platformLabel}]`,
      `The easiest way to get started with ${topic} [${styleLabel} · ${contentLabel}]`,
    ],
    script: `Here's a ${styleLabel.toLowerCase()}, ${platformTone} take on ${topic} with a focus on ${contentTone}. First, focus on the basics instead of trying to do everything at once. Then, practice consistently and keep things simple. Optimized for ${platformLabel} format. If you stay consistent, you'll improve much faster than you think.`,
    caption: `${topic}, made simple. Save this for later. #${style} #${platform} #${contentType}`,
    imagePrompts: [
      `Cinematic wide shot related to ${topic}, moody lighting, vertical 9:16 aspect ratio, no text overlay, no human faces, ${platformTone} aesthetic, photorealistic`,
      `Abstract visual metaphor for ${topic}, dramatic color grading, vertical 9:16, no text, no faces, cinematic depth of field, ${styleLabel.toLowerCase()} mood`,
      `Atmospheric scene evoking ${topic}, golden hour lighting, vertical 9:16 composition, no text, no faces, cinematic film grain, ${contentLabel.toLowerCase()} tone`,
    ],
  };
}

export default function Index() {
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("viral");
  const [platform, setPlatform] = useState("tiktok");
  const [contentType, setContentType] = useState("story");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [result, setResult] = useState<GeneratedResult>({
    hooks: [],
    script: "",
    caption: "",
    imagePrompts: [],
  });

  const copyToClipboard = async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 1200);
  };

  const generateContent = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    try {
      const response = await fakeGenerateApi(topic, style, platform, contentType);
      setResult(response);
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2 pt-4 pb-2">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground mb-2">
            <Sparkles className="h-4 w-4" />
            Simple Content Generator
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
            Generate hooks, a script, and a caption
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Enter a topic and generate quick content ideas with a clean, simple UI.
          </p>
          <p className="text-center font-semibold text-foreground max-w-sm mx-auto pt-2 leading-relaxed">
            Your content isn't bad.<br />
            Your hook is.<br />
            Fix it in seconds.
          </p>
        </div>

        {/* Input Section */}
        <Card className="border-border/60 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Topic</label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Example: fitness tips for beginners"
                className="h-12 rounded-2xl"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Platform</label>
                <Select value={platform} onValueChange={setPlatform}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Content Type</label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder="Select content type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Style</label>
              <Select value={style} onValueChange={setStyle}>
                <SelectTrigger className="h-12 rounded-2xl">
                  <SelectValue placeholder="Select a style" />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="generate"
              size="lg"
              className="w-full h-12"
              disabled={!topic.trim() || loading}
              onClick={generateContent}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating viral content...
                </>
              ) : (
                "Generate"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {/* Copy All & Regenerate */}
          {(result.hooks.length > 0 || result.script || result.caption) && (
            <div className="flex justify-end gap-2">
              <Button
                variant="copyBtn"
                size="sm"
                disabled={loading}
                onClick={generateContent}
              >
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
              <Button
                variant="copyBtn"
                size="sm"
                onClick={() => {
                  const all = [
                    result.hooks.map((h, i) => `Hook ${i + 1}: ${h}`).join("\n"),
                    result.script ? `Script:\n${result.script}` : "",
                    result.caption ? `Caption:\n${result.caption}` : "",
                    result.imagePrompts.length > 0
                      ? `Image Prompts:\n${result.imagePrompts.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
                      : "",
                  ].filter(Boolean).join("\n\n");
                  copyToClipboard("all", all);
                }}
              >
                <Copy className="h-3 w-3" />
                {copied === "all" ? "Copied All" : "Copy All"}
              </Button>
            </div>
          )}

          {/* Hooks */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                3 Hooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.hooks.length > 0 ? (
                <div className="space-y-3">
                  {result.hooks.map((hook, index) => (
                    <div key={index} className="flex items-start justify-between gap-3 rounded-xl bg-surface-warm p-3">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold text-primary">Hook {index + 1}:</span> {hook}
                      </p>
                      <Button
                        variant="copyBtn"
                        size="sm"
                        onClick={() => copyToClipboard(`hook-${index}`, hook)}
                      >
                        <Copy className="h-3 w-3" />
                        {copied === `hook-${index}` ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Hooks will appear here.</p>
              )}
            </CardContent>
          </Card>

          {/* Script */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Script
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.script ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-surface-warm p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{result.script}</p>
                  </div>
                  <Button
                    variant="copyBtn"
                    size="sm"
                    onClick={() => copyToClipboard("script", result.script)}
                  >
                    <Copy className="h-3 w-3" />
                    {copied === "script" ? "Copied" : "Copy"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Script will appear here.</p>
              )}
            </CardContent>
          </Card>

          {/* Caption */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Caption
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.caption ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">{result.caption}</p>
                  <Button
                    variant="copyBtn"
                    size="sm"
                    onClick={() => copyToClipboard("caption", result.caption)}
                  >
                    <Copy className="h-3 w-3" />
                    {copied === "caption" ? "Copied" : "Copy"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Caption will appear here.</p>
              )}
            </CardContent>
          </Card>

          {/* Image Prompts */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Image className="h-5 w-5 text-primary" />
                Image Prompts
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result.imagePrompts.length > 0 ? (
                <div className="space-y-3">
                  {result.imagePrompts.map((prompt, index) => (
                    <div key={index} className="flex items-start justify-between gap-3 rounded-xl bg-surface-warm p-3">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold text-primary">Prompt {index + 1}:</span> {prompt}
                      </p>
                      <Button
                        variant="copyBtn"
                        size="sm"
                        onClick={() => copyToClipboard(`img-${index}`, prompt)}
                      >
                        <Copy className="h-3 w-3" />
                        {copied === `img-${index}` ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Image prompts will appear here.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
