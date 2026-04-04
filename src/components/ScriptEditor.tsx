import React, { useState, useMemo, memo } from "react";
import { Copy } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

interface CharRange {
  min: number;
  max: number;
}

const CHAR_RANGES: Record<string, CharRange> = {
  "15": { min: 160, max: 190 },
  "30": { min: 330, max: 380 },
  "60": { min: 660, max: 760 },
};

function getColor(count: number, range: CharRange): string {
  if (count >= range.min && count <= range.max) return "text-green-500";
  return count < range.min ? "text-yellow-500" : "text-destructive";
}

interface ScriptEditorProps {
  initialScript: string;
  scriptLength: string;
  copied: string;
  onCopy: (key: string, text: string) => void;
  copyLabel: string;
  locale?: Locale;
}

export const ScriptEditor = memo(function ScriptEditor({
  initialScript,
  scriptLength,
  copied,
  onCopy,
  copyLabel,
  locale = "en",
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

  const range = CHAR_RANGES[scriptLength] || CHAR_RANGES["30"];
  const charCount = script.length;
  const estDuration = (charCount * 0.084).toFixed(1);
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
          Est. Duration: {estDuration}s
        </span>
      </div>
      <p className="text-[10px] text-muted-foreground/60 px-1">
        Optimized for ElevenLabs Speed 0.90
      </p>
    </div>
  );
});
