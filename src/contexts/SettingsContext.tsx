import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { Locale } from "@/lib/i18n";

export type VoiceSpeed = "0.8" | "0.9" | "1.0";

export const VOICE_SPEED_CONFIG: Record<VoiceSpeed, { charPerSec: number; label: string }> = {
  "0.8": { charPerSec: 0.094, label: "0.8 (Slow)" },
  "0.9": { charPerSec: 0.084, label: "0.9 (Default)" },
  "1.0": { charPerSec: 0.075, label: "1.0 (Fast)" },
};

export const CHAR_TARGETS_BY_SPEED: Record<VoiceSpeed, Record<string, { min: number; max: number }>> = {
  "0.8": { "15": { min: 140, max: 170 }, "30": { min: 290, max: 320 }, "60": { min: 580, max: 650 } },
  "0.9": { "15": { min: 160, max: 190 }, "30": { min: 330, max: 380 }, "60": { min: 660, max: 760 } },
  "1.0": { "15": { min: 185, max: 215 }, "30": { min: 380, max: 420 }, "60": { min: 760, max: 860 } },
};

export interface Settings {
  theme: "light" | "dark";
  language: Locale;
  outputStyle: "minimal" | "detailed";
  defaultPlatform: string;
  defaultScriptLength: string;
  hookStyle: "safe" | "balanced" | "aggressive";
  voiceSpeed: VoiceSpeed;
}

const DEFAULT_SETTINGS: Settings = {
  theme: "light",
  language: "en",
  outputStyle: "detailed",
  defaultPlatform: "tiktok",
  defaultScriptLength: "30",
  hookStyle: "balanced",
  voiceSpeed: "0.9",
};

const STORAGE_KEY = "viralengine-settings";

function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_SETTINGS;
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

  // Apply theme to document
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
