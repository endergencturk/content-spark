import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, BarChart3, Users, TrendingUp, Flame, ShieldCheck, ArrowLeft, ExternalLink, FileText, Monitor, UserCircle2 } from "lucide-react";
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

type AdminCreds = { username: string; password: string };

/* ──── Password gate ──── */
function PasswordGate({ onSuccess }: { onSuccess: (creds: AdminCreds) => void }) {
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
        // Hand creds to in-memory state only — never persisted.
        onSuccess({ username, password: pw });
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
function Dashboard({ creds, onLogout }: { creds: AdminCreds; onLogout: () => void }) {
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
    async function loadAll() {
      // Use the admin-list-members function as the single privileged data source.
      // It returns members (via service role) AND we use it to gate access; stats
      // are derived from generations using the same admin credentials check by
      // re-using the function. For now stats are fetched client-side: since RLS
      // now requires user_id ownership, the anon client will only see rows the
      // admin's session owns — which for an admin login is none. We therefore
      // rely on the admin-list-members function for member data and skip the
      // direct generations query (would otherwise return empty under new RLS).
      setStats({
        total: 0,
        avgScore: 0,
        topNiches: [],
        uniqueDevices: 0,
        topPlatforms: [],
        topContentTypes: [],
        topTopics: [],
        recentCount: 0,
      });

      const { data, error } = await supabase.functions.invoke("admin-list-members", {
        body: { username: creds.username, password: creds.password },
      });
      if (error || !data?.members) {
        setMembers([]);
      } else {
        setMembers(data.members as Member[]);
      }
    }

    loadAll();
  }, [creds]);

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
          <Button variant="ghost" size="sm" onClick={onLogout} className="text-muted-foreground hover:text-foreground">Logout</Button>
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
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Members</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold text-foreground">{(members?.length ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">registered users</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Pro Members</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold text-foreground">
                    {members ? members.filter((m) => m.plan_type === "pro").length : "—"}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Free / Trial</CardTitle>
                  <Flame className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold text-foreground">
                    {members ? members.filter((m) => m.plan_type !== "pro").length : "—"}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">New This Week</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-extrabold text-foreground">
                    {members
                      ? members.filter(
                          (m) => new Date(m.created_at).getTime() > Date.now() - 7 * 86400000
                        ).length
                      : "—"}
                  </p>
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

/* ──── Admin Page ──── */
export default function Admin() {
  // Credentials kept in React memory only — NEVER in localStorage/sessionStorage.
  // Refresh = re-login. This prevents XSS / extension exfiltration.
  const [creds, setCreds] = useState<AdminCreds | null>(null);
  if (!creds) return <PasswordGate onSuccess={setCreds} />;
  return <Dashboard creds={creds} onLogout={() => setCreds(null)} />;
}
