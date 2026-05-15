import React, { memo } from "react";
import { Sparkles, PenTool, Clock, Crown, LogIn, LogOut, User } from "lucide-react";
import { type Locale } from "@/lib/i18n";
import { useAuth, type PlanType } from "@/contexts/AuthContext";

interface AppSidebarProps {
  locale: Locale;
  activeNav?: string;
  onNavChange?: (nav: string) => void;
  remaining?: number;
  isAtLimit?: boolean;
  onHistoryClick?: () => void;
}

const NAV_ITEMS = [
  { id: "create", icon: PenTool, labelEn: "Create", labelTr: "Oluştur" },
  { id: "history", icon: Clock, labelEn: "History", labelTr: "Geçmiş" },
];

export const AppSidebar = memo(function AppSidebar({
  locale,
  activeNav = "create",
  onNavChange,
  remaining,
  isAtLimit,
  onHistoryClick,
}: AppSidebarProps) {
  const { user, planType, setShowAuthModal, signOut } = useAuth();
  const isPro = planType === "pro";

  return (
    <aside className="hidden lg:flex flex-col w-[220px] xl:w-[240px] shrink-0 border-r border-border/40 bg-card/40 backdrop-blur-xl h-screen sticky top-0">
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
                if (item.id === "history") {
                  if (onHistoryClick) onHistoryClick();
                } else if (onNavChange) {
                  onNavChange(item.id);
                }
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="px-3 pb-4 space-y-3">
        {isPro ? (
          <div className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
            <Crown className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-primary">
              {locale === "tr" ? "Pro Aktif" : "Pro Active"}
            </span>
          </div>
        ) : (
          <>
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

            {!user && (
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-semibold shadow-sm hover:shadow-md transition-all"
              >
                <Crown className="h-4 w-4" />
                {locale === "tr" ? "Pro'ya Yükselt" : "Upgrade to Pro"}
              </button>
            )}
          </>
        )}

        {/* Auth section */}
        {user ? (
          <button
            onClick={() => signOut()}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="truncate">{user.email}</span>
          </button>
        ) : (
          <button
            onClick={() => setShowAuthModal(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
          >
            <LogIn className="h-3.5 w-3.5" />
            {locale === "tr" ? "Giriş Yap" : "Sign In"}
          </button>
        )}
      </div>
    </aside>
  );
});
