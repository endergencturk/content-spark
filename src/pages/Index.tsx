import React, { useState, useCallback, memo, useMemo, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Copy, Loader2, Sparkles, RefreshCw, Download,
  Image, Clock, Flame, Crown, Hash, Youtube, Mic,
  Lock, TrendingUp, Shuffle, Lightbulb, Zap, Instagram,
  Search, Dumbbell, DollarSign, Brain, Skull, BookOpen,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { useSettings, CHAR_TARGETS_BY_SPEED, useRouteThemeSync } from "@/contexts/SettingsContext";
import { t, type Locale } from "@/lib/i18n";
import { UpsellBanner } from "@/components/UpsellBanner";
import { useUsageLimit } from "@/hooks/useUsageLimit";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { getTopicSuggestions, getRandomTopic } from "@/lib/topicSuggestions";
import { GeneralResults, type GeneralResult } from "@/components/GeneralResults";
import { ChannelProfile, loadChannelProfile, type ChannelProfileData } from "@/components/ChannelProfile";
import { TrendingPanel } from "@/components/TrendingPanel";
import { WeeklyPlan } from "@/components/WeeklyPlan";
import { ABHookTester } from "@/components/ABHookTester";
import { BulkPackDialog } from "@/components/BulkPackDialog";

// Normalize API responses where fields may be objects {type, hook} instead of strings
function normalizeResult(data: any): any {
  const out = { ...data };
  const extractHook = (v: any) =>
    typeof v === "object" && v !== null && v.hook ? String(v.hook) : typeof v === "string" ? v : String(v);
  if (out.bestHook && typeof out.bestHook === "object") {
    out.bestHook = extractHook(out.bestHook);
  }
  if (Array.isArray(out.hookVariations)) {
    out.hookVariations = out.hookVariations.map(extractHook);
  }
  if (Array.isArray(out.angleVariations)) {
    out.angleVariations = out.angleVariations.map((a: any) =>
      typeof a === "object" && a !== null ? { type: a.type || "", hook: typeof a.hook === "string" ? a.hook : String(a.hook || "") } : { type: "", hook: String(a) }
    );
  }
  // Normalize imagePrompts: ensure every item is a plain string
  if (Array.isArray(out.imagePrompts)) {
    out.imagePrompts = out.imagePrompts.map((p: any) =>
      typeof p === 'object' && p !== null
        ? (p.prompt || p.description || p.text || JSON.stringify(p))
        : String(p)
    );
  }
  // Normalize thumbnail image fields
  if (Array.isArray(out.thumbnails)) {
    out.thumbnails = out.thumbnails.map((th: any) => ({
      ...th,
      image: typeof th.image === 'object' && th.image !== null
        ? (th.image.prompt || th.image.description || th.image.text || JSON.stringify(th.image))
        : String(th.image || ''),
      text: typeof th.text === 'object' && th.text !== null
        ? (th.text.text || th.text.label || JSON.stringify(th.text))
        : String(th.text || ''),
    }));
  }
  if (out.youtube?.tags && !Array.isArray(out.youtube.tags)) {
    out.youtube = { ...out.youtube, tags: String(out.youtube.tags).split(",").map((s: string) => s.trim()) };
  }
  if (out.tiktok?.hashtags && !Array.isArray(out.tiktok.hashtags)) {
    out.tiktok = { ...out.tiktok, hashtags: String(out.tiktok.hashtags).split(",").map((s: string) => s.trim()) };
  }
  // Fix editing plan scene numbering
  if (Array.isArray(out.editingPlan)) {
    out.editingPlan = out.editingPlan.map((scene: any, i: number) => ({
      ...scene,
      scene: scene.scene ?? i + 1,
      visual: String(scene.visual || '').replace(/^Scene\s*\d*[:\-–—]?\s*/i, ''),
    }));
  }
  return out;
}
import { ProResults, type ProResult } from "@/components/ProResults";
import { LoadingState } from "@/components/LoadingState";

// ── Constants ───────────────────────────────────────────────────────

const FREE_STYLES = [
  { value: "viral", label: "Viral" },
  { value: "educational", label: "Educational" },
  { value: "story", label: "Story" },
];

const PRO_STYLES = [
  { value: "high-retention", label: "High Retention" },
  { value: "emotional", label: "Emotional" },
  { value: "suspense", label: "Suspense / Mystery" },
  { value: "controversial", label: "Controversial" },
  { value: "curiosity", label: "Curiosity Driven" },
];

const FREE_CONTENT_TYPES = [
  { value: "story", label: "Story" },
  { value: "educational", label: "Educational" },
  { value: "entertainment", label: "Entertainment" },
];

const PRO_CONTENT_TYPES = [
  { value: "selling", label: "Selling" },
  { value: "personal-brand", label: "Personal Brand" },
  { value: "hooks-only", label: "Hooks Only" },
  { value: "script-only", label: "Script Only" },
];

const FREE_GOALS = [
  { value: "viral", label: "Go viral" },
  { value: "followers", label: "Get followers" },
];

const PRO_GOALS = [
  { value: "sell", label: "Sell product" },
  { value: "brand", label: "Build brand" },
  { value: "leads", label: "Lead generation" },
  { value: "storytelling", label: "Advanced storytelling" },
];

const PLATFORM_OPTIONS = [
  { value: "tiktok", label: "TikTok", icon: Hash },
  { value: "youtube-shorts", label: "Shorts", icon: Youtube },
  { value: "instagram-reels", label: "Reels", icon: Instagram },
];

const LENGTH_OPTIONS = ["15", "30", "60"];

const TARGET_AUDIENCE_OPTIONS = [
  { value: "global", labelKey: "audience.global" },
  { value: "usa", labelKey: "audience.usa" },
  { value: "europe", labelKey: "audience.europe" },
  { value: "latam", labelKey: "audience.latam" },
  { value: "turkey", labelKey: "audience.turkey" },
];

const HOOK_STYLE_OPTIONS = [
  { value: "aggressive", labelKey: "hookStyle.aggressive" },
  { value: "curiosity", labelKey: "hookStyle.curiosity" },
  { value: "emotional", labelKey: "hookStyle.emotional" },
  { value: "dark", labelKey: "hookStyle.dark" },
];

const POSTING_TIMES: Record<string, { primary: string; backup: string; reason: string; reasonTr: string }> = {
  usa: { primary: "21:00", backup: "00:30", reason: "Best overlap for USA peak scrolling hours.", reasonTr: "ABD'nin en yoğun sosyal medya saatlerine denk gelir." },
  europe: { primary: "19:00", backup: "21:00", reason: "Peak evening hours across European time zones.", reasonTr: "Avrupa saat dilimlerinde akşam zirve saatleri." },
  latam: { primary: "22:00", backup: "00:00", reason: "Latin America evening peak overlapping with USA.", reasonTr: "Latin Amerika akşam zirvesi, ABD ile örtüşür." },
  global: { primary: "21:00", backup: "23:00", reason: "Optimal overlap across major global audiences.", reasonTr: "Büyük küresel kitlelerde en iyi örtüşme." },
  turkey: { primary: "20:00", backup: "22:00", reason: "Turkey evening prime time for social media.", reasonTr: "Türkiye'de sosyal medya için akşam zirve saati." },
};

// ── Niche Presets ───────────────────────────────────────────────────

interface NichePreset {
  id: string;
  label: string;
  labelTr: string;
  icon: React.ElementType;
  style: string;
  topics: string[];
  topicsTr: string[];
}

const NICHE_PRESETS: NichePreset[] = [
  {
    id: "mystery",
    label: "Mystery / Crime",
    labelTr: "Gizem / Suç",
    icon: Search,
    style: "suspense",
    topics: [
      "Brian Shaffer vanished from a bar — no trace",
      "The Zodiac Killer's last unsolved cipher",
      "A plane disappeared with 239 people on board",
      "The boy who was found living someone else's life",
      "A serial killer who was never caught",
    ],
    topicsTr: [
      "Bir bardan kaybolan adam — iz yok",
      "Zodiac Katili'nin çözülmemiş son şifresi",
      "239 kişiyle birlikte kaybolan uçak",
      "Başka birinin hayatını yaşayan çocuk",
      "Hiç yakalanmayan seri katil",
    ],
  },
  {
    id: "educational",
    label: "Educational",
    labelTr: "Eğitim",
    icon: BookOpen,
    style: "educational",
    topics: [
      "Why you forget 90% of what you read",
      "How your phone rewires your brain",
      "The science behind why we procrastinate",
      "5 psychology tricks marketers use on you",
      "Why cold showers change your body",
    ],
    topicsTr: [
      "Okuduğunuzun %90'ını neden unutuyorsunuz",
      "Telefonunuz beyninizi nasıl yeniden programlıyor",
      "Neden erteliyoruz — bilimsel açıklama",
      "Pazarlamacıların kullandığı 5 psikoloji hilesi",
      "Soğuk duş vücudunuzu neden değiştirir",
    ],
  },
  {
    id: "motivation",
    label: "Motivation",
    labelTr: "Motivasyon",
    icon: Brain,
    style: "emotional",
    topics: [
      "Why the smartest people are usually the loneliest",
      "How a homeless man became a tech CEO",
      "The habit that changed everything for me",
      "Why most people quit right before success",
      "The mindset shift that made me unstoppable",
    ],
    topicsTr: [
      "En zeki insanlar neden genellikle en yalnız",
      "Evsiz bir adam nasıl teknoloji CEO'su oldu",
      "Hayatımı değiştiren tek alışkanlık",
      "Çoğu insan başarıya ulaşmadan neden vazgeçer",
      "Beni durdurulamaz yapan zihinsel değişim",
    ],
  },
  {
    id: "horror",
    label: "Horror",
    labelTr: "Korku",
    icon: Skull,
    style: "suspense",
    topics: [
      "The experiment that proved we live in a simulation",
      "Why NASA deleted this photo",
      "The island where no one is allowed to go",
      "What really happens when you die for 7 minutes",
      "The camera footage that was never explained",
    ],
    topicsTr: [
      "Simülasyonda yaşadığımızı kanıtlayan deney",
      "NASA bu fotoğrafı neden sildi",
      "Kimsenin giremediği ada",
      "7 dakika öldüğünüzde gerçekte ne oluyor",
      "Hiç açıklanamayan kamera görüntüsü",
    ],
  },
  {
    id: "finance",
    label: "Finance",
    labelTr: "Finans",
    icon: DollarSign,
    style: "viral",
    topics: [
      "The man who sold his house to buy Bitcoin in 2013",
      "Why 99% of people fail at online business",
      "The $0 marketing strategy that makes millions",
      "Passive income myths nobody talks about",
      "How a janitor secretly became a millionaire",
    ],
    topicsTr: [
      "2013'te evini satıp Bitcoin alan adam",
      "Online iş kuranların %99'u neden başarısız",
      "Milyonlar kazandıran sıfır bütçeli strateji",
      "Kimsenin konuşmadığı pasif gelir mitleri",
      "Gizlice milyoner olan temizlikçi",
    ],
  },
  {
    id: "fitness",
    label: "Fitness",
    labelTr: "Fitness",
    icon: Dumbbell,
    style: "educational",
    topics: [
      "What happens to your body when you stop eating sugar",
      "The real reason coffee makes you tired",
      "Why stretching before workouts is a myth",
      "The 5-minute routine that burns more fat than running",
      "Why your diet isn't working — the science",
    ],
    topicsTr: [
      "Şekeri bırakınca vücudunuza ne olur",
      "Kahvenin sizi yormasının gerçek nedeni",
      "Egzersiz öncesi esneme neden bir mit",
      "Koşmaktan daha çok yağ yakan 5 dakikalık rutin",
      "Diyetiniz neden işe yaramıyor — bilimsel",
    ],
  },
];

type Mode = "general" | "pro";

// ── Types ───────────────────────────────────────────────────────────

interface DiscoveryIdea {
  title: string;
  why: string;
  category?: string;
  region?: string;
}

interface DiscoveryResult {
  discoveryMode: true;
  ideas: DiscoveryIdea[];
}

interface DuplicateWarning {
  topic: string;
  date: string;
  id: string;
  output_json: any;
  plan_type: string;
  platforms: string[];
  style: string;
  content_type: string;
  duration: string;
  goal: string;
}

const DISCOVERY_CATEGORIES = ["All", "Mystery", "Horror", "True Crime", "Educational", "Finance", "Entertainment"];

// ── Micro components ────────────────────────────────────────────────

const Pill = memo(function Pill({
  selected, onClick, children, locked, icon,
}: { selected: boolean; onClick: () => void; children: React.ReactNode; locked?: boolean; icon?: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3.5 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-1.5 ${
        locked
          ? "bg-muted/30 text-muted-foreground/50 border border-dashed border-border/50 cursor-not-allowed"
          : selected
            ? "bg-primary text-primary-foreground shadow-sm"
            : "bg-muted/60 text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {children}
      {locked && <Lock className="h-3 w-3 ml-0.5" />}
    </button>
  );
});

// ── Usage limit banner ──────────────────────────────────────────────

const UsageBanner = memo(function UsageBanner({
  remaining, isAtLimit, nextRefillLabel, locale = "en",
}: { remaining: number; isAtLimit: boolean; nextRefillLabel: string; locale?: Locale }) {
  return (
    <div className={`rounded-2xl p-4 flex items-start gap-3 ${
      isAtLimit
        ? "bg-destructive/10 border border-destructive/20"
        : "bg-muted/60 border border-border/50"
    }`}>
      <div className={`shrink-0 h-8 w-8 rounded-xl flex items-center justify-center ${
        isAtLimit ? "bg-destructive/15" : "bg-primary/10"
      }`}>
        {isAtLimit
          ? <Lock className="h-4 w-4 text-destructive" />
          : <Zap className="h-4 w-4 text-primary" />
        }
      </div>
      <div className="flex-1 space-y-1.5">
        <p className="text-sm font-semibold text-foreground">
          {isAtLimit
            ? t("usage.noCredits", locale)
            : t("usage.remaining", locale).replace("{count}", String(remaining)).replace("{s}", remaining === 1 ? "" : "s")}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isAtLimit
            ? t("usage.upgradeMsg", locale)
            : nextRefillLabel
              ? t("usage.nextRefill", locale).replace("{time}", nextRefillLabel)
              : t("usage.refillInfo", locale)}
        </p>
        {isAtLimit && (
          <p className="text-xs text-muted-foreground mt-1">
            {t("usage.switchPro", locale)}
          </p>
        )}
      </div>
    </div>
  );
});

// ── Main page ───────────────────────────────────────────────────────

export default function Index() {
  useRouteThemeSync();
  const isMobile = useIsMobile();
  const { settings } = useSettings();
  const locale = settings.language;
  const { remaining, isAtLimit, increment, nextRefillLabel } = useUsageLimit();

  const [deviceId] = useState<string>(() => {
    const key = "viralengine-device-id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(key, id);
    }
    return id;
  });

  const [mode, setMode] = useState<Mode>("general");
  const [topic, setTopic] = useState("");
  const [style, setStyle] = useState("viral");
  const [platform, setPlatform] = useState(settings.defaultPlatform);
  const [platforms, setPlatforms] = useState<string[]>(["tiktok"]);
  const [contentType, setContentType] = useState("story");
  const [scriptLength, setScriptLength] = useState(settings.defaultScriptLength);
  const [goal, setGoal] = useState("viral");
  const [hookIntensity, setHookIntensity] = useState(0); // 0 = Low, 1 = High
  const [imagePromptCount, setImagePromptCount] = useState(3);
  const [customDescription, setCustomDescription] = useState("");
  const [targetAudience, setTargetAudience] = useState("global");
  const [hookStyle, setHookStyle] = useState("aggressive");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const [generalResult, setGeneralResult] = useState<GeneralResult | null>(null);
  const [proResult, setProResult] = useState<ProResult | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [presetTopics, setPresetTopics] = useState<string[]>([]);
  const [autoFixImproved, setAutoFixImproved] = useState(false);
  const [autoFixScoreDiff, setAutoFixScoreDiff] = useState(0);
  const [originalGeneralResult, setOriginalGeneralResult] = useState<GeneralResult | null>(null);
  const [originalProResult, setOriginalProResult] = useState<ProResult | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [autoFixUsed, setAutoFixUsed] = useState(false);
  const isProMode = mode === "pro";
  const suggestCount = isProMode ? 6 : 3;
  const [suggestions, setSuggestions] = useState(() => getTopicSuggestions(suggestCount, contentType, style));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [profileForceOpen, setProfileForceOpen] = useState(false);

  useEffect(() => {
    setSuggestions(getTopicSuggestions(isProMode ? 6 : 3, contentType, style));
  }, [isProMode, contentType, style]);

  // Apply channel profile defaults on first load
  useEffect(() => {
    const profile = loadChannelProfile();
    if (profile) {
      if (profile.audience) setTargetAudience(profile.audience);
      if (profile.niche) {
        const presetMatch = NICHE_PRESETS.find(p => p.id === profile.niche);
        if (presetMatch) handlePresetClick(presetMatch);
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [discoveryFilter, setDiscoveryFilter] = useState("All");
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning | null>(null);

  const handlePresetClick = useCallback((preset: NichePreset) => {
    setSelectedPreset(preset.id);
    setStyle(preset.style);
    // Set content type based on preset
    if (preset.id === "educational" || preset.id === "fitness") {
      setContentType("educational");
    } else if (preset.id === "mystery" || preset.id === "horror") {
      setContentType("story");
    } else if (preset.id === "motivation") {
      setContentType("story");
    } else if (preset.id === "finance") {
      setContentType("entertainment");
    }
    setPresetTopics(locale === "tr" ? preset.topicsTr : preset.topics);
  }, [locale]);

  const togglePlatform = useCallback((value: string) => {
    setPlatforms((prev) =>
      prev.includes(value)
        ? prev.length > 1 ? prev.filter((p) => p !== value) : prev
        : [...prev, value]
    );
  }, []);

  // Auto-set hook style default based on platform
  useEffect(() => {
    if (platforms.includes("youtube-shorts") && !platforms.includes("tiktok")) {
      setHookStyle("curiosity");
    } else {
      setHookStyle("aggressive");
    }
  }, [platforms]);

  useEffect(() => {
    if (platform === "youtube-shorts") {
      setHookStyle("curiosity");
    } else {
      setHookStyle("aggressive");
    }
  }, [platform]);

  const copyToClipboard = useCallback(async (key: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success(t("toast.copied", locale));
    setTimeout(() => setCopied(""), 1200);
  }, [locale]);

  const discoverIdeas = useCallback(async () => {
    setLoading(true);
    setDiscoveryResult(null);
    try {
      const body = {
        mode: isProMode ? "pro" : "general",
        topic: "",
        platform,
        platforms: isProMode ? platforms : [platform],
        contentType,
        style,
        niche: selectedPreset || undefined,
        language: locale,
      };
      const { data, error } = await supabase.functions.invoke("generate-content", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDiscoveryResult(data as DiscoveryResult);
      setGeneralResult(null);
      setProResult(null);
    } catch (error: any) {
      console.error("Discovery failed:", error);
      const msg = error?.message || "";
      if (/temporarily busy|try again/i.test(msg)) {
        toast.error(t("toast.error.busy", locale));
      } else {
        toast.error(msg || t("toast.error.generic", locale));
      }
    } finally {
      setLoading(false);
    }
  }, [isProMode, platform, platforms, contentType, style, selectedPreset, locale]);

  const checkDuplicate = useCallback(async (): Promise<DuplicateWarning | null> => {
    try {
      const { data } = await supabase
        .from("generations")
        .select("id, topic, created_at, output_json, plan_type, platforms, style, content_type, duration, goal")
        .eq("device_id", deviceId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!data || data.length === 0) return null;
      const needle = topic.trim().toLowerCase();
      const match = data.find((item: any) => {
        const prev = (item.topic || "").toLowerCase();
        // Check if topics are similar (contains or Levenshtein-like)
        return prev === needle || prev.includes(needle) || needle.includes(prev);
      });
      if (match) {
        return {
          topic: match.topic,
          date: new Date(match.created_at).toLocaleDateString(),
          id: match.id,
          output_json: match.output_json,
          plan_type: match.plan_type,
          platforms: match.platforms,
          style: match.style,
          content_type: match.content_type,
          duration: match.duration,
          goal: match.goal,
        };
      }
      return null;
    } catch {
      return null;
    }
  }, [deviceId, topic]);

  const generateContent = useCallback(async (skipDuplicateCheck = false) => {
    if (!topic.trim()) return;
    if (!isProMode && isAtLimit) {
      toast.error(t("usage.noCredits", locale));
      return;
    }

    // Duplicate check
    if (!skipDuplicateCheck) {
      const dup = await checkDuplicate();
      if (dup) {
        setDuplicateWarning(dup);
        return;
      }
    }
    setDuplicateWarning(null);

    setLoading(true);
    setDiscoveryResult(null);
    setAutoFixUsed(false);
    setAutoFixImproved(false);
    setAutoFixScoreDiff(0);
    setOriginalGeneralResult(null);
    setOriginalProResult(null);
    setShowOriginal(false);
    try {
      const body = isProMode
        ? {
            mode: "pro", topic, platforms, contentType, style, scriptLength, goal, hookIntensity,
            imageFormat: "9:16", imagePromptCount,
            customDescription: customDescription.trim() || undefined,
            language: locale,
            targetAudience,
            hookStyle,
          }
        : {
            mode: "general", topic, platform, contentType, style, scriptLength, goal, hookIntensity,
            imageFormat: "9:16", outputStyle: settings.outputStyle,
            language: locale,
            targetAudience,
            hookStyle,
          };

      // Character count target ranges based on voice speed
      const CHAR_TARGETS = CHAR_TARGETS_BY_SPEED[settings.voiceSpeed] || CHAR_TARGETS_BY_SPEED["0.9"];

      let { data, error } = await supabase.functions.invoke("generate-content", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Script length verification & retry
      const target = CHAR_TARGETS[scriptLength] || CHAR_TARGETS["30"];
      const scriptLen = (data?.script || "").length;
      if (scriptLen < target.min) {
        toast.info("Expanding script...", { duration: 3000 });
        const retryBody = {
          ...body,
          customDescription: `${(body as any).customDescription || ""}\n\nPrevious script was ${scriptLen} chars, too short. Write at least ${target.min} characters. Expand every section with more detail and tension lines.`.trim(),
        };
        const retry = await supabase.functions.invoke("generate-content", { body: retryBody });
        if (!retry.error && retry.data && !retry.data.error) {
          data = retry.data;
        }
      }

      // Add warning badges if still out of range
      const finalLen = (data?.script || "").length;
      if (finalLen < target.min) {
        toast.warning("⚠️ Script shorter than target — consider expanding", { duration: 5000 });
      } else if (finalLen > target.max) {
        toast.warning("⚠️ Script longer than target — consider trimming", { duration: 5000 });
      }

      if (isProMode) {
        setProResult(normalizeResult(data) as ProResult);
        setGeneralResult(null);
      } else {
        setGeneralResult(normalizeResult(data) as GeneralResult);
        setProResult(null);
        increment();
      }

      try {
        await supabase.from("generations").insert({
          device_id: deviceId,
          topic: topic.trim(),
          platforms: isProMode ? platforms : [platform],
          duration: scriptLength,
          style,
          content_type: contentType,
          goal,
          plan_type: isProMode ? "pro" : "free",
          output_json: data,
          language: locale,
        } as any);
        toast.success(t("history.saved", locale), { duration: 2000 });
      } catch (saveErr) {
        console.warn("Failed to save to history:", saveErr);
      }
    } catch (error: any) {
      console.error("Generation failed:", error);
      const msg = error?.message || "";
      if (/temporarily busy|try again/i.test(msg)) {
        toast.error(t("toast.error.busy", locale));
      } else {
        toast.error(msg || t("toast.error.generic", locale));
      }
    } finally {
      setLoading(false);
    }
  }, [isProMode, topic, platform, platforms, contentType, style, scriptLength, goal, hookIntensity, imagePromptCount, customDescription, settings.outputStyle, isAtLimit, increment, locale, deviceId, targetAudience, hookStyle, checkDuplicate]);

  const handleHistoryReopen = useCallback((item: any) => {
    setTopic(item.topic);
    if (item.plan_type === "pro") {
      setMode("pro");
      setPlatforms(item.platforms || ["tiktok"]);
      setProResult(normalizeResult(item.output_json) as ProResult);
      setGeneralResult(null);
    } else {
      setMode("general");
      setPlatform(item.platforms?.[0] || "tiktok");
      setGeneralResult(normalizeResult(item.output_json) as GeneralResult);
      setProResult(null);
    }
    setStyle(item.style || "viral");
    setContentType(item.content_type || "story");
    setScriptLength(item.duration || "30");
    setGoal(item.goal || "viral");
  }, []);

  const handleHistoryRegenerate = useCallback((item: any) => {
    setTopic(item.topic);
    if (item.plan_type === "pro") {
      setMode("pro");
      setPlatforms(item.platforms || ["tiktok"]);
    } else {
      setMode("general");
      setPlatform(item.platforms?.[0] || "tiktok");
    }
    setStyle(item.style || "viral");
    setContentType(item.content_type || "story");
    setScriptLength(item.duration || "30");
    setGoal(item.goal || "viral");
    setProResult(null);
    setGeneralResult(null);
    setTimeout(() => {
      document.getElementById("generate-btn")?.click();
    }, 100);
  }, []);

  const hasResults = isProMode ? proResult !== null : generalResult !== null;

  const buildFullPackText = useCallback((result: GeneralResult | ProResult, isPro: boolean): string => {
    const formatHook = (h: any, i: number) => {
      if (typeof h === "object" && h !== null && h.type) return `Hook ${i + 1} [${h.type}]: ${h.hook}`;
      return `Hook ${i + 1}: ${h}`;
    };

    const hooks = isPro
      ? (result as ProResult).hooks || []
      : (result as GeneralResult).hooks;

    const postingTimes: Record<string, { primary: string; backup: string; reason: string }> = {
      usa: { primary: "21:00", backup: "00:30", reason: "Best overlap for USA peak scrolling hours." },
      europe: { primary: "19:00", backup: "21:00", reason: "Peak evening hours across European time zones." },
      latam: { primary: "22:00", backup: "00:00", reason: "Latin America evening peak overlapping with USA." },
      global: { primary: "21:00", backup: "23:00", reason: "Optimal overlap across major global audiences." },
      turkey: { primary: "20:00", backup: "22:00", reason: "Turkey evening prime time for social media." },
    };
    const pt = postingTimes[targetAudience] || postingTimes.global;

    const sections = [
      `⭐ BEST HOOK:\n${result.bestHook}`,
      `🎯 ALL HOOKS:\n${hooks.map((h: any, i: number) => formatHook(h, i)).join("\n")}`,
      `📝 SCRIPT:\n${result.script}`,
      result.editingPlan?.length ? `🎬 EDITING PLAN:\n${result.editingPlan.map((s: any) => `Scene ${s.scene}: ${s.visual}${s.onScreenText ? ` | Text: ${s.onScreenText}` : ""}${s.mood ? ` | Mood: ${s.mood}` : ""}`).join("\n")}` : "",
      `🖼️ IMAGE PROMPTS:\n${result.imagePrompts.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")}`,
      result.thumbnails?.length ? `📸 THUMBNAIL IDEAS:\n${result.thumbnails.map((th: any, i: number) => `Thumbnail ${i + 1}:\nImage: ${th.image}\nText: ${th.text}`).join("\n\n")}` : "",
      `📺 YOUTUBE:\nTitle: ${result.youtube.title}\nDescription: ${result.youtube.description}\nTags: ${(Array.isArray(result.youtube.tags) ? result.youtube.tags : String(result.youtube.tags).split(",").map((s: string) => s.trim())).join(", ")}`,
      `📱 TIKTOK:\nCaption: ${result.tiktok.caption}\nHashtags: ${(Array.isArray(result.tiktok.hashtags) ? result.tiktok.hashtags : String(result.tiktok.hashtags).split(",").map((s: string) => s.trim())).join(" ")}`,
      isPro && (result as ProResult).instagramCaption ? `📷 INSTAGRAM:\n${(result as ProResult).instagramCaption}` : "",
      result.music?.length ? `🎵 MUSIC SUGGESTIONS:\n${result.music.map((m: any) => typeof m === "string" ? m : `${m.type} — ${m.source} (${m.why})`).join("\n")}` : "",
      `⏰ BEST POSTING TIME:\nPrimary: ${pt.primary}\nBackup: ${pt.backup}\nReason: ${pt.reason}`,
      result.angleVariations?.length ? `🔄 ANGLE VARIATIONS:\n${result.angleVariations.map((a: any) => `[${a.type}] ${a.hook}`).join("\n")}` : "",
      (result as any).hookVariations?.length ? `🎯 HOOK VARIATIONS (V1-V${(result as any).hookVariations.length}):\n${(result as any).hookVariations.map((v: string, i: number) => `V${i + 1}: ${v}`).join("\n")}` : "",
      isPro && (result as ProResult).voiceStyle ? `🎙️ VOICE STYLE: ${(result as ProResult).voiceStyle}` : "",
      result.seriesPotential ? `📈 SERIES POTENTIAL: ${result.seriesPotential}` : "",
      result.viralAnalysis ? `📊 VIRAL SCORE: ${result.viralAnalysis.score}/10\n${(result.viralAnalysis.strengths || []).map((r: string) => `✓ ${r}`).join("\n")}\n${(result.viralAnalysis.weaknesses || []).map((r: string) => `△ ${r}`).join("\n")}` : "",
    ];

    return sections.filter(Boolean).join("\n\n");
  }, [targetAudience]);

  const copyAll = useCallback(() => {
    const result = isProMode ? proResult : generalResult;
    if (!result) return;
    const all = buildFullPackText(result, isProMode);
    copyToClipboard("all", all);
  }, [isProMode, generalResult, proResult, copyToClipboard, buildFullPackText]);

  const downloadTxt = useCallback(() => {
    const result = isProMode ? proResult : generalResult;
    if (!result) return;
    const all = buildFullPackText(result, isProMode);
    const slug = topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "content";

    const now = new Date();
    const dateStr = now.toISOString().replace("T", " ").slice(0, 19);
    const platformLabels = (isProMode ? platforms : [platform]).map((p: string) => {
      if (p === "tiktok") return "TikTok";
      if (p === "youtube-shorts") return "YouTube Shorts";
      if (p === "instagram-reels") return "Instagram Reels";
      return p;
    }).join(", ");
    const viralScore = result.viralAnalysis?.score || "N/A";

    const metadata = `=== CONTENT PACK INFO ===
Topic: ${topic.trim()}
Platform: ${platformLabels}
Target Audience: ${targetAudience}
Hook Style: ${hookStyle}
Duration: ${scriptLength}s
Voice Speed: ${settings.voiceSpeed}
Style: ${style}
Content Type: ${contentType}
Goal: ${goal}
Auto-Fix Used: ${autoFixUsed ? "Yes" : "No"}
Generated: ${dateStr}
Viral Score: ${viralScore}/10
=========================

`;

    const blob = new Blob([metadata + all], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-content-pack.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("toast.downloaded", locale));
  }, [isProMode, generalResult, proResult, topic, buildFullPackText, locale, platforms, platform, targetAudience, hookStyle, scriptLength, style, contentType, goal, autoFixUsed]);

  const autoFix = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setAutoFixImproved(false);
    setAutoFixScoreDiff(0);
    try {
      const prevResult = isProMode ? proResult : generalResult;
      const prevScore = prevResult?.viralAnalysis?.score || 0;

      // Save original before overwriting
      if (!autoFixUsed) {
        if (isProMode && proResult) setOriginalProResult({ ...proResult });
        if (!isProMode && generalResult) setOriginalGeneralResult({ ...generalResult });
      }

      const body = isProMode
        ? {
            mode: "pro", topic, platforms, contentType, style, scriptLength, goal,
            hookIntensity: 2, imageFormat: "9:16", imagePromptCount,
            customDescription: customDescription.trim() || undefined,
            language: locale, targetAudience, hookStyle: "aggressive",
            autoFixForced: true,
          }
        : {
            mode: "general", topic, platform, contentType, style, scriptLength, goal,
            hookIntensity: 2, imageFormat: "9:16", outputStyle: settings.outputStyle,
            language: locale, targetAudience, hookStyle: "aggressive",
            autoFixForced: true,
          };

      const { data, error } = await supabase.functions.invoke("generate-content", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const newScore = data?.viralAnalysis?.score || 0;

      if (isProMode) {
        setProResult(normalizeResult(data) as ProResult);
        setGeneralResult(null);
      } else {
        setGeneralResult(normalizeResult(data) as GeneralResult);
        setProResult(null);
      }

      setAutoFixUsed(true);
      setShowOriginal(false);

      if (newScore > prevScore) {
        setAutoFixImproved(true);
        setAutoFixScoreDiff(Math.round((newScore - prevScore) * 10) / 10);
      }

      toast.success(t("toast.autoFixDone", locale));
    } catch (error: any) {
      console.error("Auto-fix failed:", error);
      toast.error(error?.message || t("toast.error.generic", locale));
    } finally {
      setLoading(false);
    }
  }, [isProMode, topic, platform, platforms, contentType, style, scriptLength, goal, imagePromptCount, customDescription, settings.outputStyle, locale, targetAudience, hookStyle, proResult, generalResult, autoFixUsed]);

  const handleProfileSave = useCallback((profile: ChannelProfileData) => {
    if (profile.audience) setTargetAudience(profile.audience);
    if (profile.niche) {
      const presetMatch = NICHE_PRESETS.find(p => p.id === profile.niche);
      if (presetMatch) handlePresetClick(presetMatch);
    }
  }, [handlePresetClick]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar onEditProfile={() => setProfileForceOpen(true)} />

      {/* Trending Panel */}
      <TrendingPanel
        niche={selectedPreset}
        audience={targetAudience}
        locale={locale}
        onSelectTopic={(t) => setTopic(t)}
      />

      <div className="py-8 px-4">
        <div className="mx-auto max-w-lg space-y-7">

          {/* HEADER */}
          <div className="text-center space-y-2 pt-2">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {t("app.title", locale)}
              </h1>
              <HistoryDrawer
                deviceId={deviceId}
                isPro={isProMode}
                locale={locale}
                onReuse={(t) => setTopic(t)}
                onReopen={handleHistoryReopen}
                onRegenerate={handleHistoryRegenerate}
              />
            </div>
            <p className="text-muted-foreground text-sm">
              {t("app.subtitle", locale)}
            </p>
          </div>

          {/* MODE TOGGLE */}
          <div className="flex gap-2 p-1 rounded-2xl bg-muted/60">
            <button
              onClick={() => setMode("general")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                !isProMode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Zap className="h-4 w-4" />{t("mode.free", locale)}
            </button>
            <button
              onClick={() => setMode("pro")}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                isProMode ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
              }`}
            >
              <Crown className="h-4 w-4" />{t("mode.pro", locale)}
            </button>
          </div>

          {/* Channel Profile Onboarding */}
          <ChannelProfile locale={locale} onSave={handleProfileSave} forceOpen={profileForceOpen} />

          {/* Weekly Content Plan */}
          <WeeklyPlan isPro={isProMode} locale={locale} onSelectTopic={(t) => { setTopic(t); setDiscoveryResult(null); }} />

          {/* USAGE BANNER (Free mode only) */}
          {!isProMode && (
            <UsageBanner remaining={remaining} isAtLimit={isAtLimit} nextRefillLabel={nextRefillLabel} locale={locale} />
          )}

          {/* INPUT AREA */}
          <div className="space-y-5">

            {/* 1. Platform */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.platform", locale)}</p>
              <div className="flex gap-2">
                {PLATFORM_OPTIONS.map((o) => {
                  const sel = isProMode ? platforms.includes(o.value) : platform === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => isProMode ? togglePlatform(o.value) : setPlatform(o.value)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all ${
                        sel
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <o.icon className="h-4 w-4" />
                      {o.label.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
              {isProMode && <p className="text-[10px] text-muted-foreground text-center">{t("selector.platform.multi", locale)}</p>}
            </div>

            {/* 2. Target Audience */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.targetAudience", locale)}</p>
              <div className="flex gap-2 flex-wrap">
                {TARGET_AUDIENCE_OPTIONS.map((o) => (
                  <Pill
                    key={o.value}
                    selected={targetAudience === o.value}
                    onClick={() => setTargetAudience(o.value)}
                  >
                    {t(o.labelKey, locale)}
                  </Pill>
                ))}
              </div>
            </div>

            {/* 3. Hook Style */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.hookStyle", locale)}</p>
              <div className="flex gap-2 flex-wrap">
                {HOOK_STYLE_OPTIONS.map((o) => (
                  <Pill
                    key={o.value}
                    selected={hookStyle === o.value}
                    onClick={() => setHookStyle(o.value)}
                  >
                    {t(o.labelKey, locale)}
                  </Pill>
                ))}
              </div>
            </div>

            {/* 4. Niche Presets */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                {t("preset.title", locale)}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {NICHE_PRESETS.map((preset) => {
                  const isSelected = selectedPreset === preset.id;
                  const PresetIcon = preset.icon;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetClick(preset)}
                      className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      }`}
                    >
                      <PresetIcon className="h-4 w-4" />
                      {locale === "tr" ? preset.labelTr : preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Preset topic chips */}
              {presetTopics.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {presetTopics.map((topicText, i) => (
                    <button
                      key={i}
                      onClick={() => setTopic(topicText)}
                      className="text-[11px] px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors truncate max-w-[220px]"
                    >
                      {topicText}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Topic */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("input.topic", locale)}</p>

              {/* Topic Suggestions (hidden when preset topics are showing) */}
              {presetTopics.length === 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/70 flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" />{t("topics.suggestions", locale)}
                    </p>
                    <button
                      onClick={() => {
                        const random = getRandomTopic(contentType, style);
                        setTopic(random);
                      }}
                      className="text-[10px] font-medium text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                    >
                      <Shuffle className="h-3 w-3" />{t("topics.surprise", locale)}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onClick={() => setTopic(s.topic)}
                        className="text-[11px] px-2.5 py-1.5 rounded-xl bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors truncate max-w-[200px]"
                      >
                        {s.topic}
                      </button>
                    ))}
                  </div>
                  {!isProMode && (
                    <p className="text-[10px] text-muted-foreground/50">{t("topics.more", locale)}</p>
                  )}
                </div>
              )}

              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={locale === "tr" ? "ör. Brian Shaffer gizemi, pasif gelir mitleri..." : "e.g. Brian Shaffer mystery, passive income myths..."}
                className="h-12 rounded-2xl text-base border-border/60 bg-muted/30 px-4"
                onKeyDown={(e) => e.key === "Enter" && generateContent()}
              />


            </div>

            {/* 4. Length */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.length", locale)}</p>
              <div className="flex gap-2">
                {LENGTH_OPTIONS.map((len) => {
                  const isLocked = !isProMode && len === "60";
                  return (
                    <Pill
                      key={len}
                      selected={scriptLength === len}
                      locked={isLocked}
                      onClick={() => {
                        if (!isLocked) setScriptLength(len);
                      }}
                    >
                      {len}s
                    </Pill>
                  );
                })}
              </div>
            </div>

            {/* ⚙️ Advanced Settings (collapsible) */}
            <div className="rounded-2xl border border-border/40 overflow-hidden">
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-foreground hover:bg-muted/30 transition-colors"
              >
                <span>⚙️ {locale === "tr" ? "Gelişmiş Ayarlar" : "Advanced Settings"}</span>
                {advancedOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
              </button>

              {advancedOpen && (
                <div className="px-4 pb-4 space-y-5">
                  {/* Style */}
                  {(isProMode || !selectedPreset) && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.style", locale)}</p>
                      <div className="flex gap-2 flex-wrap">
                        {FREE_STYLES.map((s) => (
                          <Pill key={s.value} selected={style === s.value} onClick={() => setStyle(s.value)}>
                            {s.label}
                          </Pill>
                        ))}
                        {PRO_STYLES.map((s) => (
                          <Pill
                            key={s.value}
                            selected={style === s.value}
                            locked={!isProMode}
                            onClick={() => { if (isProMode) setStyle(s.value); }}
                          >
                            {s.label}
                          </Pill>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Content Type */}
                  {(isProMode || !selectedPreset) && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.content", locale)}</p>
                      <div className="flex gap-2 flex-wrap">
                        {FREE_CONTENT_TYPES.map((ct) => (
                          <Pill key={ct.value} selected={contentType === ct.value} onClick={() => setContentType(ct.value)}>
                            {ct.label}
                          </Pill>
                        ))}
                        {PRO_CONTENT_TYPES.map((ct) => (
                          <Pill
                            key={ct.value}
                            selected={contentType === ct.value}
                            locked={!isProMode}
                            onClick={() => { if (isProMode) setContentType(ct.value); }}
                          >
                            {ct.label}
                          </Pill>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Goal */}
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.goal", locale)}</p>
                    <div className="flex gap-2 flex-wrap">
                      {FREE_GOALS.map((g) => (
                        <Pill key={g.value} selected={goal === g.value} onClick={() => setGoal(g.value)}>
                          {g.label}
                        </Pill>
                      ))}
                      {PRO_GOALS.map((g) => (
                        <Pill
                          key={g.value}
                          selected={goal === g.value}
                          locked={!isProMode}
                          onClick={() => { if (isProMode) setGoal(g.value); }}
                        >
                          {g.label}
                        </Pill>
                      ))}
                    </div>
                  </div>

                  {/* Hook Intensity */}
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1">
                      <Flame className="h-3 w-3" />{t("selector.hookIntensity", locale)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setHookIntensity(0)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                          hookIntensity === 0
                            ? "bg-primary/10 text-primary border border-primary/30"
                            : "bg-muted/60 text-muted-foreground border border-transparent"
                        }`}
                      >
                        {t("hook.low", locale)}
                      </button>
                      <button
                        onClick={() => setHookIntensity(2)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                          hookIntensity === 2
                            ? "bg-primary/10 text-primary border border-primary/30"
                            : "bg-muted/60 text-muted-foreground border border-transparent"
                        }`}
                      >
                        {t("hook.high", locale)}
                      </button>
                    </div>
                  </div>

                  {/* Image Prompts */}
                  <div className="space-y-2">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground flex items-center gap-1">
                      <Image className="h-3 w-3" />{t("selector.imagePrompts", locale)}
                      {!isProMode && <span className="text-muted-foreground/60 ml-1">{t("selector.imagePrompts.fixed", locale)}</span>}
                    </p>
                    {isProMode ? (
                      <div className="space-y-1.5">
                        <Slider
                          value={[imagePromptCount]}
                          onValueChange={(v) => setImagePromptCount(v[0])}
                          min={1}
                          max={10}
                          step={1}
                          className="w-full"
                        />
                        <p className="text-xs text-muted-foreground text-center">{imagePromptCount} prompt{imagePromptCount !== 1 ? "s" : ""}</p>
                      </div>
                    ) : (
                      <div className="w-full py-2 rounded-xl bg-muted/30 border border-border/50 text-xs text-muted-foreground/60 flex items-center justify-center gap-1.5">
                        <Lock className="h-3 w-3" />
                        {t("selector.imagePrompts.slider", locale)}
                      </div>
                    )}
                  </div>

                  {/* Custom description (Pro mode only) */}
                  {isProMode && (
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                        {t("selector.customDesc", locale)} <span className="text-muted-foreground/60">{t("selector.customDesc.optional", locale)}</span>
                      </p>
                      <textarea
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder={t("selector.customDesc.placeholder", locale)}
                        rows={3}
                        className="w-full rounded-2xl border border-border/60 bg-muted/30 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Generate + Bulk Pack buttons */}
            <div className="flex gap-2">
              <Button
                id="generate-btn"
                className="h-13 text-base rounded-2xl font-bold flex-1"
                disabled={!topic.trim() || loading || (!isProMode && isAtLimit)}
                onClick={() => generateContent()}
              >
                {loading && topic.trim() ? (
                  <><Loader2 className="h-5 w-5 animate-spin" />{t("btn.generating", locale)}</>
                ) : !isProMode && isAtLimit ? (
                  <><Lock className="h-5 w-5" />{t("btn.noCredits", locale)}</>
                ) : (
                  <><Sparkles className="h-5 w-5" />{isProMode ? t("btn.generatePro", locale) : t("btn.generate", locale)}</>
                )}
              </Button>
              <BulkPackDialog
                isPro={isProMode}
                locale={locale}
                style={style}
                contentType={contentType}
                scriptLength={scriptLength}
                goal={goal}
                hookStyle={hookStyle}
                targetAudience={targetAudience}
                platform={platform}
                platforms={platforms}
                isProMode={isProMode}
              />
            </div>

            {!isProMode && !isAtLimit && (
              <p className="text-center text-[11px] text-muted-foreground">
                {t("usage.remaining", locale).replace("{count}", String(remaining)).replace("{s}", remaining === 1 ? "" : "s")}
                {nextRefillLabel ? ` · ${t("usage.nextRefill", locale).replace("{time}", nextRefillLabel)}` : ""}
              </p>
            )}
          </div>

          {/* Duplicate Warning Banner */}
          {duplicateWarning && (
            <div className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">
                ⚠️ You generated content about this topic before.
              </p>
              <p className="text-xs text-muted-foreground">
                {duplicateWarning.date} — "{duplicateWarning.topic}"
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setDuplicateWarning(null);
                    generateContent(true);
                  }}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
                >
                  Yes, Continue
                </button>
                <button
                  onClick={() => {
                    setDuplicateWarning(null);
                    handleHistoryReopen({
                      id: duplicateWarning.id,
                      topic: duplicateWarning.topic,
                      output_json: duplicateWarning.output_json,
                      plan_type: duplicateWarning.plan_type,
                      platforms: duplicateWarning.platforms,
                      style: duplicateWarning.style,
                      content_type: duplicateWarning.content_type,
                      duration: duplicateWarning.duration,
                      goal: duplicateWarning.goal,
                      language: locale,
                      created_at: "",
                      is_favorite: false,
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-muted text-foreground text-xs font-semibold border border-border/50"
                >
                  View Previous
                </button>
              </div>
            </div>
          )}

          {hasResults && !loading && (
            <div className="space-y-3">
              <div className="flex gap-2">
                <button
                  onClick={copyAll}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-primary/10 border border-primary/20 text-primary text-sm font-semibold hover:bg-primary/15 transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  {copied === "all" ? t("btn.copied", locale) : t("btn.copyFullPack", locale)}
                </button>
                <button
                  onClick={downloadTxt}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-muted/60 border border-border/50 text-foreground text-sm font-semibold hover:bg-muted transition-colors"
                >
                  <Download className="h-4 w-4" />
                  {t("btn.downloadTxt", locale)}
                </button>
              </div>
              <div className="flex justify-center gap-3">
                <button onClick={() => generateContent()} className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <RefreshCw className="h-3 w-3" />{t("btn.regenerate", locale)}
                </button>
                <button onClick={autoFix} disabled={loading} className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-primary/80 transition-colors">
                  <Zap className="h-3 w-3" />{t("btn.autoFix", locale)}
                </button>
                {autoFixUsed && (originalGeneralResult || originalProResult) && (
                  <button
                    onClick={() => {
                      if (showOriginal) {
                        setShowOriginal(false);
                      } else {
                        setShowOriginal(true);
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showOriginal ? t("result.autoFixedVersion", locale) : t("result.originalVersion", locale)}
                  </button>
                )}
              </div>
              {autoFixImproved && (
                <div className="flex justify-center gap-2">
                  <span className="text-[10px] uppercase tracking-widest font-bold text-primary bg-primary/10 px-3 py-1 rounded-full">
                    ✓ {autoFixScoreDiff > 0 ? t("badge.improvedBy", locale).replace("{x}", String(autoFixScoreDiff)) : t("badge.improved", locale)}
                  </span>
                </div>
              )}
              {autoFixUsed && (originalGeneralResult || originalProResult) && !showOriginal && (
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      if (isProMode && originalProResult) {
                        setProResult(originalProResult);
                        setOriginalProResult(null);
                      } else if (!isProMode && originalGeneralResult) {
                        setGeneralResult(originalGeneralResult);
                        setOriginalGeneralResult(null);
                      }
                      setAutoFixUsed(false);
                      setAutoFixImproved(false);
                      setAutoFixScoreDiff(0);
                      setShowOriginal(false);
                    }}
                    className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t("btn.revertOriginal", locale)}
                  </button>
                </div>
              )}
            </div>
          )}

          {loading && <LoadingState mode={mode} locale={locale} />}

          {/* Auto-Fixed Version label */}
          {!loading && autoFixUsed && !showOriginal && hasResults && (
            <p className="text-xs font-bold uppercase tracking-widest text-primary px-1">{t("result.autoFixedVersion", locale)}</p>
          )}

          {!loading && !isProMode && generalResult && !showOriginal && (
            <GeneralResults result={generalResult} copied={copied} onCopy={copyToClipboard} locale={locale} targetAudience={targetAudience} scriptLength={scriptLength} voiceSpeed={settings.voiceSpeed} />
          )}
          {!loading && isProMode && proResult && !showOriginal && (
            <ProResults result={proResult} platforms={platforms} copied={copied} onCopy={copyToClipboard} locale={locale} targetAudience={targetAudience} scriptLength={scriptLength} voiceSpeed={settings.voiceSpeed} />
          )}

          {/* A/B Hook Tester — shown after results */}
          {!loading && hasResults && (
            <ABHookTester
              topic={topic}
              isPro={isProMode}
              locale={locale}
              style={style}
              scriptLength={scriptLength}
              onSelectHook={(hook) => {
                if (isProMode && proResult) {
                  setProResult({ ...proResult, bestHook: hook });
                } else if (generalResult) {
                  setGeneralResult({ ...generalResult, bestHook: hook });
                }
              }}
            />
          )}

          {!loading && autoFixUsed && showOriginal && (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">{t("result.originalVersion", locale)}
                {originalGeneralResult?.viralAnalysis?.score || originalProResult?.viralAnalysis?.score
                  ? ` (Score: ${(originalGeneralResult?.viralAnalysis?.score || originalProResult?.viralAnalysis?.score)}/10)`
                  : ""}
              </p>
              {!isProMode && originalGeneralResult && (
                <GeneralResults result={originalGeneralResult} copied={copied} onCopy={copyToClipboard} locale={locale} targetAudience={targetAudience} scriptLength={scriptLength} voiceSpeed={settings.voiceSpeed} />
              )}
              {isProMode && originalProResult && (
                <ProResults result={originalProResult} platforms={platforms} copied={copied} onCopy={copyToClipboard} locale={locale} targetAudience={targetAudience} scriptLength={scriptLength} voiceSpeed={settings.voiceSpeed} />
              )}
            </>
          )}

          {/* Discovery Results */}
          {!loading && discoveryResult && discoveryResult.ideas?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-primary" />{t("result.discovery", locale)}
              </h3>
              {/* Category Filter */}
              <div className="flex flex-wrap gap-1.5 px-1">
                {DISCOVERY_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setDiscoveryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                      discoveryFilter === cat
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              {/* Card Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {discoveryResult.ideas
                  .filter((idea) => discoveryFilter === "All" || (idea.category || "").toLowerCase() === discoveryFilter.toLowerCase())
                  .map((idea, i) => (
                  <button
                    key={i}
                    onClick={() => { setTopic(idea.title); setDiscoveryResult(null); setDiscoveryFilter("All"); }}
                    className="text-left bg-muted/40 hover:bg-muted/60 rounded-2xl p-4 space-y-1.5 transition-colors border border-border/30"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      {idea.region && <span className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-lg">{idea.region}</span>}
                      {idea.category && <span className="text-[10px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-lg">{idea.category}</span>}
                    </div>
                    <p className="text-sm font-semibold text-foreground leading-snug">{idea.title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{idea.why}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!hasResults && !loading && !discoveryResult && (
            <div className="text-center py-16 space-y-2">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">{t("empty.text", locale)}</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
