import React, { useState, useEffect, memo } from "react";
import { ChevronDown, ChevronUp, Save, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { type Locale } from "@/lib/i18n";

export interface ChannelProfileData {
  channelName: string;
  niche: string;
  audience: string;
  language: string;
  frequency: string;
  platformFocus?: string;
  contentStyle?: string;
  experienceLevel?: string;
}

const STORAGE_KEY = "viralengine-channel-profile";
const SETUP_DONE_KEY = "viralengine-channel-setup-done";

export function loadChannelProfile(): ChannelProfileData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

const NICHE_OPTIONS = [
  { value: "mystery", label: "Mystery / True Crime", labelTr: "Gizem / Suç" },
  { value: "educational", label: "Educational", labelTr: "Eğitim" },
  { value: "horror", label: "Horror", labelTr: "Korku" },
  { value: "finance", label: "Finance", labelTr: "Finans" },
  { value: "fitness", label: "Fitness", labelTr: "Fitness" },
  { value: "motivation", label: "Motivation", labelTr: "Motivasyon" },
];

const AUDIENCE_OPTIONS = [
  { value: "global", label: "Global" },
  { value: "usa", label: "USA" },
  { value: "europe", label: "Europe" },
  { value: "latam", label: "Latin America" },
  { value: "turkey", label: "Turkey" },
];

const LANGUAGE_OPTIONS = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "pt", label: "Portuguese" },
  { value: "tr", label: "Turkish" },
  { value: "de", label: "German" },
  { value: "fr", label: "French" },
];

const FREQUENCY_OPTIONS = [
  { value: "daily", label: "Daily", labelTr: "Her gün" },
  { value: "3x", label: "3x / week", labelTr: "Haftada 3" },
  { value: "weekly", label: "Weekly", labelTr: "Haftalık" },
];

const PLATFORM_FOCUS_OPTIONS = [
  { value: "tiktok", label: "TikTok" },
  { value: "youtube-shorts", label: "YouTube Shorts" },
  { value: "both", label: "Both" },
];

const CONTENT_STYLE_OPTIONS = [
  { value: "suspense", label: "Suspense", labelTr: "Gerilim" },
  { value: "dark", label: "Dark", labelTr: "Karanlık" },
  { value: "storytelling", label: "Storytelling", labelTr: "Hikaye" },
  { value: "shocking", label: "Shocking", labelTr: "Şok edici" },
];

const EXPERIENCE_OPTIONS = [
  { value: "beginner", label: "Beginner", labelTr: "Başlangıç" },
  { value: "intermediate", label: "Intermediate", labelTr: "Orta" },
  { value: "advanced", label: "Advanced", labelTr: "İleri" },
];

interface ChannelProfileProps {
  locale: Locale;
  onSave: (profile: ChannelProfileData) => void;
  forceOpen?: boolean;
}

export const ChannelProfile = memo(function ChannelProfile({ locale, onSave, forceOpen }: ChannelProfileProps) {
  const setupDone = localStorage.getItem(SETUP_DONE_KEY) === "true";
  const [open, setOpen] = useState(forceOpen || !setupDone);
  const existing = loadChannelProfile();

  const [channelName, setChannelName] = useState(existing?.channelName || "");
  const [niche, setNiche] = useState(existing?.niche || "mystery");
  const [audience, setAudience] = useState(existing?.audience || "global");
  const [language, setLanguage] = useState(existing?.language || "en");
  const [frequency, setFrequency] = useState(existing?.frequency || "3x");
  const [platformFocus, setPlatformFocus] = useState(existing?.platformFocus || "both");
  const [contentStyle, setContentStyle] = useState(existing?.contentStyle || "");
  const [experienceLevel, setExperienceLevel] = useState(existing?.experienceLevel || "");

  const handleSave = () => {
    const profile: ChannelProfileData = { channelName: channelName.trim(), niche, audience, language, frequency, platformFocus, contentStyle, experienceLevel };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    localStorage.setItem(SETUP_DONE_KEY, "true");
    onSave(profile);
    setOpen(false);
    toast.success(locale === "tr" ? "Kanal profili kaydedildi!" : "Channel profile saved!");
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <User className="h-4 w-4 text-primary" />
          🎯 {locale === "tr" ? "Kanal profilini ayarla" : "Set up your channel profile"}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
              {locale === "tr" ? "Kanal Adı" : "Channel Name"}
            </label>
            <Input
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder={locale === "tr" ? "ör. Gizemli Hikayeler" : "e.g. Mystery Stories"}
              className="h-10 rounded-xl text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {locale === "tr" ? "Niş" : "Niche"}
              </label>
              <Select value={niche} onValueChange={setNiche}>
                <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NICHE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{locale === "tr" ? o.labelTr : o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {locale === "tr" ? "Hedef Kitle" : "Target Audience"}
              </label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {AUDIENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {locale === "tr" ? "Dil" : "Language"}
              </label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {locale === "tr" ? "Paylaşım Sıklığı" : "Posting Frequency"}
              </label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FREQUENCY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{locale === "tr" ? o.labelTr : o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Optional fields */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {locale === "tr" ? "Platform" : "Platform Focus"}
              </label>
              <Select value={platformFocus} onValueChange={setPlatformFocus}>
                <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PLATFORM_FOCUS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {locale === "tr" ? "İçerik Stili" : "Content Style"}
              </label>
              <Select value={contentStyle} onValueChange={setContentStyle}>
                <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {CONTENT_STYLE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{locale === "tr" ? o.labelTr : o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {locale === "tr" ? "Deneyim" : "Experience"}
              </label>
              <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                <SelectTrigger className="h-9 rounded-xl text-xs"><SelectValue placeholder="Optional" /></SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{locale === "tr" ? o.labelTr : o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleSave} className="w-full rounded-xl h-10 text-sm font-semibold gap-2">
            <Save className="h-4 w-4" />
            {locale === "tr" ? "Profili Kaydet" : "Save Profile"}
          </Button>
        </div>
      )}
    </div>
  );
});
