import { memo } from "react";
import { Lock } from "lucide-react";
import { t, type Locale } from "@/lib/i18n";

interface BlurredPreviewProps {
  title: string;
  previewLines: string[];
  onUpgrade: () => void;
  locale?: Locale;
}

export const BlurredPreview = memo(function BlurredPreview({
  title,
  previewLines,
  onUpgrade,
  locale = "en",
}: BlurredPreviewProps) {
  return (
    <div className="space-y-2.5">
      <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">{title}</h3>
      <div className="relative rounded-2xl border border-border/50 overflow-hidden">
        <div className="p-4 space-y-2">
          {previewLines.slice(0, 1).map((line, i) => (
            <p key={i} className="text-sm text-foreground leading-relaxed">{line}</p>
          ))}
        </div>

        <div className="relative px-4 pb-4 space-y-2">
          {previewLines.slice(1, 3).map((line, i) => (
            <p key={i} className="text-sm text-foreground leading-relaxed blur-[6px] select-none" aria-hidden>
              {line || "Lorem ipsum dolor sit amet consectetur adipiscing"}
            </p>
          ))}
          <p className="text-sm text-foreground leading-relaxed blur-[6px] select-none" aria-hidden>
            This premium content will transform your strategy
          </p>
        </div>

        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-background via-background/90 to-transparent flex items-end justify-center pb-4">
          <button
            onClick={onUpgrade}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-2xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm"
          >
            <Lock className="h-3.5 w-3.5" />
            {t("blurred.unlock", locale)} {title.toLowerCase()}
          </button>
        </div>
      </div>
    </div>
  );
});
