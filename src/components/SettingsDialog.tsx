import React, { memo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Crown, ExternalLink, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSettings, VOICE_SPEED_CONFIG, type VoiceSpeed } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { getPaddleEnv } from "@/lib/paddle";
import { t } from "@/lib/i18n";
import { toast } from "sonner";

function SettingsRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      {children}
    </div>
  );
}

export const SettingsDialog = memo(function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { settings, updateSettings } = useSettings();
  const { user, planType } = useAuth();
  const { subscription, isPro, isYearly, willCancel, periodEnd } = useSubscription();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);
  const locale = settings.language;

  const openPortal = async () => {
    if (!subscription) return;
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { environment: getPaddleEnv() },
      });
      if (error || !data?.url) {
        toast.error("Could not open subscription portal");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("Could not open subscription portal");
    } finally {
      setPortalLoading(false);
    }
  };

  const showProSection = !!user;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{t("settings.title", locale)}</DialogTitle>
        </DialogHeader>

        {/* Subscription section */}
        {showProSection && (
          <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className={`h-4 w-4 ${planType === "pro" ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-sm font-semibold">
                  {planType === "pro" ? "Pro plan" : "Free plan"}
                </span>
                {isPro && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {isYearly ? "Yearly" : "Monthly"}
                  </Badge>
                )}
              </div>
            </div>

            {isPro && willCancel && periodEnd && (
              <p className="text-xs text-destructive">
                Cancels on {periodEnd.toLocaleDateString()}. You'll have Pro access until then.
              </p>
            )}
            {isPro && !willCancel && periodEnd && (
              <p className="text-xs text-muted-foreground">
                Renews on {periodEnd.toLocaleDateString()}
              </p>
            )}

            {subscription ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-lg"
                onClick={openPortal}
                disabled={portalLoading}
              >
                {portalLoading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                ) : (
                  <ExternalLink className="h-3.5 w-3.5 mr-2" />
                )}
                Manage subscription
              </Button>
            ) : planType !== "pro" ? (
              <Button
                size="sm"
                className="w-full rounded-lg"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/pricing");
                }}
              >
                <Crown className="h-3.5 w-3.5 mr-2" />
                Upgrade to Pro
              </Button>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                Pro access granted via invite code.
              </p>
            )}
          </div>
        )}

        <div className="divide-y divide-border">
          {/* Theme */}
          <SettingsRow label={t("settings.theme", locale)}>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {settings.theme === "light" ? t("settings.theme.light", locale) : t("settings.theme.dark", locale)}
              </span>
              <Switch
                checked={settings.theme === "dark"}
                onCheckedChange={(v) => updateSettings({ theme: v ? "dark" : "light" })}
              />
            </div>
          </SettingsRow>

          {/* Language */}
          <SettingsRow label={t("settings.language", locale)}>
            <Select value={settings.language} onValueChange={(v) => updateSettings({ language: v as any })}>
              <SelectTrigger className="w-32 h-8 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="tr">Türkçe</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>

          {/* Output Style */}
          <SettingsRow label={t("settings.outputStyle", locale)}>
            <Select value={settings.outputStyle} onValueChange={(v) => updateSettings({ outputStyle: v as any })}>
              <SelectTrigger className="w-32 h-8 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="minimal">{t("settings.outputStyle.minimal", locale)}</SelectItem>
                <SelectItem value="detailed">{t("settings.outputStyle.detailed", locale)}</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>

          {/* Default Platform */}
          <SettingsRow label={t("settings.defaultPlatform", locale)}>
            <Select value={settings.defaultPlatform} onValueChange={(v) => updateSettings({ defaultPlatform: v })}>
              <SelectTrigger className="w-32 h-8 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tiktok">TikTok</SelectItem>
                <SelectItem value="youtube-shorts">YouTube Shorts</SelectItem>
                <SelectItem value="instagram-reels">Instagram Reels</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>

          {/* Default Script Length */}
          <SettingsRow label={t("settings.defaultLength", locale)}>
            <Select value={settings.defaultScriptLength} onValueChange={(v) => updateSettings({ defaultScriptLength: v })}>
              <SelectTrigger className="w-32 h-8 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15s</SelectItem>
                <SelectItem value="30">30s</SelectItem>
                <SelectItem value="60">60s</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>

          {/* Hook Style */}
          <SettingsRow label={t("settings.hookStyle", locale)}>
            <Select value={settings.hookStyle} onValueChange={(v) => updateSettings({ hookStyle: v as any })}>
              <SelectTrigger className="w-32 h-8 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="safe">{t("settings.hookStyle.safe", locale)}</SelectItem>
                <SelectItem value="balanced">{t("settings.hookStyle.balanced", locale)}</SelectItem>
                <SelectItem value="aggressive">{t("settings.hookStyle.aggressive", locale)}</SelectItem>
              </SelectContent>
            </Select>
          </SettingsRow>

          {/* Voice Speed */}
          <SettingsRow label="Voice Speed">
            <Select value={settings.voiceSpeed} onValueChange={(v) => updateSettings({ voiceSpeed: v as VoiceSpeed })}>
              <SelectTrigger className="w-32 h-8 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(VOICE_SPEED_CONFIG) as VoiceSpeed[]).map((speed) => (
                  <SelectItem key={speed} value={speed}>{VOICE_SPEED_CONFIG[speed].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </SettingsRow>
        </div>
      </DialogContent>
    </Dialog>
  );
});
