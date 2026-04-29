import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, Zap, Clock, Image, TrendingUp, Calendar, Monitor, ChevronRight, Star, Check, Play, Crown, Sun, Moon, LogIn, LogOut, User, Flame, Rocket, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { useRouteThemeSync } from "@/contexts/SettingsContext";

/* ───── smooth-scroll helper ───── */
function useSmoothScroll() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      el?.scrollIntoView({ behavior: "smooth" });
    }
  }, [hash]);
}

/* ───── Navbar ───── */
function LandingNav() {
  const [isDark, setIsDark] = useState(() =>
    typeof document !== "undefined" && document.documentElement.classList.contains("dark")
  );
  const { user, setShowAuthModal, signOut } = useAuth();

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleLandingTheme = () => {
    const next = isDark ? "light" : "dark";
    localStorage.setItem("viralengine-landing-theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
    setIsDark(next === "dark");
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">Content Spark</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Button variant="link" className="text-muted-foreground p-0 h-auto" onClick={() => scrollTo("features")}>Features</Button>
          <Button variant="link" className="text-muted-foreground p-0 h-auto" onClick={() => scrollTo("how-it-works")}>How It Works</Button>
          <Button variant="link" className="text-muted-foreground p-0 h-auto" onClick={() => scrollTo("pricing")}>Pricing</Button>
          <Link to="/app" className="hover:text-foreground transition-colors">App</Link>
          <Button variant="link" className="text-muted-foreground p-0 h-auto" onClick={() => scrollTo("contact")}>Contact</Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLandingTheme}
            className="rounded-xl"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => signOut()}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              Sign Out
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground"
              onClick={() => setShowAuthModal(true)}
            >
              <LogIn className="h-4 w-4 mr-1.5" />
              Sign In
            </Button>
          )}
          {user ? (
            <Link to="/app">
              <Button size="sm" className="rounded-xl font-semibold shadow-[var(--shadow-warm)]">
                Open app
              </Button>
            </Link>
          ) : (
            <Button
              size="sm"
              className="rounded-xl font-semibold shadow-[var(--shadow-warm)]"
              onClick={() => setShowAuthModal(true)}
            >
              Sign up free
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}

/* ───── Hero ───── */
function Hero() {
  const { user, setShowAuthModal } = useAuth();
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
      {/* animated grid + orbs background */}
      <div className="pointer-events-none absolute inset-0 -z-10 bg-grid-fade" />
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-10 h-[420px] w-[420px] rounded-full bg-primary/20 blur-[120px] animate-orb-1" />
        <div className="absolute right-1/4 top-32 h-[360px] w-[360px] rounded-full bg-fuchsia-500/15 blur-[120px] animate-orb-2" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 h-[500px] w-[700px] rounded-full bg-violet-500/10 blur-[120px] animate-pulse-glow" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* copy */}
          <div className="text-center lg:text-left">
            <div className="relative mb-6 inline-flex items-center gap-2 overflow-hidden rounded-full border border-primary/30 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
              <span className="relative z-10 flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-green-500 animate-live-pulse" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                AI Engine · Live now
                <Flame className="h-3.5 w-3.5" />
              </span>
              <span className="absolute inset-0 animate-shimmer" />
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Generate Viral Short-Form Content{" "}
              <span className="text-gradient-animated">in Seconds</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              AI-powered hooks, scripts, thumbnails &amp; posting strategy for TikTok, YouTube Shorts and Instagram Reels.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              {user ? (
                <Link to="/app">
                  <Button size="lg" className="group rounded-2xl text-base font-bold px-8 shadow-[var(--shadow-warm)] w-full sm:w-auto transition-transform hover:scale-[1.03] hover:shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.5)]">
                    <Zap className="h-4 w-4 mr-1 transition-transform group-hover:rotate-12" /> Open the app
                  </Button>
                </Link>
              ) : (
                <Button
                  size="lg"
                  className="group rounded-2xl text-base font-bold px-8 shadow-[var(--shadow-warm)] w-full sm:w-auto transition-transform hover:scale-[1.03] hover:shadow-[0_8px_30px_-4px_hsl(var(--primary)/0.5)]"
                  onClick={() => setShowAuthModal(true)}
                >
                  <Zap className="h-4 w-4 mr-1 transition-transform group-hover:rotate-12" /> Sign up free
                </Button>
              )}
              <Button
                variant="outline"
                size="lg"
                className="group rounded-2xl text-base font-medium px-8 transition-all hover:border-primary/50 hover:bg-primary/5"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Play className="h-4 w-4 mr-1 transition-transform group-hover:translate-x-0.5" /> See How It Works
              </Button>
            </div>

            {/* stats */}
            <div className="mt-10 flex gap-8 justify-center lg:justify-start text-center">
              {[
                ["10,000+", "Content Packs"],
                ["50+", "Niches"],
                ["8.7", "Avg Viral Score"],
              ].map(([val, label], i) => (
                <div key={label} className="animate-count-up" style={{ animationDelay: `${i * 120}ms` }}>
                  <p className="text-2xl font-extrabold text-gradient-animated">{val}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* product preview card */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none animate-float-slow">
            {/* glow halo */}
            <div className="pointer-events-none absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-br from-primary/30 via-fuchsia-500/20 to-violet-500/20 blur-2xl opacity-60 animate-pulse-glow" />
            <div className="rounded-2xl border border-border/50 bg-card/90 backdrop-blur p-6 shadow-2xl shadow-primary/10 glow-border">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-accent/80" />
                <div className="h-3 w-3 rounded-full bg-primary/40" />
                <div className="ml-auto flex items-center gap-1.5 rounded-full bg-green-500/10 px-2 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold text-green-500">GENERATING</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Topic</p>
                  <p className="text-sm font-medium text-foreground">He Vanished Inside an Airport. No Trace.</p>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-primary/10 to-fuchsia-500/5 border border-primary/20 p-3 animate-float-medium">
                  <p className="text-[10px] uppercase tracking-widest text-primary mb-1">🪝 Best Hook</p>
                  <p className="text-sm font-bold text-foreground">"Vanished. On camera."</p>
                </div>

                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">📜 Script Preview</p>
                  <div className="text-xs text-muted-foreground space-y-1 font-mono">
                    <p>Vanished.</p>
                    <p>He walked into the terminal.</p>
                    <p>Security footage shows him enter.</p>
                    <p>But he never exits.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-[10px] font-bold text-primary">TikTok</span>
                    <span className="rounded-lg bg-destructive/10 px-2.5 py-1 text-[10px] font-bold text-destructive">YouTube Shorts</span>
                  </div>
                  <div className="flex items-center gap-1 rounded-lg bg-green-500/10 px-2.5 py-1 animate-pulse-glow">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs font-bold text-green-500">8.7/10</span>
                  </div>
                </div>
              </div>
            </div>

            {/* floating accent badges */}
            <div className="pointer-events-none absolute -left-6 top-12 hidden lg:flex animate-float-medium items-center gap-1.5 rounded-full border border-border/50 bg-card/90 backdrop-blur px-3 py-1.5 shadow-lg">
              <Wand2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-bold text-foreground">AI Hook Lab</span>
            </div>
            <div className="pointer-events-none absolute -right-4 -bottom-4 hidden lg:flex animate-float-slow items-center gap-1.5 rounded-full border border-border/50 bg-card/90 backdrop-blur px-3 py-1.5 shadow-lg">
              <Rocket className="h-3.5 w-3.5 text-fuchsia-500" />
              <span className="text-[11px] font-bold text-foreground">+312% reach</span>
            </div>
          </div>
        </div>

        {/* Marquee — trusted by / platforms */}
        <div className="relative mt-20 overflow-hidden border-y border-border/40 py-5 [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
          <div className="flex w-max animate-marquee gap-12 pr-12">
            {[...Array(2)].flatMap((_, j) =>
              [
                "TikTok", "YouTube Shorts", "Instagram Reels", "ElevenLabs", "Midjourney",
                "Gemini 3", "GPT-5", "Whisper", "DALL·E", "Suno",
              ].map((p, i) => (
                <span key={`${j}-${i}`} className="text-sm font-bold uppercase tracking-widest text-muted-foreground/60 whitespace-nowrap">
                  {p}
                </span>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───── Features ───── */
const FEATURES = [
  { icon: Zap, title: "Hook Engine", desc: "5 psychological hook types that stop the scroll in under 2 seconds." },
  { icon: Clock, title: "Script Timing", desc: "Real voiceover timing with ElevenLabs speed calibration." },
  { icon: Image, title: "Thumbnail Ideas", desc: "AI-generated image prompts ready for Midjourney or DALL·E." },
  { icon: TrendingUp, title: "Trending Topics", desc: "Live viral ideas across 50+ niches, updated daily." },
  { icon: Calendar, title: "Weekly Content Plan", desc: "7-day content calendar tailored to your channel." },
  { icon: Monitor, title: "Platform Adapt", desc: "Optimized output for TikTok, YouTube Shorts & Instagram Reels." },
];

function Features() {
  return (
    <section id="features" className="relative py-20 sm:py-28">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[120px] animate-orb-2" />
      </div>
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
            Everything You Need to <span className="text-gradient-animated">Go Viral</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            A complete toolkit designed for creators who want to grow fast.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Card
              key={f.title}
              className="group hover-lift glow-border rounded-2xl border-border/50 bg-card/70 backdrop-blur transition-all hover:border-primary/40 hover:shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.35)]"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <CardHeader className="pb-3">
              <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-fuchsia-500/10 text-primary transition-all duration-300 group-hover:from-primary group-hover:to-fuchsia-500 group-hover:text-primary-foreground group-hover:scale-110 group-hover:rotate-3 group-hover:shadow-[0_8px_20px_-4px_hsl(var(--primary)/0.5)]">
                <f.icon className="h-5 w-5" />
              </div>
              <CardTitle className="text-lg">{f.title}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm leading-relaxed">{f.desc}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── How It Works ───── */
const STEPS = [
  { num: "01", title: "Choose niche & topic", desc: "Pick from 50+ niches or enter your own. Add a topic or let AI suggest one." },
  { num: "02", title: "Generate content pack", desc: "Get hooks, scripts, thumbnails, SEO tags, and a viral score — all in seconds." },
  { num: "03", title: "Upload and go viral", desc: "Copy your content, upload to your platform, and watch the views roll in." },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-20 sm:py-28 bg-muted/30 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/4 top-1/2 h-[400px] w-[400px] rounded-full bg-violet-500/10 blur-[120px] animate-orb-1" />
      </div>
      <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
          From idea to ready-to-upload in <span className="text-gradient-animated">60 seconds</span>
        </h2>
        <div className="mt-14 grid gap-8 sm:grid-cols-3 relative">
          {/* connector line */}
          <div className="hidden sm:block absolute top-8 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          {STEPS.map((s, i) => (
            <div key={s.num} className="relative group">
              <span className="inline-block text-5xl font-black bg-gradient-to-br from-primary to-fuchsia-500 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-110">{s.num}</span>
              <h3 className="mt-2 text-lg font-bold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── Before / Free / Pro Comparison ───── */
const COMPARISON_DATA = {
  original: {
    topic: "He disappeared at an airport",
    hook: "He went missing.",
    script: ["He entered the airport.", "After that, nobody could find him.", "People were confused.", "No one knew what happened."],
    score: 4.1,
    badge: null,
  },
  free: {
    topic: "He Vanished Inside an Airport. No Trace.",
    hook: "Vanished. On camera.",
    script: ["Vanished.", "He walked into the terminal.", "Security footage shows him enter.", "But he never exits."],
    score: 8.7,
    badge: "Free",
  },
  pro: {
    topic: "He Vanished Inside an Airport. No Trace.",
    hook: "Vanished. On camera. Then erased.",
    script: ["Vanished.", "He walked into the terminal at 8:14 PM.", "Security footage shows him enter.", "No exit. No trace. No explanation."],
    score: 10,
    badge: "Pro",
  },
} as const;

type ComparisonKey = keyof typeof COMPARISON_DATA;

const TOGGLE_OPTIONS: { key: ComparisonKey; label: string }[] = [
  { key: "original", label: "Original" },
  { key: "free", label: "Free Upgrade" },
  { key: "pro", label: "Pro Upgrade" },
];

function ExampleOutput() {
  const { user, setShowAuthModal } = useAuth();
  const [active, setActive] = useState<string>("original");
  const data = COMPARISON_DATA[active as ComparisonKey];

  const scoreColor = data.score >= 9
    ? "text-primary bg-primary/10"
    : data.score >= 7
    ? "text-green-500 bg-green-500/10"
    : "text-orange-500 bg-orange-500/10";

  return (
    <section className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">See What You Get</h2>
          <p className="mt-3 text-muted-foreground">Watch content transform from generic to viral-ready.</p>
        </div>

        {/* Segmented Toggle using Tabs */}
        <Tabs value={active} onValueChange={setActive} className="w-full">
          <div className="flex justify-center mb-8">
            <TabsList className="rounded-2xl h-auto p-1">
              {TOGGLE_OPTIONS.map((opt) => (
                <TabsTrigger key={opt.key} value={opt.key} className="rounded-xl px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold data-[state=active]:shadow-[var(--shadow-warm)]">
                  {opt.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

        {/* Content Card */}
        <Card
          className={`rounded-2xl p-6 sm:p-8 transition-all duration-300 ${
            active === "pro"
              ? "border-primary/50 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)]"
              : "border-border/50"
          }`}
        >
          {data.badge && (
            <div className="mb-4">
              <Badge variant={data.badge === "Pro" ? "default" : "secondary"} className="rounded-full text-[10px] uppercase tracking-wider">
                {data.badge === "Pro" && <Crown className="h-3 w-3 mr-1 inline" />}
                {data.badge === "Pro" ? "Pro Quality" : "Free Tier"}
              </Badge>
            </div>
          )}

          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Topic</p>
          <p className="text-lg font-bold text-foreground mb-6">{data.topic}</p>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-primary mb-2">🪝 Hook</p>
              <p className="text-xl font-extrabold text-foreground">"{data.hook}"</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">📜 Script</p>
              <div className={`space-y-1 text-sm font-mono ${active === "original" ? "text-muted-foreground/70" : "text-muted-foreground"}`}>
                {data.script.map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </div>
            </div>
          </div>

          <Separator className="my-6" />
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-0">TikTok</Badge>
              <Badge variant="secondary" className="bg-destructive/10 text-destructive border-0">YouTube Shorts</Badge>
            </div>
            <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${scoreColor}`}>
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm font-bold">{data.score} / 10</span>
            </div>
          </div>
        </Card>
        </Tabs>

        {/* CTAs */}
        <div className="mt-8 flex justify-center">
          {user ? (
            <Link to="/app">
              <Button size="lg" className="rounded-2xl text-base font-bold px-8 shadow-[var(--shadow-warm)] w-full sm:w-auto">
                <Zap className="h-4 w-4 mr-1" /> Open the app
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              className="rounded-2xl text-base font-bold px-8 shadow-[var(--shadow-warm)] w-full sm:w-auto"
              onClick={() => setShowAuthModal(true)}
            >
              <Zap className="h-4 w-4 mr-1" /> Sign up free
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

/* ───── Testimonials ───── */
const TESTIMONIALS = [
  { handle: "@darkrabbithole", quote: "2.1K views in 24 hours on my first video using Content Spark hooks.", avatar: "🐰" },
  { handle: "@mysterychannel", quote: "Made 30 videos in 1 week. The weekly plan feature is insane.", avatar: "🔮" },
  { handle: "@truecrimefan", quote: "My viral score went from 7.2 to 9.1. The hook engine actually works.", avatar: "🔍" },
];

function Testimonials() {
  return (
    <section className="relative py-20 sm:py-28 bg-muted/30 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute right-10 top-10 h-[300px] w-[300px] rounded-full bg-fuchsia-500/10 blur-[100px] animate-orb-2" />
      </div>
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground text-center">
          Creators Are <span className="text-gradient-animated">Already Using It</span>
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((item) => (
            <Card key={item.handle} className="hover-lift glow-border rounded-2xl border-border/50 bg-card/70 backdrop-blur transition-all hover:border-primary/30">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl transition-transform hover:scale-125 hover:rotate-12">{item.avatar}</span>
                  <CardTitle className="text-sm text-primary">{item.handle}</CardTitle>
                </div>
                <div className="flex gap-0.5 mt-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">"{item.quote}"</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── Pricing ───── */
function Pricing() {
  const { user, setShowAuthModal } = useAuth();

  const contactSubject = encodeURIComponent("Pro Upgrade Request — Content Spark");
  const contactBody = encodeURIComponent(
    `Hi,\n\nI'd like to upgrade to the Pro plan ($19/mo).\n\nAccount email: ${user?.email ?? ""}\n\nThanks!`
  );
  const contactMailto = `mailto:hello@contentspark.app?subject=${contactSubject}&body=${contactBody}`;

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">Start with a 3-day free trial</h2>
        <p className="mt-3 text-muted-foreground">Full Pro access for 3 days. No credit card required to start.</p>

        <div className="mt-12 grid gap-6 md:grid-cols-2 max-w-3xl mx-auto">
          {/* Trial card */}
          <Card className="rounded-2xl text-left">
            <CardHeader>
              <CardTitle>Free Trial</CardTitle>
              <p className="text-4xl font-extrabold text-foreground">$0</p>
              <CardDescription>3 days · Full Pro access</CardDescription>
            </CardHeader>
            <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                "All Pro features unlocked",
                "Unlimited generations",
                "All platforms & hook styles",
                "Bulk pack & weekly plan",
                "No credit card required",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" />{f}</li>
              ))}
            </ul>
            </CardContent>
            <CardFooter>
            {user ? (
              <Link to="/app" className="w-full">
                <Button variant="outline" className="w-full rounded-xl font-semibold">
                  Open the app
                </Button>
              </Link>
            ) : (
              <Button
                variant="outline"
                className="w-full rounded-xl font-semibold"
                onClick={() => setShowAuthModal(true)}
              >
                Start free trial
              </Button>
            )}
            </CardFooter>
          </Card>

          {/* Pro card — featured */}
          <Card className="relative rounded-2xl border-2 border-primary text-left shadow-[var(--shadow-warm)]">
            <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-4 py-1">
              Most Popular
            </Badge>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-primary" />
                <CardTitle>Pro</CardTitle>
              </div>
              <p>
                <span className="text-4xl font-extrabold text-foreground">$19</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </p>
              <CardDescription>Continue after your trial ends</CardDescription>
            </CardHeader>
            <CardContent>
            <ul className="space-y-3 text-sm text-muted-foreground">
              {[
                "Everything in Free Trial",
                "Unlimited Pro generations",
                "Bulk pack & weekly content plan",
                "A/B hook testing",
                "Priority support",
                "Cancel anytime",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" />{f}</li>
              ))}
            </ul>
            </CardContent>
            <CardFooter className="flex-col gap-3">
            <Button asChild className="w-full rounded-xl font-semibold shadow-[var(--shadow-warm)]">
              <a href={contactMailto}>Contact us to upgrade</a>
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              Payments aren&apos;t automated yet — contact us and we&apos;ll activate within 24h.
            </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </section>
  );
}

/* ───── Final CTA ───── */
function FinalCTA() {
  const { user, setShowAuthModal } = useAuth();
  return (
    <section className="relative py-20 sm:py-28 bg-muted/30 overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[500px] w-[700px] rounded-full bg-gradient-to-r from-primary/20 via-fuchsia-500/15 to-violet-500/20 blur-[120px] animate-pulse-glow" />
      </div>
      <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
          Ready to <span className="text-gradient-animated">go viral</span>?
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">Sign up free and start generating viral content. No credit card required.</p>
        {user ? (
          <Link to="/app" className="inline-block mt-8">
            <Button size="lg" className="group rounded-2xl text-base font-bold px-10 shadow-[var(--shadow-warm)] transition-all hover:scale-[1.05] hover:shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.6)]">
              <Zap className="h-4 w-4 mr-1 transition-transform group-hover:rotate-12" /> Open the app
            </Button>
          </Link>
        ) : (
          <Button
            size="lg"
            className="group mt-8 rounded-2xl text-base font-bold px-10 shadow-[var(--shadow-warm)] transition-all hover:scale-[1.05] hover:shadow-[0_12px_40px_-8px_hsl(var(--primary)/0.6)]"
            onClick={() => setShowAuthModal(true)}
          >
            <Zap className="h-4 w-4 mr-1 transition-transform group-hover:rotate-12" /> Sign up free
          </Button>
        )}
      </div>
    </section>
  );
}

/* ───── Footer ───── */
function Footer() {
  return (
    <footer id="contact" className="border-t border-border/40 py-12">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold text-foreground">Content Spark</span>
            <span className="text-xs text-muted-foreground ml-2">AI-powered content for creators</span>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Button variant="link" className="text-muted-foreground p-0 h-auto text-sm" onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}>Features</Button>
            <Button variant="link" className="text-muted-foreground p-0 h-auto text-sm" onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })}>Pricing</Button>
            <Link to="/app" className="hover:text-foreground transition-colors">App</Link>
          </div>
        </div>

        <Separator className="my-8" />
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-1">Contact</p>
          <p className="text-xs text-muted-foreground mb-2">For support or questions, reach out anytime.</p>
          <a href="mailto:ender.genctuerk@gmail.com" className="text-sm text-primary hover:text-primary/80 transition-colors">
            ender.genctuerk@gmail.com
          </a>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">© 2026 Content Spark. All rights reserved.</p>
      </div>
    </footer>
  );
}

/* ───── Landing Page ───── */
export default function Landing() {
  useRouteThemeSync();
  useSmoothScroll();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingNav />
      <Hero />
      <Features />
      <HowItWorks />
      <ExampleOutput />
      <Testimonials />
      <Pricing />
      <FinalCTA />
      <Footer />
    </div>
  );
}
