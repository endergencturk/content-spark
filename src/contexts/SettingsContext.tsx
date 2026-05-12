import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Locale } from "@/lib/i18n";
import { useLocation } from "react-router-dom";

export type VoiceSpeed = "0.8" | "0.9" | "1.0";

export const VOICE_SPEED_CONFIG: Record<VoiceSpeed, { charPerSec: number; label: string }> = {
  "0.8": { charPerSec: 0.094, label: "0.8 (Slow)" },
  "0.9": { charPerSec: 0.084, label: "0.9 (Default)" },
  "1.0": { charPerSec: 0.075, label: "1.0 (Fast)" },
};

export const CHAR_TARGETS_BY_SPEED: Record<VoiceSpeed, Record<string, { min: number; max: number }>> = {
  "0.8": { "15": { min: 140, max: 170 }, "30": { min: 260, max: 300 }, "60": { min: 580, max: 650 } },
  "0.9": { "15": { min: 160, max: 190 }, "30": { min: 290, max: 340 }, "60": { min: 660, max: 760 } },
  "1.0": { "15": { min: 185, max: 215 }, "30": { min: 330, max: 380 }, "60": { min: 760, max: 860 } },
};

export interface Settings {
  theme: "light" | "dark";
  language: Locale;
  outputStyle: "minimal" | "detailed";
  defaultPlatform: string;
  defaultScriptLength: string;
  hookStyle: "safe" | "balanced" | "aggressive";
  voiceSpeed: VoiceSpeed;
  imageStyle: ImageStyle;
  imageMode: ImageMode;
  faceIntensity: FaceIntensity;
}

export type ImageStyle =
  | "cinematic"
  | "cartoon"
  | "horror"
  | "3d"
  | "documentary"
  | "editorial"
  | "cyberpunk"
  | "noir"
  | "vintage35mm"
  | "hyperreal";
export type ImageMode = "character" | "scene" | "mixed" | "pov" | "action" | "symbolic";
export type FaceIntensity = "low" | "medium" | "extreme";

export const IMAGE_MODE_OPTIONS: { value: ImageMode; label: string; labelTr: string; emoji: string }[] = [
  { value: "character", label: "Character", labelTr: "Karakter",  emoji: "😱" },
  { value: "scene",     label: "Scene",     labelTr: "Sahne",     emoji: "🌃" },
  { value: "mixed",     label: "Mixed",     labelTr: "Karışık",   emoji: "🎭" },
  { value: "pov",       label: "POV",       labelTr: "Birinci Şahıs", emoji: "👁️" },
  { value: "action",    label: "Action",    labelTr: "Aksiyon",   emoji: "⚡" },
  { value: "symbolic",  label: "Symbolic",  labelTr: "Sembolik",  emoji: "🗝️" },
];

export const FACE_INTENSITY_OPTIONS: { value: FaceIntensity; label: string; labelTr: string }[] = [
  { value: "low",     label: "Low",     labelTr: "Düşük" },
  { value: "medium",  label: "Medium",  labelTr: "Orta" },
  { value: "extreme", label: "Extreme", labelTr: "Aşırı" },
];

export const IMAGE_STYLE_OPTIONS: { value: ImageStyle; label: string; labelTr: string; emoji: string }[] = [
  { value: "cinematic", label: "Cinematic / Realistic", labelTr: "Sinematik / Gerçekçi", emoji: "🎬" },
  { value: "cartoon",   label: "Cartoon / Anime",       labelTr: "Çizgi Film / Anime",   emoji: "🎨" },
  { value: "horror",    label: "Horror / Dark",         labelTr: "Korku / Karanlık",     emoji: "💀" },
  { value: "3d",        label: "3D / Pixar",            labelTr: "3D / Pixar",           emoji: "🧊" },
  { value: "documentary", label: "Documentary",         labelTr: "Belgesel",             emoji: "📰" },
  { value: "editorial",   label: "Editorial / Magazine",labelTr: "Editöryal / Dergi",    emoji: "📸" },
  { value: "cyberpunk",   label: "Neon Cyberpunk",      labelTr: "Neon Cyberpunk",       emoji: "🌆" },
  { value: "noir",        label: "Film Noir",           labelTr: "Film Noir",            emoji: "🕵️" },
  { value: "vintage35mm", label: "Vintage 35mm",        labelTr: "Vintage 35mm",         emoji: "📽️" },
  { value: "hyperreal",   label: "Hyperreal Macro",     labelTr: "Hipergerçek Makro",    emoji: "🔬" },
];

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  language: "en",
  outputStyle: "detailed",
  defaultPlatform: "tiktok",
  defaultScriptLength: "30",
  hookStyle: "balanced",
  voiceSpeed: "0.9",
  imageStyle: "cinematic",
  imageMode: "character",
  faceIntensity: "medium",
};

const STORAGE_KEY = "viralengine-settings";
const LANDING_THEME_KEY = "viralengine-landing-theme";
const APP_THEME_KEY = "viralengine-app-theme";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
}

function getStoredTheme(key: string): "light" | "dark" {
  try {
    const val = localStorage.getItem(key);
    if (val === "light" || val === "dark") return val;
  } catch {}
  return "dark"; // default both to dark
}

interface SettingsContextValue {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  // Apply theme based on current route using separate storage keys
  useEffect(() => {
    const applyRouteTheme = () => {
      const path = window.location.pathname;
      const isApp = path.startsWith("/app");
      const themeKey = isApp ? APP_THEME_KEY : LANDING_THEME_KEY;
      const theme = getStoredTheme(themeKey);
      document.documentElement.classList.toggle("dark", theme === "dark");
    };
    applyRouteTheme();
  }, []);

  // When theme changes in settings, save to the correct route-specific key
  useEffect(() => {
    const path = window.location.pathname;
    const isApp = path.startsWith("/app");
    const themeKey = isApp ? APP_THEME_KEY : LANDING_THEME_KEY;
    localStorage.setItem(themeKey, settings.theme);
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

/** Hook to sync theme when route changes between landing and app */
export function useRouteThemeSync() {
  const { settings, updateSettings } = useContext(SettingsContext);

  useEffect(() => {
    const path = window.location.pathname;
    const isApp = path.startsWith("/app");
    const themeKey = isApp ? APP_THEME_KEY : LANDING_THEME_KEY;
    const storedTheme = getStoredTheme(themeKey);
    if (storedTheme !== settings.theme) {
      updateSettings({ theme: storedTheme });
    }
  }, []);
}

export function useSettings() {
  return useContext(SettingsContext);
}
