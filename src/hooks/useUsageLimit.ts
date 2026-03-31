import { useState, useCallback, useEffect, useRef } from "react";

const CREDITS_KEY = "viralengine-credits";
const MAX_CREDITS = 3;
const REFILL_MS = 2 * 60 * 60 * 1000; // 2 hours

interface CreditData {
  credits: number;
  lastRefillAt: number; // epoch ms
}

function loadCredits(): CreditData {
  try {
    const raw = localStorage.getItem(CREDITS_KEY);
    if (raw) {
      const data = JSON.parse(raw) as CreditData;
      return refill(data);
    }
  } catch {}
  return { credits: MAX_CREDITS, lastRefillAt: Date.now() };
}

function refill(data: CreditData): CreditData {
  if (data.credits >= MAX_CREDITS) {
    return { credits: MAX_CREDITS, lastRefillAt: Date.now() };
  }
  const elapsed = Date.now() - data.lastRefillAt;
  const earned = Math.floor(elapsed / REFILL_MS);
  if (earned <= 0) return data;
  const newCredits = Math.min(MAX_CREDITS, data.credits + earned);
  const newLastRefill = data.lastRefillAt + earned * REFILL_MS;
  return { credits: newCredits, lastRefillAt: newLastRefill };
}

function save(data: CreditData) {
  localStorage.setItem(CREDITS_KEY, JSON.stringify(data));
}

export function useUsageLimit() {
  const [data, setData] = useState<CreditData>(loadCredits);
  const [nextRefillLabel, setNextRefillLabel] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Persist whenever data changes
  useEffect(() => { save(data); }, [data]);

  // Tick every 30s to update refill timer + check for new credits
  useEffect(() => {
    function tick() {
      setData((prev) => {
        const updated = refill(prev);
        // Update countdown label
        if (updated.credits < MAX_CREDITS) {
          const msLeft = REFILL_MS - (Date.now() - updated.lastRefillAt);
          const mins = Math.max(0, Math.ceil(msLeft / 60_000));
          const h = Math.floor(mins / 60);
          const m = mins % 60;
          setNextRefillLabel(h > 0 ? `${h}h ${m}m` : `${m}m`);
        } else {
          setNextRefillLabel("");
        }
        // Only update state if credits actually changed
        if (updated.credits !== prev.credits) return updated;
        return prev;
      });
    }
    tick();
    timerRef.current = setInterval(tick, 30_000);
    return () => clearInterval(timerRef.current);
  }, []);

  const remaining = data.credits;
  const isAtLimit = data.credits <= 0;
  const isNearLimit = data.credits === 1;

  const increment = useCallback(() => {
    setData((prev) => {
      const next = { credits: Math.max(0, prev.credits - 1), lastRefillAt: prev.credits >= MAX_CREDITS ? Date.now() : prev.lastRefillAt };
      return next;
    });
  }, []);

  return { remaining, isAtLimit, isNearLimit, increment, count: MAX_CREDITS - data.credits, nextRefillLabel };
}
