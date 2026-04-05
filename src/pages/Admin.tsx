import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, BarChart3, Users, TrendingUp, Flame, ShieldCheck, ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

/* ──── Password gate ──── */
function PasswordGate({ onSuccess }: { onSuccess: () => void }) {
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("admin-auth", {
        body: { username, password: pw },
      });
      if (fnError || !data?.success) {
        setError("Invalid credentials. Access denied.");
      } else {
        sessionStorage.setItem("admin_auth", "1");
        onSuccess();
      }
    } catch {
      setError("Authentication unavailable. Try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Admin Access</h1>
          <p className="mt-1 text-sm text-muted-foreground">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-xl"
            autoFocus
            autoComplete="username"
          />
          <Input
            type="password"
            placeholder="Password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="rounded-xl"
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full rounded-xl font-semibold" disabled={loading || !username || !pw}>
            {loading ? "Verifying…" : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ──── Dashboard ──── */
function Dashboard() {
  const [stats, setStats] = useState<{
    total: number;
    avgScore: number;
    topNiches: { niche: string; count: number }[];
    uniqueDevices: number;
  } | null>(null);

  useEffect(() => {
    async function load() {
      // Fetch all generations
      const { data, error } = await supabase
        .from("generations")
        .select("id, output_json, style, device_id");

      if (error || !data) {
        setStats({ total: 0, avgScore: 0, topNiches: [], uniqueDevices: 0 });
        return;
      }

      const total = data.length;

      // Avg viral score
      let scoreSum = 0;
      let scoreCount = 0;
      data.forEach((g: any) => {
        const oj = g.output_json as any;
        const score = oj?.viralScore ?? oj?.viral_score;
        if (typeof score === "number") {
          scoreSum += score;
          scoreCount++;
        }
      });
      const avgScore = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0;

      // Top niches
      const nicheMap: Record<string, number> = {};
      data.forEach((g: any) => {
        const n = g.style || "Unknown";
        nicheMap[n] = (nicheMap[n] || 0) + 1;
      });
      const topNiches = Object.entries(nicheMap)
        .map(([niche, count]) => ({ niche, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

      // Unique devices
      const uniqueDevices = new Set(data.map((g: any) => g.device_id)).size;

      setStats({ total, avgScore, topNiches, uniqueDevices });
    }
    load();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground hidden sm:inline">Admin Dashboard</span>
            <span className="font-bold text-foreground sm:hidden text-sm">Admin</span>
            <div className="h-4 w-px bg-border/60 hidden sm:block" />
            <Link to="/" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-3 w-3" />
              <span>Home</span>
            </Link>
            <Link to="/app" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="h-3 w-3" />
              <span>App</span>
            </Link>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            Logout
          </Button>
        </div>
      </nav>

      <div className="mx-auto max-w-5xl px-4 py-8">
        {!stats ? (
          <p className="text-center text-muted-foreground py-20">Loading stats…</p>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Generated</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold text-foreground">{stats.total.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Viral Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold text-foreground">{stats.avgScore}</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Unique Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold text-foreground">{stats.uniqueDevices.toLocaleString()}</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Top Niche</CardTitle>
                  <Flame className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold text-foreground">{stats.topNiches[0]?.niche || "—"}</p>
                </CardContent>
              </Card>
            </div>

            {/* Top niches table */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">Most Used Niches</CardTitle>
              </CardHeader>
              <CardContent>
                {stats.topNiches.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {stats.topNiches.map((n) => (
                      <div key={n.niche} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground capitalize">{n.niche}</span>
                        <div className="flex items-center gap-3">
                          <div className="h-2 rounded-full bg-primary/20 w-32">
                            <div
                              className="h-2 rounded-full bg-primary"
                              style={{ width: `${Math.min(100, (n.count / (stats.topNiches[0]?.count || 1)) * 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{n.count}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

/* ──── Admin Page ──── */
export default function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("admin_auth") === "1");

  if (!authed) return <PasswordGate onSuccess={() => setAuthed(true)} />;
  return <Dashboard />;
}
