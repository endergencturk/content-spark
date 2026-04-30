import { useState, useEffect, useCallback } from "react";

const STREAK_KEY = "cs-streak";
const XP_KEY = "cs-xp";
const ACH_KEY = "cs-achievements";
const LAST_DAY_KEY = "cs-last-active-day";

export interface Achievement {
  id: string;
  label: string;
  labelTr: string;
  icon: string;
  threshold: number;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-spark", label: "First Spark", labelTr: "İlk Kıvılcım", icon: "✨", threshold: 1 },
  { id: "warming-up", label: "Warming Up", labelTr: "Isınıyor", icon: "🔥", threshold: 5 },
  { id: "on-fire", label: "On Fire", labelTr: "Alev Aldı", icon: "🚀", threshold: 15 },
  { id: "viral-machine", label: "Viral Machine", labelTr: "Viral Makinesi", icon: "💎", threshold: 30 },
  { id: "legend", label: "Legend", labelTr: "Efsane", icon: "👑", threshold: 75 },
];

function dayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function loadNumber(key: string): number {
  try { return parseInt(localStorage.getItem(key) || "0", 10) || 0; } catch { return 0; }
}

function loadAchievements(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(ACH_KEY) || "[]")); } catch { return new Set(); }
}

export function getLevel(xp: number): { level: number; current: number; next: number; progress: number } {
  // Each level needs 100 + level*50 XP
  let remaining = xp;
  let level = 1;
  while (true) {
    const need = 100 + (level - 1) * 50;
    if (remaining < need) {
      return { level, current: remaining, next: need, progress: remaining / need };
    }
    remaining -= need;
    level += 1;
    if (level > 100) return { level, current: 0, next: 1, progress: 1 };
  }
}

export function useGamification() {
  const [streak, setStreak] = useState(() => loadNumber(STREAK_KEY));
  const [xp, setXP] = useState(() => loadNumber(XP_KEY));
  const [achievements, setAchievements] = useState<Set<string>>(loadAchievements);
  const [totalGenerations, setTotalGenerations] = useState(() => loadNumber("cs-total-gens"));

  // On mount: maintain streak (decrement if missed >1 day)
  useEffect(() => {
    const last = localStorage.getItem(LAST_DAY_KEY);
    if (!last) return;
    const lastDate = new Date(last);
    const today = new Date(dayKey());
    const diff = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);
    if (diff > 1) {
      setStreak(0);
      localStorage.setItem(STREAK_KEY, "0");
    }
  }, []);

  const recordGeneration = useCallback((amount = 1) => {
    const today = dayKey();
    const last = localStorage.getItem(LAST_DAY_KEY);
    let nextStreak = streak;
    if (last !== today) {
      if (last) {
        const diff = Math.floor((new Date(today).getTime() - new Date(last).getTime()) / 86400000);
        nextStreak = diff === 1 ? streak + 1 : 1;
      } else {
        nextStreak = 1;
      }
      localStorage.setItem(LAST_DAY_KEY, today);
      localStorage.setItem(STREAK_KEY, String(nextStreak));
      setStreak(nextStreak);
    }
    const xpGain = 25 * amount + nextStreak * 2;
    const newXP = xp + xpGain;
    const newTotal = totalGenerations + amount;
    localStorage.setItem(XP_KEY, String(newXP));
    localStorage.setItem("cs-total-gens", String(newTotal));
    setXP(newXP);
    setTotalGenerations(newTotal);

    // Achievements
    const next = new Set(achievements);
    let unlocked: Achievement | null = null;
    for (const a of ACHIEVEMENTS) {
      if (newTotal >= a.threshold && !next.has(a.id)) {
        next.add(a.id);
        if (!unlocked) unlocked = a;
      }
    }
    if (unlocked) {
      setAchievements(next);
      localStorage.setItem(ACH_KEY, JSON.stringify(Array.from(next)));
    }
    return { xpGain, unlocked, newStreak: nextStreak };
  }, [streak, xp, achievements, totalGenerations]);

  const levelInfo = getLevel(xp);

  return { streak, xp, level: levelInfo, achievements, totalGenerations, recordGeneration };
}
