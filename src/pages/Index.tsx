import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Sparkles, Loader2, Lightbulb, FileText, MessageSquare } from "lucide-react";

const API_URL = "https://api.openai.com/v1/chat/completions";

interface GeneratedResult {
  hooks: string[];
  script: string;
  caption: string;
}

export default function Index() {
  const [topic, setTopic] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GeneratedResult | null>(null);
  const [copied, setCopied] = useState("");

  const canGenerate = useMemo(() => {
    return topic.trim().length > 0 && apiKey.trim().length > 0 && !loading;
  }, [topic, apiKey, loading]);

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1500);
    } catch {
      setCopied("");
    }
  }

  async function generateContent() {
    if (!topic.trim()) {
      setError("Please enter a topic.");
      return;
    }
    if (!apiKey.trim()) {
      setError("Please enter your API key.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    const prompt = `You are a helpful content writing assistant.

Topic: ${topic}

Return valid JSON with this exact structure:
{
  "hooks": ["hook 1", "hook 2", "hook 3"],
  "script": "short beginner-friendly video script",
  "caption": "short social media caption"
}

Rules:
- Hooks should be punchy and scroll-stopping.
- Script should be clear, short, and easy to speak on camera.
- Caption should be concise and engaging.
- Do not include markdown.
- Return JSON only.`;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4.1-mini",
          messages: [
            { role: "system", content: "You generate short-form content ideas in clean JSON." },
            { role: "user", content: prompt },
          ],
          temperature: 0.8,
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Request failed.");
      }

      const data = await response.json();
      const parsed = JSON.parse(data.choices[0].message.content);

      setResult({
        hooks: Array.isArray(parsed.hooks) ? parsed.hooks.slice(0, 3) : [],
        script: parsed.script || "",
        caption: parsed.caption || "",
      });
    } catch (err) {
      setError("Something went wrong while generating content. Check your API key and try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

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
            Enter a topic, connect your API key, and generate short-form content ideas in one click.
          </p>
        </div>

        {/* Input Section */}
        <Card className="border-border/60 shadow-lg">
          <CardContent className="p-6 space-y-4">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Topic</label>
                <Input
                  placeholder='e.g. "meal prep for students"'
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="h-12 rounded-2xl"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">API Key</label>
                <Input
                  type="password"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="h-12 rounded-2xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Button
                variant="generate"
                size="lg"
                className="w-full h-12"
                disabled={!canGenerate}
                onClick={generateContent}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate"
                )}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                No login system. Your key is used only for the API request from this page.
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Results */}
        <div className="space-y-4">
          {/* Hooks */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-primary" />
                3 Hooks
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result?.hooks?.length ? (
                <div className="space-y-3">
                  {result.hooks.map((hook, index) => (
                    <div key={index} className="flex items-start justify-between gap-3 rounded-xl bg-surface-warm p-3">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold text-primary">Hook {index + 1}:</span> {hook}
                      </p>
                      <Button
                        variant="copyBtn"
                        size="sm"
                        onClick={() => copyText(`hook-${index}`, hook)}
                      >
                        <Copy className="h-3 w-3" />
                        {copied === `hook-${index}` ? "Copied" : "Copy"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Your hooks will appear here.</p>
              )}
            </CardContent>
          </Card>

          {/* Script */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Script
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result?.script ? (
                <div className="space-y-3">
                  <div className="rounded-xl bg-surface-warm p-4">
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{result.script}</p>
                  </div>
                  <Button
                    variant="copyBtn"
                    size="sm"
                    onClick={() => copyText("script", result.script)}
                  >
                    <Copy className="h-3 w-3" />
                    {copied === "script" ? "Copied" : "Copy"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Your script will appear here.</p>
              )}
            </CardContent>
          </Card>

          {/* Caption */}
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Caption
              </CardTitle>
            </CardHeader>
            <CardContent>
              {result?.caption ? (
                <div className="space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">{result.caption}</p>
                  <Button
                    variant="copyBtn"
                    size="sm"
                    onClick={() => copyText("caption", result.caption)}
                  >
                    <Copy className="h-3 w-3" />
                    {copied === "caption" ? "Copied" : "Copy"}
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic">Your caption will appear here.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Beginner Notes */}
        <Card className="border-border/60 bg-accent/30">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-foreground mb-2">Beginner notes</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
              <li>Type a topic like "meal prep for students" or "freelance design tips".</li>
              <li>Paste your API key to make the request.</li>
              <li>Click Generate to get 3 hooks, 1 script, and 1 caption.</li>
              <li>Use the Copy buttons to quickly reuse any output.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
