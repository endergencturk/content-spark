import React, { memo, useState } from "react";
import { Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useSettings } from "@/contexts/SettingsContext";
import { t } from "@/lib/i18n";

export const Navbar = memo(function Navbar() {
  const [open, setOpen] = useState(false);
  const { settings } = useSettings();
  const locale = settings.language;

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <span className="text-sm font-bold tracking-tight text-foreground">
              {t("app.badge", locale)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(true)}
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </nav>
      <SettingsDialog open={open} onOpenChange={setOpen} />
    </>
  );
});
