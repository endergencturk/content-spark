import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, BarChart3, Users, TrendingUp, Flame, ShieldCheck, ArrowLeft, ExternalLink, Video, FileText, Monitor, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

type Member = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  plan_type: string;
  created_at: string;
};

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
        // Store creds in sessionStorage so we can call admin-list-members
        sessionStorage.setItem("admin_u", username);
        sessionStorage.setItem("admin_p", pw);
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
          <Input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="rounded-xl" autoFocus autoComplete="username" />
          <Input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} className="rounded-xl" autoComplete="current-password" />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full rounded-xl font-semibold" disabled={loading || !username || !pw}>
            {loading ? "Verifying…" : "Sign In"}
          </Button>
        </form>
      </div>
    </div>
  );
}

/* ──── Stat bar component ──── */
function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground capitalize">{label}</span>
      <div className="flex items-center gap-3">
        <div className="h-2 rounded-full bg-primary/20 w-32">
          <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-xs text-muted-foreground w-10 text-right">{value}</span>
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
    topPlatforms: { platform: string; count: number }[];
    topContentTypes: { type: string; count: number }[];
    topTopics: { topic: string; count: number }[];
    recentCount: number;
  } | null>(null);
  const [members, setMembers] = useState<Member[] | null>(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("generations")
        .select("id, output_json, style, device_id, platforms, content_type, topic, created_at");

      if (error || !data) {
        setStats({ total: 0, avgScore: 0, topNiches: [], uniqueDevices: 0, topPlatforms: [], topContentTypes: [], topTopics: [], recentCount: 0 });
        return;
      }

      const total = data.length;

      // Avg viral score
      let scoreSum = 0;
      let scoreCount = 0;
      data.forEach((g: any) => {
        const oj = g.output_json as any;
        const score = oj?.viralScore ?? oj?.viral_score ?? oj?.score;
        if (typeof score === "number" && score > 0) {
          scoreSum += score;
          scoreCount++;
        }
      });
      const avgScore = scoreCount > 0 ? Math.round((scoreSum / scoreCount) * 10) / 10 : 0;

      // Top niches
      const nicheMap: Record<string, number> = {};
      data.forEach((g: any) => { const n = g.style || "Unknown"; nicheMap[n] = (nicheMap[n] || 0) + 1; });
      const topNiches = Object.entries(nicheMap).map(([niche, count]) => ({ niche, count })).sort((a, b) => b.count - a.count).slice(0, 8);

      // Unique devices
      const uniqueDevices = new Set(data.map((g: any) => g.device_id)).size;

      // Top platforms
      const platMap: Record<string, number> = {};
      data.forEach((g: any) => {
        const platforms = g.platforms || [];
        platforms.forEach((p: string) => { platMap[p] = (platMap[p] || 0) + 1; });
      });
      const topPlatforms = Object.entries(platMap).map(([platform, count]) => ({ platform, count })).sort((a, b) => b.count - a.count).slice(0, 5);

      // Top content types
      const ctMap: Record<string, number> = {};
      data.forEach((g: any) => { const ct = g.content_type || "unknown"; ctMap[ct] = (ctMap[ct] || 0) + 1; });
      const topContentTypes = Object.entries(ctMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count).slice(0, 5);

      // Top topics (keywords)
      const topicMap: Record<string, number> = {};
      data.forEach((g: any) => {
        const t = (g.topic || "").toLowerCase().trim();
        if (t) topicMap[t] = (topicMap[t] || 0) + 1;
      });
      const topTopics = Object.entries(topicMap).map(([topic, count]) => ({ topic, count })).sort((a, b) => b.count - a.count).slice(0, 10);

      // Recent (last 24h)
      const dayAgo = new Date(Date.now() - 86400000).toISOString();
      const recentCount = data.filter((g: any) => g.created_at > dayAgo).length;

      setStats({ total, avgScore, topNiches, uniqueDevices, topPlatforms, topContentTypes, topTopics, recentCount });
    }

    async function loadMembers() {
      const username = sessionStorage.getItem("admin_u");
      const password = sessionStorage.getItem("admin_p");
      if (!username || !password) {
        setMembers([]);
        return;
      }
      const { data, error } = await supabase.functions.invoke("admin-list-members", {
        body: { username, password },
      });
      if (error || !data?.members) {
        setMembers([]);
      } else {
        setMembers(data.members as Member[]);
      }
    }

    load();
    loadMembers();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("admin_auth");
    sessionStorage.removeItem("admin_u");
    sessionStorage.removeItem("admin_p");
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
              <ArrowLeft className="h-3 w-3" /><span>Home</span>
            </Link>
            <Link to="/app" className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
              <ExternalLink className="h-3 w-3" /><span>App</span>
            </Link>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">Logout</Button>
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
                  <p className="text-xs text-muted-foreground mt-1">{stats.recentCount} in last 24h</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Avg Viral Score</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold text-foreground">{avgScoreDisplay(stats.avgScore)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.avgScore > 0 ? "from scored generations" : "no scores yet"}</p>
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
                  <p className="text-3xl font-extrabold text-foreground capitalize">{stats.topNiches[0]?.niche || "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{stats.topNiches[0] ? `${stats.topNiches[0].count} generations` : ""}</p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed breakdowns */}
            <div className="grid gap-4 lg:grid-cols-2 mb-8">
              {/* Niches */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Flame className="h-4 w-4 text-primary" /> Niches</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.topNiches.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : stats.topNiches.map((n) => (
                    <StatBar key={n.niche} label={n.niche} value={n.count} max={stats.topNiches[0]?.count || 1} />
                  ))}
                </CardContent>
              </Card>

              {/* Platforms */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Monitor className="h-4 w-4 text-primary" /> Platforms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.topPlatforms.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : stats.topPlatforms.map((p) => (
                    <StatBar key={p.platform} label={p.platform} value={p.count} max={stats.topPlatforms[0]?.count || 1} />
                  ))}
                </CardContent>
              </Card>

              {/* Content Types */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-primary" /> Content Types</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.topContentTypes.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : stats.topContentTypes.map((ct) => (
                    <StatBar key={ct.type} label={ct.type} value={ct.count} max={stats.topContentTypes[0]?.count || 1} />
                  ))}
                </CardContent>
              </Card>

              {/* Top Topics */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" /> Top Topics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {stats.topTopics.length === 0 ? <p className="text-sm text-muted-foreground">No data yet.</p> : stats.topTopics.slice(0, 8).map((t) => (
                    <StatBar key={t.topic} label={t.topic.length > 30 ? t.topic.slice(0, 30) + "…" : t.topic} value={t.count} max={stats.topTopics[0]?.count || 1} />
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Members */}
            <Card className="rounded-2xl mb-8">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <UserCircle2 className="h-4 w-4 text-primary" /> Members
                  {members && <span className="text-xs font-normal text-muted-foreground">({members.length})</span>}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {!members ? (
                  <p className="text-sm text-muted-foreground">Loading members…</p>
                ) : members.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No members yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Email</TableHead>
                          <TableHead>Nickname</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead className="text-right">Joined</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((m) => (
                          <TableRow key={m.user_id}>
                            <TableCell className="font-medium text-foreground">{m.email || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{m.display_name || "—"}</TableCell>
                            <TableCell>
                              <Badge variant={m.plan_type === "pro" ? "default" : "secondary"} className="capitalize">
                                {m.plan_type}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right text-xs text-muted-foreground">
                              {new Date(m.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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

function avgScoreDisplay(score: number) {
  if (score <= 0) return "—";
  return score.toFixed(1);
}

/* ──── Admin Page ──── */
export default function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("admin_auth") === "1");
  if (!authed) return <PasswordGate onSuccess={() => setAuthed(true)} />;
  return <Dashboard />;
}
