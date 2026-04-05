import React, { memo } from "react";
import { Sparkles, PenTool, Clock, Bookmark, Compass, Crown } from "lucide-react";
import { type Locale } from "@/lib/i18n";
import { Badge } from "@/components/ui/badge";

interface AppSidebarProps {
  locale: Locale;
  activeNav?: string;
  onNavChange?: (nav: string) => void;
  remaining?: number;
  isAtLimit?: boolean;
  isPro?: boolean;
  onHistoryClick?: () => void;
  onDiscoverClick?: () => void;
}

const NAV_ITEMS = [
  { id: "create", icon: PenTool, labelEn: "Create", labelTr: "Oluştur" },
  { id: "history", icon: Clock, labelEn: "History", labelTr: "Geçmiş" },
  { id: "saved", icon: Bookmark, labelEn: "Saved", labelTr: "Kaydedilenler", placeholder: true },
  { id: "discover", icon: Compass, labelEn: "Discover", labelTr: "Keşfet" },
];

export const AppSidebar = memo(function AppSidebar({
  locale,
  activeNav = "create",
  onNavChange,
  remaining,
  isAtLimit,
  isPro,
  onHistoryClick,
  onDiscoverClick,
}: AppSidebarProps) {
  return (
    <aside className="hidden lg:flex flex-col w-[220px] xl:w-[240px] shrink-0 border-r border-border/40 bg-card/50 h-screen sticky top-0">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-14 border-b border-border/40">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-bold tracking-tight text-foreground">Content Spark</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = activeNav === item.id;
          const label = locale === "tr" ? item.labelTr : item.labelEn;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === "history" && onHistoryClick) {
                  onHistoryClick();
                } else if (item.id === "discover" && onDiscoverClick) {
                  onDiscoverClick();
                } else if (!item.placeholder && onNavChange) {
                  onNavChange(item.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              } ${item.placeholder ? "opacity-50 cursor-default" : "cursor-pointer"}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
              {item.placeholder && (
                <span className="ml-auto text-[9px] uppercase tracking-wider font-bold text-muted-foreground/60 bg-muted/60 px-1.5 py-0.5 rounded">
                  {locale === "tr" ? "Yakında" : "Soon"}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-3">
        {isPro ? (
          /* Pro Active badge */
          <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary">
              {locale === "tr" ? "Pro Aktif" : "Pro Active"}
            </span>
          </div>
        ) : (
          <>
            {/* Usage indicator */}
            {remaining !== undefined && (
              <div className="px-3 py-2.5 rounded-xl bg-muted/40 border border-border/30">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                    {locale === "tr" ? "Kullanım" : "Usage"}
                  </span>
                  <span className="text-[10px] font-bold text-foreground">
                    {remaining}/3
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isAtLimit ? "bg-destructive" : "bg-primary"}`}
                    style={{ width: `${Math.max(0, Math.min(100, ((3 - (remaining ?? 0)) / 3) * 100))}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upgrade button */}
            <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-semibold shadow-sm hover:shadow-md transition-all">
              <Crown className="h-4 w-4" />
              {locale === "tr" ? "Pro'ya Yükselt" : "Upgrade to Pro"}
            </button>
          </>
        )}
      </div>
    </aside>
  );
});
