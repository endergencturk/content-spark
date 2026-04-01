import React, { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { History, RotateCcw, Play, Clock, Hash, Youtube, Instagram } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { t, type Locale } from "@/lib/i18n";

interface HistoryItem {
  id: string;
  topic: string;
  platforms: string[];
  duration: string;
  style: string;
  content_type: string;
  goal: string;
  plan_type: string;
  output_json: any;
  language: string;
  created_at: string;
}

interface HistoryDrawerProps {
  deviceId: string;
  isPro: boolean;
  locale: Locale;
  onReuse: (topic: string) => void;
  onReopen: (item: HistoryItem) => void;
}

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  tiktok: Hash,
  "youtube-shorts": Youtube,
  "instagram-reels": Instagram,
};

function getFirstHook(output: any): string {
  if (!output) return "";
  if (output.bestHook) return output.bestHook;
  if (output.hooks?.length) return output.hooks[0];
  if (output.hookVariations?.length) return output.hookVariations[0];
  return "";
}

function formatDate(dateStr: string, locale: Locale): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HistoryDrawer({ deviceId, isPro, locale, onReuse, onReopen }: HistoryDrawerProps) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !deviceId) return;
    setLoading(true);

    const limit = isPro ? 50 : 3;
    supabase
      .from("generations")
      .select("*")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(limit)
      .then(({ data, error }) => {
        if (!error && data) {
          setItems(data as unknown as HistoryItem[]);
        }
        setLoading(false);
      });
  }, [open, deviceId, isPro]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 rounded-xl text-xs">
          <History className="h-3.5 w-3.5" />
          {t("history.title", locale)}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            {t("history.title", locale)}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-3">
          {loading && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("history.loading", locale)}
            </p>
          )}

          {!loading && items.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t("history.empty", locale)}
            </p>
          )}

          {items.map((item) => {
            const hook = getFirstHook(item.output_json);
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-border/50 bg-muted/30 p-4 space-y-2 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => {
                  onReopen(item);
                  setOpen(false);
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{item.topic}</p>
                    {hook && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">⭐ {hook}</p>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg ${
                    item.plan_type === "pro"
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {item.plan_type}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDate(item.created_at, locale)}
                  </span>
                  <span>{item.duration}s</span>
                  <div className="flex gap-1">
                    {item.platforms?.map((p) => {
                      const Icon = PLATFORM_ICONS[p];
                      return Icon ? <Icon key={p} className="h-3 w-3" /> : null;
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-1" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="text-[11px] font-medium text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                    onClick={() => {
                      onReuse(item.topic);
                      setOpen(false);
                    }}
                  >
                    <Play className="h-3 w-3" />
                    {t("history.reuse", locale)}
                  </button>
                </div>
              </div>
            );
          })}

          {!isPro && items.length > 0 && (
            <p className="text-xs text-muted-foreground text-center pt-2">
              {t("history.proUnlock", locale)}
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
