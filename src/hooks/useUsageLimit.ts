import { useState, useCallback } from "react";

const STORAGE_KEY = "viralengine-usage";
const FREE_DAILY_LIMIT = 3;

interface UsageData {
  date: string;
  count: number;
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function loadUsage(): UsageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw) as UsageData;
      if (data.date === getTodayKey()) return data;
    }
  } catch {}
  return { date: getTodayKey(), count: 0 };
}

export function useUsageLimit() {
  const [usage, setUsage] = useState<UsageData>(loadUsage);

  const remaining = Math.max(0, FREE_DAILY_LIMIT - usage.count);
  const isAtLimit = usage.count >= FREE_DAILY_LIMIT;
  const isNearLimit = usage.count >= FREE_DAILY_LIMIT - 1 && !isAtLimit;

  const increment = useCallback(() => {
    setUsage((prev) => {
      const today = getTodayKey();
      const next = prev.date === today
        ? { date: today, count: prev.count + 1 }
        : { date: today, count: 1 };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return { remaining, isAtLimit, isNearLimit, increment, count: usage.count };
}
