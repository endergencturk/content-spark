import React, { useState, useEffect, useMemo, memo } from "react";
import { TrendingUp, RefreshCw, X, Lightbulb } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { type Locale } from "@/lib/i18n";

interface TrendingSuggestion {
  title: string;
  hookWord: string;
  region: string;
}

const TRENDING_DATA: Record<string, TrendingSuggestion[]> = {
  mystery: [
    { title: "The body found in a chimney after 27 years", hookWord: "Found.", region: "🇺🇸" },
    { title: "Why did 3 lighthouse keepers vanish?", hookWord: "Vanished.", region: "🇬🇧" },
    { title: "The hotel guest who checked in but never left", hookWord: "Trapped.", region: "🌍" },
    { title: "The signal that came from an empty house", hookWord: "Dead.", region: "🇺🇸" },
    { title: "A woman erased from every database", hookWord: "Erased.", region: "🇬🇧" },
    { title: "The car found running with no driver", hookWord: "Gone.", region: "🌍" },
    { title: "A child drew their kidnapper's face from memory", hookWord: "Missing.", region: "🇺🇸" },
  ],
  educational: [
    { title: "Your brain deletes memories while you sleep", hookWord: "Deleted.", region: "🌍" },
    { title: "Why you can't remember your dreams", hookWord: "Erased.", region: "🇺🇸" },
    { title: "The color that doesn't actually exist", hookWord: "Impossible.", region: "🇬🇧" },
    { title: "How music physically changes your brain", hookWord: "Rewired.", region: "🌍" },
    { title: "Why mirrors flip left-right but not up-down", hookWord: "Broken.", region: "🇺🇸" },
    { title: "The sound that can make you hallucinate", hookWord: "Poisoned.", region: "🇬🇧" },
    { title: "Why your voice sounds different in recordings", hookWord: "Fake.", region: "🌍" },
  ],
  motivation: [
    { title: "He failed 1,009 times before KFC existed", hookWord: "Rejected.", region: "🇺🇸" },
    { title: "The email that changed a janitor's life forever", hookWord: "Found.", region: "🇬🇧" },
    { title: "Why the hardest year of your life matters most", hookWord: "Broken.", region: "🌍" },
    { title: "The 5-second rule that kills procrastination", hookWord: "Trapped.", region: "🇺🇸" },
    { title: "A blind man who climbed Everest", hookWord: "Impossible.", region: "🌍" },
    { title: "The morning routine billionaires won't share", hookWord: "Hidden.", region: "🇺🇸" },
    { title: "Why your comfort zone is slowly destroying you", hookWord: "Poisoned.", region: "🇬🇧" },
  ],
  horror: [
    { title: "The doll that moves when no one is watching", hookWord: "Alive.", region: "🇺🇸" },
    { title: "Why you should never answer a call at 3 AM", hookWord: "Dead.", region: "🇬🇧" },
    { title: "The forest where compasses stop working", hookWord: "Trapped.", region: "🌍" },
    { title: "A family photo with an extra person in it", hookWord: "Found.", region: "🇺🇸" },
    { title: "The tunnel that echoes voices from the past", hookWord: "Haunted.", region: "🇬🇧" },
    { title: "The game that drove 3 players insane", hookWord: "Cursed.", region: "🌍" },
    { title: "What lives at the bottom of this lake", hookWord: "Submerged.", region: "🇺🇸" },
  ],
  finance: [
    { title: "The $1 investment that became $4.8 million", hookWord: "Missed.", region: "🇺🇸" },
    { title: "Why saving money is making you poorer", hookWord: "Trapped.", region: "🇬🇧" },
    { title: "The side hustle nobody talks about", hookWord: "Hidden.", region: "🌍" },
    { title: "How a teenager made $100K from his bedroom", hookWord: "Found.", region: "🇺🇸" },
    { title: "The credit card trick banks don't want you to know", hookWord: "Exposed.", region: "🇬🇧" },
    { title: "Why your 9-to-5 is a financial trap", hookWord: "Poisoned.", region: "🌍" },
    { title: "The one stock Warren Buffett secretly bought", hookWord: "Hidden.", region: "🇺🇸" },
  ],
  fitness: [
    { title: "The exercise that ages you faster", hookWord: "Poisoned.", region: "🇺🇸" },
    { title: "Why stretching before gym is destroying your gains", hookWord: "Broken.", region: "🇬🇧" },
    { title: "The food that kills your metabolism at night", hookWord: "Dead.", region: "🌍" },
    { title: "What happens to your body after 30 days of cold showers", hookWord: "Transformed.", region: "🇺🇸" },
    { title: "The 2-minute routine that replaces 30 min of cardio", hookWord: "Replaced.", region: "🇬🇧" },
    { title: "Why protein shakes are lying to you", hookWord: "Fake.", region: "🌍" },
    { title: "The posture mistake that causes chronic pain", hookWord: "Trapped.", region: "🇺🇸" },
  ],
};

