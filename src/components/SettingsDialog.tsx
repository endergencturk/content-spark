import React, { memo } from "react";
import { Crown } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useSettings, VOICE_SPEED_CONFIG, IMAGE_STYLE_OPTIONS, type VoiceSpeed, type ImageStyle } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { t } from "@/lib/i18n";

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
  const { user, planType, trialDaysLeft, trialHoursLeft, setShowUpgradeDialog } = useAuth();
  const locale = settings.language;

  const planLabel =
    planType === "pro"
      ? (locale === "tr" ? "Pro — tüm özellikler aktif" : "Pro — all features active")
      : planType === "trial"
        ? trialDaysLeft > 1
          ? (locale === "tr" ? `Pro Deneme — ${trialDaysLeft} gün kaldı` : `Pro Trial — ${trialDaysLeft} days left`)
          : (locale === "tr" ? `Pro Deneme — ${trialHoursLeft} saat kaldı` : `Pro Trial — ${trialHoursLeft} hours left`)
        : (locale === "tr" ? "Deneme süresi doldu" : "Trial expired");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">{t("settings.title", locale)}</DialogTitle>
          <DialogDescription>
            Manage your language, defaults, theme, and current access status.
          </DialogDescription>
        </DialogHeader>

        {/* Account / plan section */}
        {user && (
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Crown className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground">{planLabel}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            {planType !== "pro" && (
              <button
                onClick={() => { onOpenChange(false); setShowUpgradeDialog(true); }}
                className="text-xs font-semibold text-primary hover:underline shrink-0"
              >
                {locale === "tr" ? "Yükselt" : "Upgrade"}
              </button>
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

          {/* Image Style */}
          <SettingsRow label={locale === "tr" ? "Görsel Stili" : "Image Style"}>
            <Select value={settings.imageStyle} onValueChange={(v) => updateSettings({ imageStyle: v as ImageStyle })}>
              <SelectTrigger className="w-44 h-8 text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {IMAGE_STYLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.emoji} {locale === "tr" ? opt.labelTr : opt.label}
                  </SelectItem>
                ))}
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
