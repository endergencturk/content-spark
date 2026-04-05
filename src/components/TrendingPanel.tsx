import React, { useState, useEffect, memo } from "react";
import { TrendingUp, RefreshCw, X } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { type Locale } from "@/lib/i18n";

interface TrendingSuggestion {
  title: string;
  hookWord: string;
  region: string;
}

/* ── Building blocks for procedural generation ── */
const HOOK_WORDS = [
  "Gone.", "Dead.", "Found.", "Vanished.", "Missing.", "Erased.", "Trapped.",
  "Cursed.", "Exposed.", "Buried.", "Deleted.", "Haunted.", "Stolen.", "Faked.",
  "Hidden.", "Replaced.", "Poisoned.", "Broken.", "Impossible.", "Alive.",
  "Submerged.", "Rewired.", "Transformed.", "Rejected.", "Silenced.",
];

const REGIONS = ["🇺🇸", "🇬🇧", "🌍", "🇩🇪", "🇯🇵", "🇧🇷", "🇫🇷"];

const TEMPLATES: Record<string, string[]> = {
  mystery: [
    "The {noun} found {location} after {number} years",
    "Why did {number} {people} vanish from {location}",
    "The {person} who checked in but never left",
    "A {noun} that appeared in {number} photos across {number} countries",
    "The {adjective} signal from an abandoned {place}",
    "No one can explain the {noun} inside the {place}",
    "{person} received a letter from {pronoun}self — dated {number} years ahead",
    "The {place} where every clock stopped at {time}",
    "A {noun} was found {location} with no explanation",
    "The last {noun} {person} ever sent was {adjective}",
    "Someone has been living inside their {place} for {number} months",
    "The {noun} that predicted {number} events before they happened",
    "Why this {place} has been sealed since {year}",
    "A {person} vanished mid-{action} — cameras caught everything",
  ],
  educational: [
    "Your {bodypart} {verb} while you sleep — here's why",
    "The {noun} that technically doesn't exist",
    "Why you can't {action} no matter how hard you try",
    "How {noun} physically changes your {bodypart}",
    "The {adjective} reason {noun} feels {adjective2}",
    "What happens to your {bodypart} after {number} days of {action}",
    "The {noun} trick scientists don't want mainstream",
    "Why {number}% of what you learned about {noun} is wrong",
    "Your {bodypart} does this {number} times a day — you never notice",
    "The {adjective} illusion your {bodypart} creates every {time}",
    "Why {noun} is secretly {adjective} for your {bodypart}",
    "The {number}-second test that reveals your {noun} level",
  ],
  motivation: [
    "{pronoun} failed {number} times before {noun} existed",
    "The {noun} that changed a {person}'s life forever",
    "Why the hardest {timeperiod} of your life matters most",
    "The {number}-second rule that kills {noun}",
    "A {adjective} {person} who {verb} the impossible",
    "Why your {noun} is slowly destroying your {noun2}",
    "The {noun} billionaires do at {time} every morning",
    "{person} went from {adjective} to {adjective2} in {number} months",
    "The one {noun} every successful {person} has in common",
    "Stop {action} — it's the reason you're not {adjective}",
    "The {adjective} truth nobody tells you about {noun}",
  ],
  horror: [
    "The {noun} that moves when no one is watching",
    "Why you should never {action} at {time}",
    "The {place} where {noun} stop working",
    "A {noun} with an extra {noun2} in it",
    "The {place} that echoes {noun} from the past",
    "The {noun} that drove {number} people insane",
    "What lives at the bottom of this {place}",
    "Every night at {time}, the same {noun} appears",
    "The {person} who filmed something in their {place} — and can't explain it",
    "This {noun} was sealed shut {number} years ago — something inside is {adjective}",
    "Don't read this {noun} after midnight — {number} people wish they hadn't",
    "The {place} that doesn't appear on any map",
  ],
  finance: [
    "The ${amount} {noun} that became ${amount2}",
    "Why {action} money is making you poorer",
    "The {noun} nobody talks about",
    "How a {person} made ${amount} from their {place}",
    "The {noun} trick {people} don't want you to know",
    "Why your {noun} is a financial trap",
    "The one {noun} {person} secretly {verb}",
    "{number} {people} tried this — only {number2} succeeded",
    "Stop {action} your money on {noun} — do this instead",
    "The {adjective} investment that returns {number}x every {timeperiod}",
  ],
  fitness: [
    "The {noun} that ages you faster",
    "Why {action} before {noun} is destroying your gains",
    "The {noun} that kills your {bodypart} at night",
    "What happens after {number} days of {action}",
    "The {number}-minute routine that replaces {number2} min of {noun}",
    "Why {noun} are lying to you",
    "The {noun} mistake that causes chronic {noun2}",
    "Stop eating {noun} — it's {adjective} than you think",
    "The {adjective} exercise most people do wrong",
    "Your {bodypart} changes after just {number} days of this",
  ],
};