function getSessionKey(niche: string, audience: string) {
  return `viralengine-trending-${niche}-${audience}`;
}

function pickRandom(arr: TrendingSuggestion[], count: number): TrendingSuggestion[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

interface TrendingPanelProps {
  niche: string | null;
  audience: string;
  locale: Locale;
  onSelectTopic: (topic: string) => void;
  /** Render as inline sidebar content instead of floating/fixed */
  inline?: boolean;
}

export const TrendingPanel = memo(function TrendingPanel({ niche, audience, locale, onSelectTopic, inline }: TrendingPanelProps) {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(true);
  const effectiveNiche = niche || "mystery";

  const [suggestions, setSuggestions] = useState<TrendingSuggestion[]>(() => {
    const cached = sessionStorage.getItem(getSessionKey(effectiveNiche, audience));
    if (cached) {
      try { return JSON.parse(cached); } catch {}
    }
    const pool = TRENDING_DATA[effectiveNiche] || TRENDING_DATA.mystery;
    const picked = pickRandom(pool, 5);
    sessionStorage.setItem(getSessionKey(effectiveNiche, audience), JSON.stringify(picked));
    return picked;
  });

  useEffect(() => {
    const key = getSessionKey(effectiveNiche, audience);
    const cached = sessionStorage.getItem(key);
    if (cached) {
      try { setSuggestions(JSON.parse(cached)); return; } catch {}
    }
    const pool = TRENDING_DATA[effectiveNiche] || TRENDING_DATA.mystery;
    const picked = pickRandom(pool, 5);
    sessionStorage.setItem(key, JSON.stringify(picked));
    setSuggestions(picked);
  }, [effectiveNiche, audience]);

  const refresh = () => {
    const pool = TRENDING_DATA[effectiveNiche] || TRENDING_DATA.mystery;
    const picked = pickRandom(pool, 5);
    sessionStorage.setItem(getSessionKey(effectiveNiche, audience), JSON.stringify(picked));
    setSuggestions(picked);
  };

  if (!visible) return null;

  // Inline sidebar mode for desktop 2-column layout
  if (inline) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            💡 {locale === "tr" ? "Trend" : "Trending Now"}
          </h3>
          <button onClick={refresh} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>
        <div className="space-y-2">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSelectTopic(s.title)}
              className="w-full text-left bg-muted/30 hover:bg-muted/50 rounded-xl p-3 transition-colors border border-border/20 space-y-1"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]">{s.region}</span>
                <span className="text-[10px] font-bold text-primary">{s.hookWord}</span>
              </div>
              <p className="text-[11px] font-medium text-foreground leading-snug line-clamp-2">{s.title}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Mobile: bottom fixed bar
  if (isMobile) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-background/95 backdrop-blur-xl border-t border-border/50 p-3 space-y-2 max-h-[45vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            💡 {locale === "tr" ? "Şu An Trend" : "Trending Now"}
          </h3>
          <div className="flex gap-1.5">
            <button onClick={refresh} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setVisible(false)} className="p-1 rounded-lg hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSelectTopic(s.title)}
              className="flex-shrink-0 bg-muted/40 hover:bg-muted/60 rounded-xl p-3 text-left transition-colors border border-border/30 w-[200px]"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[10px]">{s.region}</span>
                <span className="text-[10px] font-bold text-primary">{s.hookWord}</span>
              </div>
              <p className="text-xs font-medium text-foreground leading-snug line-clamp-2">{s.title}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Desktop: hidden when inline mode is used elsewhere
  return null;
});
