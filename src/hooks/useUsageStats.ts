import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UsageStats {
  totalPosted: number;
  topStyle: string | null;
  topPlatform: string | null;
  postedThisWeek: number;
  publishRate: number; // 0-1 (posted / total generations)
}

function mode<T extends string>(arr: T[]): T | null {
  if (!arr.length) return null;
  const counts = new Map<T, number>();
  for (const v of arr) counts.set(v, (counts.get(v) || 0) + 1);
  let best: T | null = null;
  let bestCount = 0;
  counts.forEach((c, k) => { if (c > bestCount) { best = k; bestCount = c; } });
  return best;
}

export function useUsageStats(deviceId: string | null, refreshKey = 0) {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      // Fetch used rows
      const { data: used } = await supabase
        .from("generations")
        .select("style, used_at, used_platform")
        .eq("device_id", deviceId)
        .not("used_at", "is", null)
        .order("used_at", { ascending: false })
        .limit(200);
      const { count: totalGen } = await supabase
        .from("generations")
        .select("*", { count: "exact", head: true })
        .eq("device_id", deviceId);
      const rows = (used || []) as any[];
      const weekAgo = Date.now() - 7 * 86400000;
      const s: UsageStats = {
        totalPosted: rows.length,
        topStyle: mode(rows.map((r) => r.style).filter(Boolean)),
        topPlatform: mode(rows.map((r) => r.used_platform).filter(Boolean)),
        postedThisWeek: rows.filter((r) => r.used_at && new Date(r.used_at).getTime() > weekAgo).length,
        publishRate: totalGen && totalGen > 0 ? rows.length / totalGen : 0,
      };
      setStats(s);
    } catch (e) {
      console.warn("usage stats load failed", e);
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  return { stats, loading, refresh: load };
}