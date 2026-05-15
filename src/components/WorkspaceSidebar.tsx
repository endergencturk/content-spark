import React, { memo, useState, useEffect, useCallback } from "react";
import {
  Sparkles, PenTool, Crown, LogIn, LogOut, Settings as SettingsIcon,
  Flame, Trophy, ChevronRight, History as HistoryIcon, User, Pencil, Star,
  Search, Command, X, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";
import { type Locale } from "@/lib/i18n";
import { useAuth } from "@/contexts/AuthContext";
import { loadChannelProfile } from "@/components/ChannelProfile";
import { useGamification, ACHIEVEMENTS } from "@/hooks/useGamification";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface RecentItem {
  id: string;
  topic: string;
  created_at: string;
  is_favorite: boolean;
  plan_type?: string;
}

interface Props {
  locale: Locale;
  deviceId: string;
  onEditProfile: () => void;
  onOpenHistory: () => void;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
  onSelectTopic: (topic: string) => void;
  recentRefreshKey?: number;
  // mobile sheet
  mobileOpen: boolean;
  onMobileOpenChange: (v: boolean) => void;
  // desktop collapse
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
}

const NICHE_EMOJI: Record<string, string> = {
  mystery: "🔍", educational: "📚", horror: "💀", finance: "💰",
  fitness: "💪", motivation: "🧠", conspiracy: "👁️", paranormal: "👻",
  "tech-ai": "🤖", space: "🚀", history: "🏛️", storytime: "📖",
};

function SidebarBody({ locale, deviceId, onEditProfile, onOpenHistory, onOpenCommandPalette, onOpenSettings, onSelectTopic, recentRefreshKey, onToggleCollapsed }: Omit<Props, "mobileOpen" | "onMobileOpenChange" | "collapsed">) {
  const { user, planType, setShowAuthModal, signOut } = useAuth();
  const isPro = planType === "pro";
  const profile = loadChannelProfile();
  const { streak, level, totalGenerations, achievements } = useGamification();
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [favorites, setFavorites] = useState<RecentItem[]>([]);
  const [tab, setTab] = useState<"recent" | "fav">("recent");

  const fetchRecents = useCallback(async () => {
    if (!deviceId) return;
    const { data } = await supabase
      .from("generations")
      .select("id, topic, created_at, is_favorite, plan_type")
      .eq("device_id", deviceId)
      .order("created_at", { ascending: false })
      .limit(15);
    if (data) {
      setRecents(data as any);
      setFavorites((data as any).filter((d: RecentItem) => d.is_favorite).slice(0, 8));
    }
  }, [deviceId]);

  useEffect(() => { fetchRecents(); }, [fetchRecents, recentRefreshKey]);

  const list = tab === "recent" ? recents.slice(0, 8) : favorites;
  const unlockedCount = achievements.size;
  const nextAchievement = ACHIEVEMENTS.find((a) => !achievements.has(a.id));

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border/40 shrink-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-fuchsia-600 shadow-[0_0_16px_-4px_hsl(var(--primary)/0.6)]">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground flex-1">Content Spark</span>
          {onToggleCollapsed && (
            <button
              onClick={onToggleCollapsed}
              className="hidden lg:flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title={locale === "tr" ? "Kenar çubuğunu gizle" : "Hide sidebar"}
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-3 py-3 space-y-3">
          {/* Command Palette CTA */}
          <button
            onClick={onOpenCommandPalette}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-border/50 bg-muted/30 hover:bg-muted/60 transition-all text-left group"
          >
            <span className="flex items-center gap-2 text-xs text-muted-foreground group-hover:text-foreground transition-colors">
              <Search className="h-3.5 w-3.5" />
              {locale === "tr" ? "Hızlı arama..." : "Quick search..."}
            </span>
            <span className="flex items-center gap-0.5">
              <kbd className="kbd-chip">⌘</kbd>
              <kbd className="kbd-chip">K</kbd>
            </span>
          </button>

          {/* Channel Profile Card */}
          <div className="rounded-2xl border border-border/50 glass-panel p-3 space-y-2.5 neon-edge">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {locale === "tr" ? "Kanal" : "Channel"}
              </span>
              <button
                onClick={onEditProfile}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 -mr-1 rounded-md hover:bg-muted/50"
                title={locale === "tr" ? "Düzenle" : "Edit"}
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
            {profile?.channelName ? (
              <>
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary/30 to-fuchsia-500/20 flex items-center justify-center text-base shrink-0 border border-primary/30">
                    {NICHE_EMOJI[profile.niche || ""] || "🎬"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-foreground truncate">{profile.channelName}</p>
                    <p className="text-[10px] text-muted-foreground truncate capitalize">
                      {profile.niche} · {profile.audience}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {profile.platformFocus && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                      {profile.platformFocus}
                    </span>
                  )}
                  {profile.frequency && (
                    <span className="text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-muted/60 text-muted-foreground">
                      {profile.frequency}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <button
                onClick={onEditProfile}
                className="w-full flex items-center gap-2 p-2 rounded-xl border border-dashed border-border/60 hover:border-primary/50 hover:bg-primary/5 transition-all text-left"
              >
                <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  <User className="h-4 w-4 text-muted-foreground" />
                </div>
                <span className="text-xs text-muted-foreground">
                  {locale === "tr" ? "Kanal profilini ayarla" : "Set up your channel"}
                </span>
              </button>
            )}
          </div>

          {/* Streak + Level Card */}
          <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-card/40 to-fuchsia-500/5 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Flame className={`h-4 w-4 text-orange-500 ${streak > 0 ? "animate-flame" : ""}`} />
                <span className="text-sm font-extrabold text-foreground">{streak}</span>
                <span className="text-[10px] text-muted-foreground font-medium">
                  {locale === "tr" ? "günlük seri" : "day streak"}
                </span>
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-primary/15 border border-primary/30">
                    <Trophy className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-extrabold text-primary">LV {level.level}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{level.current} / {level.next} XP</TooltipContent>
              </Tooltip>
            </div>
            <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
              <div className="h-full xp-bar rounded-full transition-all" style={{ width: `${level.progress * 100}%` }} />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted-foreground">
                {totalGenerations} {locale === "tr" ? "üretim" : "generations"}
              </span>
              {nextAchievement && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground/80 font-medium">
                      {nextAchievement.icon} {totalGenerations}/{nextAchievement.threshold}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {locale === "tr" ? "Sıradaki rozet:" : "Next badge:"} {locale === "tr" ? nextAchievement.labelTr : nextAchievement.label}
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            {unlockedCount > 0 && (
              <div className="flex items-center gap-1 pt-0.5">
                {ACHIEVEMENTS.filter((a) => achievements.has(a.id)).slice(-4).map((a) => (
                  <Tooltip key={a.id}>
                    <TooltipTrigger asChild>
                      <span className="text-base leading-none cursor-default">{a.icon}</span>
                    </TooltipTrigger>
                    <TooltipContent>{locale === "tr" ? a.labelTr : a.label}</TooltipContent>
                  </Tooltip>
                ))}
              </div>
            )}
          </div>

          {/* History panel */}
          <div className="rounded-2xl border border-border/50 bg-card/40 overflow-hidden">
            <div className="flex items-center gap-1 p-1 bg-muted/40 border-b border-border/40">
              <button
                onClick={() => setTab("recent")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  tab === "recent" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <HistoryIcon className="h-3 w-3" />
                {locale === "tr" ? "Son" : "Recent"}
              </button>
              <button
                onClick={() => setTab("fav")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                  tab === "fav" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Star className="h-3 w-3" />
                {locale === "tr" ? "Favori" : "Favs"}
              </button>
            </div>
            <div className="max-h-[280px] overflow-y-auto scrollbar-thin">
              {list.length === 0 ? (
                <div className="px-3 py-6 text-center">
                  <p className="text-[11px] text-muted-foreground">
                    {tab === "recent"
                      ? (locale === "tr" ? "Henüz üretim yok" : "No generations yet")
                      : (locale === "tr" ? "Favori yok" : "No favorites")}
                  </p>
                </div>
              ) : (
                <ul className="p-1.5">
                  {list.map((it) => (
                    <li key={it.id}>
                      <button
                        onClick={() => onSelectTopic(it.topic)}
                        className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-muted/60 transition-colors group"
                      >
                        <p className="text-[11px] font-medium text-foreground truncate group-hover:text-primary transition-colors">
                          {it.topic}
                        </p>
                        <p className="text-[9px] text-muted-foreground/80 mt-0.5">
                          {new Date(it.created_at).toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", { month: "short", day: "numeric" })}
                          {it.plan_type === "pro" && <span className="ml-1.5 text-primary font-bold">PRO</span>}
                        </p>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button
              onClick={onOpenHistory}
              className="w-full flex items-center justify-center gap-1 px-3 py-2 text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 border-t border-border/40 transition-colors"
            >
              {locale === "tr" ? "Tümünü gör" : "View all"} <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Bottom: auth + settings */}
        <div className="px-3 pb-3 pt-2 border-t border-border/40 space-y-2 shrink-0">
          {isPro && (
            <div className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-primary/15 to-fuchsia-500/10 border border-primary/30">
              <Crown className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold text-primary">
                {locale === "tr" ? "Pro Aktif" : "Pro Active"}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1">
            {user ? (
              <button
                onClick={() => signOut()}
                className="flex-1 flex items-center gap-2 px-2.5 py-2 rounded-xl text-[11px] text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all min-w-0"
                title={user.email || ""}
              >
                <div className="h-6 w-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                  <User className="h-3 w-3 text-primary" />
                </div>
                <span className="truncate flex-1 text-left">{user.email}</span>
                <LogOut className="h-3 w-3 shrink-0" />
              </button>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-all"
              >
                <LogIn className="h-3.5 w-3.5" />
                {locale === "tr" ? "Giriş Yap" : "Sign In"}
              </button>
            )}
            <button
              onClick={onOpenSettings}
              className="h-9 w-9 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
              title={locale === "tr" ? "Ayarlar" : "Settings"}
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export const WorkspaceSidebar = memo(function WorkspaceSidebar(props: Props) {
  const { mobileOpen, onMobileOpenChange, collapsed, onToggleCollapsed, ...rest } = props;
  return (
    <>
      {/* Desktop */}
      {collapsed ? (
        <aside className="hidden lg:flex flex-col w-12 shrink-0 border-r border-border/40 bg-card/40 backdrop-blur-xl h-screen sticky top-0 items-center py-3 gap-2">
          <button
            onClick={onToggleCollapsed}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={props.locale === "tr" ? "Kenar çubuğunu göster" : "Show sidebar"}
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <button
            onClick={props.onOpenCommandPalette}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={props.locale === "tr" ? "Hızlı arama (⌘K)" : "Quick search (⌘K)"}
          >
            <Search className="h-4 w-4" />
          </button>
          <button
            onClick={props.onOpenHistory}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={props.locale === "tr" ? "Geçmiş" : "History"}
          >
            <HistoryIcon className="h-4 w-4" />
          </button>
          <div className="flex-1" />
          <button
            onClick={props.onOpenSettings}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
            title={props.locale === "tr" ? "Ayarlar" : "Settings"}
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
        </aside>
      ) : (
        <aside className="hidden lg:flex flex-col w-[260px] xl:w-[280px] shrink-0 border-r border-border/40 bg-card/40 backdrop-blur-xl h-screen sticky top-0">
          <SidebarBody {...rest} onToggleCollapsed={onToggleCollapsed} />
        </aside>
      )}

      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={onMobileOpenChange}>
        <SheetContent side="left" className="w-[300px] p-0 border-r border-border/40">
          <SidebarBody {...rest} />
        </SheetContent>
      </Sheet>
    </>
  );
});
