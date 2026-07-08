import { useState, useCallback, useEffect, useRef } from "react";

const CREDITS_KEY = "viralengine-credits";
const MAX_CREDITS = 3;
const REFILL_MS = 2 * 60 * 60 * 1000; // 2 hours
const BONUS_KEY = "viralengine-bonus-credits";

function loadBonus(): number {
  try {
    const raw = localStorage.getItem(BONUS_KEY);
    return raw ? Math.max(0, parseInt(raw, 10) || 0) : 0;
  } catch { return 0; }
}
function saveBonus(n: number) {
  try { localStorage.setItem(BONUS_KEY, String(Math.max(0, n))); } catch {}
}

/** Grant extra generations that stack on top of the normal 3-credit pool. */
export function grantBonusCredits(n: number) {
  saveBonus(loadBonus() + n);
  try { window.dispatchEvent(new CustomEvent("cs:bonus-credits-updated")); } catch {}
}

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
  const [bonus, setBonus] = useState<number>(loadBonus);
  const [nextRefillLabel, setNextRefillLabel] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Persist whenever data changes
  useEffect(() => { save(data); }, [data]);
  useEffect(() => { saveBonus(bonus); }, [bonus]);

  // Sync when other components grant bonus
  useEffect(() => {
    const handler = () => setBonus(loadBonus());
    window.addEventListener("cs:bonus-credits-updated", handler);
    return () => window.removeEventListener("cs:bonus-credits-updated", handler);
  }, []);

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

  const remaining = data.credits + bonus;
  const isAtLimit = remaining <= 0;
  const isNearLimit = remaining === 1;

  const increment = useCallback(() => {
    // Spend bonus first, then regular credits
    if (loadBonus() > 0) {
      setBonus((b) => Math.max(0, b - 1));
      return;
    }
    setData((prev) => {
      const next = { credits: Math.max(0, prev.credits - 1), lastRefillAt: prev.credits >= MAX_CREDITS ? Date.now() : prev.lastRefillAt };
      return next;
    });
  }, []);

  return { remaining, isAtLimit, isNearLimit, increment, count: MAX_CREDITS - data.credits, nextRefillLabel, bonus };
}
