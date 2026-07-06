import React, { memo, useState } from "react";
import { Settings, Sparkles, Pencil, ArrowLeft, LogIn, Flame, Trophy } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useSettings } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/lib/i18n";
import { loadChannelProfile } from "@/components/ChannelProfile";
import { useGamification } from "@/hooks/useGamification";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface NavbarProps {
  onEditProfile?: () => void;
}

export const Navbar = memo(function Navbar({ onEditProfile }: NavbarProps) {
  const [open, setOpen] = useState(false);
  const { settings } = useSettings();
  const { user, setShowAuthModal, signOut } = useAuth();
  const locale = settings.language;
  const profile = loadChannelProfile();
  const { streak, level, totalGenerations } = useGamification();
  const showStreakChip = totalGenerations > 0;

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <Link to="/" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors mr-2">
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="text-xs font-medium hidden sm:inline">Home</span>
            </Link>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">
              {t("app.badge", locale)}
            </span>
            {profile?.channelName && (
              <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2.5 py-1 rounded-lg">
                📺 {profile.channelName}
                {onEditProfile && (
                  <button onClick={onEditProfile} className="ml-1 hover:text-primary/80 transition-colors">
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {showStreakChip && (
              <TooltipProvider delayDuration={200}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="hidden sm:flex items-center gap-2 h-8 rounded-full border border-border/50 bg-gradient-to-r from-primary/10 via-fuchsia-500/5 to-transparent pl-2 pr-3 mr-1">
                      <div className="flex items-center gap-1 pr-1.5 border-r border-border/40">
                        <Flame className={`h-3.5 w-3.5 text-orange-400 ${streak > 0 ? "animate-flame" : ""}`} />
                        <span className="text-xs font-black tabular-nums text-foreground">{streak}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-primary" />
                        <span className="text-[10px] font-black text-primary">LV {level.level}</span>
                      </div>
                      <div className="ml-1 h-1 w-10 rounded-full bg-muted/60 overflow-hidden">
                        <div className="h-full xp-bar rounded-full" style={{ width: `${Math.max(4, level.progress * 100)}%` }} />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <div className="text-xs space-y-0.5">
                      <div><span className="font-bold">{streak}</span> {locale === "tr" ? "günlük seri" : "day streak"}</div>
                      <div>Level {level.level} · {level.current} / {level.next} XP</div>
                      <div className="text-muted-foreground">{totalGenerations} {locale === "tr" ? "toplam üretim" : "total generations"}</div>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {profile?.channelName && onEditProfile && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 rounded-lg text-[10px] font-medium text-muted-foreground hover:text-foreground sm:hidden"
                onClick={onEditProfile}
              >
                <Pencil className="h-3 w-3 mr-1" />
                {locale === "tr" ? "Profil" : "Profile"}
              </Button>
            )}
            {!user && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground lg:hidden"
                onClick={() => setShowAuthModal(true)}
              >
                <LogIn className="h-3.5 w-3.5 mr-1" />
                {locale === "tr" ? "Giriş" : "Sign In"}
              </Button>
            )}
            {user && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground lg:hidden"
                onClick={() => signOut()}
              >
                {locale === "tr" ? "Çıkış" : "Sign Out"}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
              onClick={() => setOpen(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </nav>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
});