const FILLS: Record<string, string[]> = {
  noun: ["signal", "package", "recording", "document", "photo", "message", "call", "video", "letter", "diary", "email", "file", "map", "key", "tape", "shadow", "blueprint", "ticket", "receipt", "device"],
  noun2: ["pain", "future", "routine", "ambition", "dream", "memory", "potential", "progress", "growth"],
  person: ["teacher", "pilot", "nurse", "janitor", "teenager", "stranger", "student", "surgeon", "cashier", "detective"],
  people: ["lighthouse keepers", "hikers", "scientists", "tourists", "researchers", "passengers", "witnesses", "volunteers"],
  place: ["basement", "attic", "forest", "tunnel", "hospital", "warehouse", "bunker", "cabin", "hotel room", "cave", "parking garage"],
  location: ["in a chimney", "under a bridge", "in a locked room", "behind a wall", "in the desert", "at the bottom of a lake", "inside a tree"],
  adjective: ["impossible", "silent", "forbidden", "strange", "untraceable", "classified", "worse", "terrifying", "shocking"],
  adjective2: ["unstoppable", "dangerous", "different", "remarkable", "wealthy", "unrecognizable"],
  bodypart: ["brain", "eyes", "spine", "hands", "lungs", "nervous system", "gut"],
  action: ["answer the phone", "look in the mirror", "saving", "stretching", "walking", "sleeping", "wasting", "eating"],
  verb: ["deletes memories", "rewires itself", "climbed", "built", "bought", "decoded", "escaped"],
  pronoun: ["He", "She", "They"],
  number: ["3", "5", "7", "12", "27", "30", "100", "1,009"],
  number2: ["1", "2", "3", "10", "30", "60"],
  time: ["3 AM", "4:44 AM", "midnight", "dawn", "2:22 AM"],
  timeperiod: ["year", "month", "week", "season", "chapter"],
  year: ["1973", "1989", "1998", "2004", "2011"],
  amount: ["1", "50", "100", "500"],
  amount2: ["4.8 million", "2.3 million", "100K", "1 million", "890K"],
};

function fillTemplate(template: string): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const options = FILLS[key];
    if (!options) return key;
    return options[Math.floor(Math.random() * options.length)];
  });
}

function generateItems(niche: string, count: number): TrendingSuggestion[] {
  const templates = TEMPLATES[niche] || TEMPLATES.mystery;
  const shuffled = [...templates].sort(() => Math.random() - 0.5);
  const hookPool = [...HOOK_WORDS].sort(() => Math.random() - 0.5);

  const items: TrendingSuggestion[] = [];
  for (let i = 0; i < count; i++) {
    const tpl = shuffled[i % shuffled.length];
    items.push({
      title: fillTemplate(tpl),
      hookWord: hookPool[i % hookPool.length],
      region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
    });
  }
  return items;
}

interface TrendingPanelProps {
  niche: string | null;
  audience: string;
  locale: Locale;
  onSelectTopic: (topic: string) => void;
  inline?: boolean;
}

export const TrendingPanel = memo(function TrendingPanel({ niche, audience, locale, onSelectTopic, inline }: TrendingPanelProps) {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(true);
  const effectiveNiche = niche || "mystery";

  const [suggestions, setSuggestions] = useState<TrendingSuggestion[]>(() =>
    generateItems(effectiveNiche, 5)
  );

  useEffect(() => {
    setSuggestions(generateItems(effectiveNiche, 5));
  }, [effectiveNiche, audience]);

  const refresh = () => {
    setSuggestions(generateItems(effectiveNiche, 5));
  };

  if (!visible) return null;

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
              key={`${s.title}-${i}`}
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
              key={`${s.title}-${i}`}
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

  return null;
});
