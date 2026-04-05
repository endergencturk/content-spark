import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sparkles, Zap, Clock, Image, TrendingUp, Calendar, Monitor, ChevronRight, Star, Check, Play, Crown, Sun, Moon, LogIn, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import { UpgradeDialog } from "@/components/UpgradeDialog";
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
          <button onClick={() => scrollTo("features")} className="hover:text-foreground transition-colors">Features</button>
          <button onClick={() => scrollTo("how-it-works")} className="hover:text-foreground transition-colors">How It Works</button>
          <button onClick={() => scrollTo("pricing")} className="hover:text-foreground transition-colors">Pricing</button>
          <Link to="/app" className="hover:text-foreground transition-colors">App</Link>
          <button onClick={() => scrollTo("contact")} className="hover:text-foreground transition-colors">Contact</button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleLandingTheme}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
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
          <Link to="/app">
            <Button size="sm" className="rounded-xl font-semibold shadow-[var(--shadow-warm)]">
              Try Free
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}

/* ───── Hero ───── */
function Hero() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
      {/* bg glow */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/8 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* copy */}
          <div className="text-center lg:text-left">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-semibold text-primary">
              <Zap className="h-3.5 w-3.5" /> AI-Powered Content Engine
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
              Generate Viral Short-Form Content{" "}
              <span className="bg-[var(--gradient-primary)] bg-clip-text text-transparent">in Seconds</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              AI-powered hooks, scripts, thumbnails &amp; posting strategy for TikTok, YouTube Shorts and Instagram Reels.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link to="/app">
                <Button size="lg" className="rounded-2xl text-base font-bold px-8 shadow-[var(--shadow-warm)] w-full sm:w-auto">
                  <Zap className="h-4 w-4 mr-1" /> Try Free
                </Button>
              </Link>
              <Button
                variant="outline"
                size="lg"
                className="rounded-2xl text-base font-medium px-8"
                onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              >
                <Play className="h-4 w-4 mr-1" /> See How It Works
              </Button>
            </div>

            {/* stats */}
            <div className="mt-10 flex gap-8 justify-center lg:justify-start text-center">
              {[
                ["10,000+", "Content Packs"],
                ["50+", "Niches"],
                ["8.7", "Avg Viral Score"],
              ].map(([val, label]) => (
                <div key={label}>
                  <p className="text-2xl font-extrabold text-foreground">{val}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* product preview card */}
          <div className="relative mx-auto w-full max-w-md lg:max-w-none">
            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-2xl shadow-primary/5">
              <div className="mb-4 flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-destructive/60" />
                <div className="h-3 w-3 rounded-full bg-accent/80" />
                <div className="h-3 w-3 rounded-full bg-primary/40" />
              </div>

              <div className="space-y-4">
                <div className="rounded-xl bg-muted/50 p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Topic</p>
                  <p className="text-sm font-medium text-foreground">He Vanished Inside an Airport. No Trace.</p>
                </div>

                <div className="rounded-xl bg-primary/5 border border-primary/10 p-3">
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
                  <div className="flex items-center gap-1 rounded-lg bg-green-500/10 px-2.5 py-1">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs font-bold text-green-500">8.7/10</span>
                  </div>
                </div>
              </div>
            </div>
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
    <section id="features" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">Everything You Need to Go Viral</h2>
          <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
            A complete toolkit designed for creators who want to grow fast.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-[var(--shadow-card-hover)]">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
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
    <section id="how-it-works" className="py-20 sm:py-28 bg-muted/30">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">
          From idea to ready-to-upload in <span className="bg-[var(--gradient-primary)] bg-clip-text text-transparent">60 seconds</span>
        </h2>
        <div className="mt-14 grid gap-8 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.num} className="relative">
              <span className="text-5xl font-black text-primary/15">{s.num}</span>
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
  const [active, setActive] = useState<ComparisonKey>("original");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const data = COMPARISON_DATA[active];

  const scoreColor =
    data.score >= 9
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

        {/* Segmented Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-2xl border border-border/50 bg-muted/50 p-1 gap-1">
            {TOGGLE_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setActive(opt.key)}
                className={`rounded-xl px-4 sm:px-6 py-2 text-xs sm:text-sm font-semibold transition-all ${
                  active === opt.key
                    ? "bg-primary text-primary-foreground shadow-[var(--shadow-warm)]"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Card */}
        <div
          className={`rounded-2xl border bg-card p-6 sm:p-8 transition-all duration-300 ${
            active === "pro"
              ? "border-primary/50 shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)]"
              : "border-border/50 shadow-[var(--shadow-card)]"
          }`}
        >
          {/* Badge */}
          {data.badge && (
            <div className="mb-4">
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                  data.badge === "Pro"
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {data.badge === "Pro" && <Crown className="h-3 w-3 mr-1" />}
                {data.badge === "Pro" ? "Pro Quality" : "Free Tier"}
              </span>
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

          <div className="mt-6 flex items-center justify-between border-t border-border/50 pt-4">
            <div className="flex gap-2">
              <span className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">TikTok</span>
              <span className="rounded-lg bg-destructive/10 px-3 py-1.5 text-xs font-bold text-destructive">YouTube Shorts</span>
            </div>
            <div className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 ${scoreColor}`}>
              <Star className="h-4 w-4 fill-current" />
              <span className="text-sm font-bold">{data.score} / 10</span>
            </div>
          </div>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/app">
            <Button size="lg" className="rounded-2xl text-base font-bold px-8 shadow-[var(--shadow-warm)] w-full sm:w-auto">
              <Zap className="h-4 w-4 mr-1" /> Try Free
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            className="rounded-2xl text-base font-medium px-8"
            onClick={() => setUpgradeOpen(true)}
          >
            <Crown className="h-4 w-4 mr-1" /> Unlock Pro Quality
          </Button>
        </div>
      </div>

      <UpgradeDialog open={upgradeOpen} onOpenChange={setUpgradeOpen} />
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
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground text-center">Creators Are Already Using It</h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.handle} className="rounded-2xl border border-border/50 bg-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">{t.avatar}</span>
                <span className="text-sm font-bold text-primary">{t.handle}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">"{t.quote}"</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ───── Pricing ───── */
function Pricing() {
  const { setShowAuthModal } = useAuth();

  return (
    <section id="pricing" className="py-20 sm:py-28">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground text-center">Simple, Transparent Pricing</h2>
        <p className="mt-3 text-center text-muted-foreground">Start free. Upgrade when you're ready.</p>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {/* Free */}
          <div className="rounded-2xl border border-border/50 bg-card p-8">
            <h3 className="text-lg font-bold text-foreground">Free</h3>
            <p className="mt-1 text-4xl font-extrabold text-foreground">$0<span className="text-base font-medium text-muted-foreground">/month</span></p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {["3 generations / day", "TikTok + Shorts", "3 hooks per generation", "5 image prompts", "Basic SEO tags"].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" />{f}</li>
              ))}
            </ul>
            <Link to="/app" className="block mt-8">
              <Button variant="outline" className="w-full rounded-xl font-semibold">Start Free</Button>
            </Link>
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl border-2 border-primary bg-card p-8 shadow-[var(--shadow-warm)]">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">
              Early Access
            </span>
            <h3 className="text-lg font-bold text-foreground">Pro</h3>
            <p className="mt-1 text-4xl font-extrabold text-foreground">$15<span className="text-base font-medium text-muted-foreground">/month</span></p>
            <p className="mt-1 text-xs text-muted-foreground">Early access — billing coming soon</p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              {[
                "Unlimited generations",
                "All platforms",
                "8 hooks + A/B testing",
                "10 image prompts",
                "Weekly content plan",
                "Bulk pack generation",
                "Voice speed control",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2"><Check className="h-4 w-4 text-primary shrink-0" />{f}</li>
              ))}
            </ul>
            <Button
              className="w-full mt-8 rounded-xl font-semibold shadow-[var(--shadow-warm)]"
              onClick={() => setShowAuthModal(true)}
            >
              <Crown className="h-4 w-4 mr-2" />
              Request Access
            </Button>
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              Have an invite code? Enter it during sign up to unlock Pro.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───── Final CTA ───── */
function FinalCTA() {
  return (
    <section className="py-20 sm:py-28 bg-muted/30">
      <div className="mx-auto max-w-2xl px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground">Ready to go viral?</h2>
        <p className="mt-4 text-muted-foreground text-lg">Start generating content for free. No credit card required.</p>
        <Link to="/app" className="inline-block mt-8">
          <Button size="lg" className="rounded-2xl text-base font-bold px-10 shadow-[var(--shadow-warm)]">
            <Zap className="h-4 w-4 mr-1" /> Start Free Now
          </Button>
        </Link>
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
            <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-colors">Features</button>
            <button onClick={() => document.getElementById("pricing")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-foreground transition-colors">Pricing</button>
            <Link to="/app" className="hover:text-foreground transition-colors">App</Link>
          </div>
        </div>

        <div className="mt-8 text-center">
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
      <AuthModal />
    </div>
  );
}
