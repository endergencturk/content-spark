import React, { useState, useMemo, memo } from "react";
import { Copy, Scissors, Plus } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";
import { CHAR_TARGETS_BY_SPEED, VOICE_SPEED_CONFIG, type VoiceSpeed } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";

function getColor(count: number, range: { min: number; max: number }): string {
  if (count >= range.min && count <= range.max) return "text-green-500";
  return count < range.min ? "text-yellow-500" : "text-destructive";
}

function makeShorter(script: string): string {
  const lines = script.split("\n").filter((l) => l.trim() !== "");
  if (lines.length <= 6) return script;
  const first3 = lines.slice(0, 3);
  const last3 = lines.slice(-3);
  const middle = lines.slice(3, -3);
  // Remove 2-3 weakest lines from middle (shortest or most generic)
  const toRemove = Math.min(3, middle.length);
  const scored = middle.map((line, i) => ({ line, i, score: line.trim().length }));
  scored.sort((a, b) => a.score - b.score);
  const removeIndices = new Set(scored.slice(0, toRemove).map((s) => s.i));
  const keptMiddle = middle.filter((_, i) => !removeIndices.has(i));
  return [...first3, ...keptMiddle, ...last3].join("\n");
}

const TENSION_LINES = [
  "No warning.",
  "Nothing.",
  "Silence.",
  "The room was still.",
  "Nobody moved.",
  "Not a sound.",
  "Then it stopped.",
  "Something shifted.",
  "No explanation.",
  "Just gone.",
];

function makeLonger(script: string): string {
  const lines = script.split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 6) return script;
  const first3 = lines.slice(0, 3);
  const last3 = lines.slice(-3);
  const middle = lines.slice(3, -3);

  // Pick 2-3 tension lines not already in script
  const existing = new Set(lines.map((l) => l.trim().toLowerCase()));
  const available = TENSION_LINES.filter((t) => !existing.has(t.toLowerCase()));
  const toAdd = available.slice(0, Math.min(3, available.length));

  // Insert tension lines evenly in middle
  const result = [...middle];
  toAdd.forEach((line, i) => {
    const pos = Math.min(result.length, Math.floor((result.length / (toAdd.length + 1)) * (i + 1)));
    result.splice(pos, 0, line);
  });

  return [...first3, ...result, ...last3].join("\n");
}

interface ScriptEditorProps {
  initialScript: string;
  scriptLength: string;
  copied: string;
  onCopy: (key: string, text: string) => void;
  copyLabel: string;
  locale?: Locale;
  voiceSpeed?: VoiceSpeed;
}

export const ScriptEditor = memo(function ScriptEditor({
  initialScript,
  scriptLength,
  copied,
  onCopy,
  copyLabel,
  locale = "en",
  voiceSpeed = "0.9",
}: ScriptEditorProps) {
  const cleanScript = useMemo(
    () =>
      initialScript
        .split("\n")
        .filter((l) => !/^\[.+\]$/.test(l.trim()))
        .map((l) => l.replace(/^LOOP:\s*/i, ""))
        .join("\n"),
    [initialScript]
  );

  const [script, setScript] = useState(cleanScript);

  const targets = CHAR_TARGETS_BY_SPEED[voiceSpeed] || CHAR_TARGETS_BY_SPEED["0.9"];
  const range = targets[scriptLength] || targets["30"];
  const charCount = script.length;
  const wordCount = script.split(/\s+/).filter((w) => w.length > 0).length;
  const secPerChar = VOICE_SPEED_CONFIG[voiceSpeed]?.charPerSec || 0.084;
  const estDuration = (charCount * secPerChar).toFixed(1);
  const colorClass = getColor(charCount, range);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          {t("result.script", locale)}
        </h3>
        <button
          className="shrink-0 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => onCopy(copyLabel, script)}
        >
          <Copy className="h-3 w-3 inline mr-1" />
          {copied === copyLabel ? t("btn.copied", locale) : t("btn.copy", locale)}
        </button>
      </div>
      <textarea
        value={script}
        onChange={(e) => setScript(e.target.value)}
        className="w-full min-h-[120px] rounded-2xl bg-muted/40 border border-border/50 p-4 text-sm leading-loose text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ring-offset-background"
        rows={Math.max(4, script.split("\n").length + 1)}
      />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
        <span className={`text-xs font-semibold ${colorClass}`}>
          Characters: {charCount}{" "}
          <span className="font-normal text-muted-foreground">
            / target: {range.min}–{range.max}
          </span>
        </span>
        <span className="text-xs text-muted-foreground">
          Words: {wordCount}
        </span>
        <span className="text-xs text-muted-foreground">
          Est. Duration: {estDuration}s
        </span>
      </div>
      <div className="flex items-center gap-2 px-1">
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1"
          onClick={() => setScript(makeShorter(script))}
        >
          <Scissors className="h-3 w-3" />
          ✂️ Make Shorter
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="text-xs gap-1"
          onClick={() => setScript(makeLonger(script))}
        >
          <Plus className="h-3 w-3" />
          ➕ Make Longer
        </Button>
      </div>
      <p className="text-[10px] text-muted-foreground/60 px-1">
        Optimized for ElevenLabs Speed {voiceSpeed}
      </p>
    </div>
  );
});
