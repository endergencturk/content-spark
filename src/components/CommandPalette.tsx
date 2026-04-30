import React, { useEffect, useState, useCallback } from "react";
import { Command as CommandPrimitive } from "cmdk";
import {
  Sparkles, PenTool, History as HistoryIcon, Crown, Settings as SettingsIcon,
  Zap, Skull, User, Star, TrendingUp, Wand2, Search, Flame, Calendar,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { type Locale } from "@/lib/i18n";
import { supabase } from "@/integrations/supabase/client";

interface RecentItem {
  id: string;
  topic: string;
}

interface Action {
  id: string;
  label: string;
  shortcut?: string;
  icon: React.ElementType;
  group: string;
  run: () => void;
  keywords?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  locale: Locale;
  deviceId: string;
  onSelectTopic: (topic: string) => void;
  onSwitchMode: (mode: "general" | "pro" | "horror") => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onOpenProfile: () => void;
  onScrollToTrending: () => void;
  onOpenHookLab: () => void;
  onTriggerGenerate: () => void;
  onRandomTopic: () => void;
}

export function CommandPalette({
  open, onOpenChange, locale, deviceId,
  onSelectTopic, onSwitchMode, onOpenHistory, onOpenSettings,
  onOpenProfile, onScrollToTrending, onOpenHookLab, onTriggerGenerate, onRandomTopic,
}: Props) {
  const [recents, setRecents] = useState<RecentItem[]>([]);

  useEffect(() => {
    if (!open || !deviceId) return;
    supabase
      .from("generations")
      .select("id, topic")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(8)
      .then(({ data }) => { if (data) setRecents(data as any); });
  }, [open, deviceId]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  const tr = locale === "tr";
  const actions: Action[] = [
    { id: "gen", label: tr ? "İçerik üret" : "Generate content", shortcut: "⌘↵", icon: Sparkles, group: tr ? "Eylem" : "Actions", run: () => { close(); onTriggerGenerate(); } },
    { id: "random", label: tr ? "Rastgele konu" : "Random topic", icon: Wand2, group: tr ? "Eylem" : "Actions", run: () => { close(); onRandomTopic(); } },
    { id: "hooklab", label: tr ? "Hook Lab'i aç" : "Open Hook Lab", icon: Zap, group: tr ? "Eylem" : "Actions", run: () => { close(); onOpenHookLab(); } },
    { id: "trending", label: tr ? "Trend olanlara git" : "Jump to trending", icon: TrendingUp, group: tr ? "Eylem" : "Actions", run: () => { close(); onScrollToTrending(); } },

    { id: "free", label: tr ? "Free moda geç" : "Switch to Free mode", icon: Zap, group: tr ? "Mod" : "Mode", run: () => { close(); onSwitchMode("general"); } },
    { id: "pro", label: tr ? "Pro moda geç" : "Switch to Pro mode", icon: Crown, group: tr ? "Mod" : "Mode", run: () => { close(); onSwitchMode("pro"); } },
    { id: "horror", label: tr ? "Horror moda geç" : "Switch to Horror mode", icon: Skull, group: tr ? "Mod" : "Mode", run: () => { close(); onSwitchMode("horror"); } },

    { id: "history", label: tr ? "Geçmişi aç" : "Open history", shortcut: "⌘H", icon: HistoryIcon, group: tr ? "Gezinti" : "Navigate", run: () => { close(); onOpenHistory(); } },
    { id: "profile", label: tr ? "Kanal profili" : "Channel profile", icon: User, group: tr ? "Gezinti" : "Navigate", run: () => { close(); onOpenProfile(); } },
    { id: "settings", label: tr ? "Ayarlar" : "Settings", shortcut: "⌘,", icon: SettingsIcon, group: tr ? "Gezinti" : "Navigate", run: () => { close(); onOpenSettings(); } },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 max-w-xl gap-0 overflow-hidden border-border/60">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>
        <CommandPrimitive label="Command palette" className="bg-card">
          <div className="flex items-center gap-2 px-4 border-b border-border/40">
            <Search className="h-4 w-4 text-muted-foreground" />
            <CommandPrimitive.Input
              placeholder={tr ? "Komut ara veya konu yaz..." : "Type a command or search topics..."}
              className="flex-1 h-12 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
            />
            <kbd className="kbd-chip">ESC</kbd>
          </div>
          <CommandPrimitive.List className="max-h-[420px] overflow-y-auto scrollbar-thin p-2">
            <CommandPrimitive.Empty className="py-8 text-center text-sm text-muted-foreground">
              {tr ? "Sonuç yok" : "No results"}
            </CommandPrimitive.Empty>

            {/* Group actions by group */}
            {Array.from(new Set(actions.map(a => a.group))).map((group) => (
              <CommandPrimitive.Group key={group} heading={group} className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-2 pt-2 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {actions.filter(a => a.group === group).map((a) => (
                  <CommandPrimitive.Item
                    key={a.id}
                    onSelect={a.run}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-foreground data-[selected=true]:bg-primary/10 data-[selected=true]:text-primary aria-selected:bg-primary/10"
                  >
                    <a.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1">{a.label}</span>
                    {a.shortcut && <kbd className="kbd-chip">{a.shortcut}</kbd>}
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            ))}

            {recents.length > 0 && (
              <CommandPrimitive.Group heading={tr ? "Son Konular" : "Recent Topics"} className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground px-2 pt-2 pb-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5">
                {recents.map((r) => (
                  <CommandPrimitive.Item
                    key={r.id}
                    value={r.topic}
                    onSelect={() => { close(); onSelectTopic(r.topic); }}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg cursor-pointer text-sm text-foreground data-[selected=true]:bg-primary/10 aria-selected:bg-primary/10"
                  >
                    <Flame className="h-4 w-4 text-orange-500/70" />
                    <span className="flex-1 truncate">{r.topic}</span>
                  </CommandPrimitive.Item>
                ))}
              </CommandPrimitive.Group>
            )}
          </CommandPrimitive.List>
          <div className="px-3 py-2 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground bg-muted/20">
            <span className="flex items-center gap-1">
              <kbd className="kbd-chip">↑</kbd><kbd className="kbd-chip">↓</kbd> {tr ? "gez" : "navigate"}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="kbd-chip">↵</kbd> {tr ? "seç" : "select"}
            </span>
          </div>
        </CommandPrimitive>
      </DialogContent>
    </Dialog>
  );
}
