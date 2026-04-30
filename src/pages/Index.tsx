import React, { useState, useCallback, memo, useMemo, useEffect, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Copy, Loader2, Sparkles, RefreshCw, Download,
  Image, Clock, Flame, Crown, Hash, Youtube, Mic,
  Lock, TrendingUp, Shuffle, Lightbulb, Zap, Instagram,
  Search, Dumbbell, DollarSign, Brain, Skull, BookOpen,
  ChevronDown, ChevronUp, PenTool, LayoutGrid, Dice1, AlertTriangle,
} from "lucide-react";
import { Eye, Ghost, Cpu, Rocket, Scroll, MessageCircle, Wand2, BarChart3, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Navbar } from "@/components/Navbar";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";
import { CommandPalette } from "@/components/CommandPalette";
import { DailyChallenge } from "@/components/DailyChallenge";
import { SettingsDialog } from "@/components/SettingsDialog";
import { useGamification } from "@/hooks/useGamification";
import { Menu } from "lucide-react";
import { useSettings, CHAR_TARGETS_BY_SPEED, useRouteThemeSync } from "@/contexts/SettingsContext";
import { useAuth } from "@/contexts/AuthContext";
import { t, type Locale } from "@/lib/i18n";
import { HistoryDrawer } from "@/components/HistoryDrawer";
import { getTopicSuggestions, getRandomTopic } from "@/lib/topicSuggestions";
import { GeneralResults, type GeneralResult } from "@/components/GeneralResults";
import { ChannelProfile, loadChannelProfile, type ChannelProfileData } from "@/components/ChannelProfile";
import { TrendingPanel } from "@/components/TrendingPanel";
import { WeeklyPlan } from "@/components/WeeklyPlan";
import { ABHookTester } from "@/components/ABHookTester";
import { BulkPackDialog } from "@/components/BulkPackDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { HookLab } from "@/components/HookLab";

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
  out.youtube = {
    title: String(out.youtube?.title || ""),
    description: String(out.youtube?.description || ""),
    tags: Array.isArray(out.youtube?.tags) ? out.youtube.tags : [],
  };
  out.tiktok = {
    caption: String(out.tiktok?.caption || ""),
    hashtags: Array.isArray(out.tiktok?.hashtags) ? out.tiktok.hashtags : [],
  };
  if (!Array.isArray(out.hooks)) out.hooks = [];
  if (!Array.isArray(out.editingPlan)) out.editingPlan = [];
  if (!Array.isArray(out.imagePrompts)) out.imagePrompts = [];
  if (!Array.isArray(out.thumbnails)) out.thumbnails = [];
  if (!Array.isArray(out.angleVariations)) out.angleVariations = [];
  if (!Array.isArray(out.music)) out.music = [];
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

const HORROR_THREAT_TYPES = [
  { value: "ai-chooses", label: "🎲 AI Chooses" },
  { value: "wrong-reflection", label: "🪞 Wrong Reflection" },
  { value: "doppelganger", label: "👤 Doppelganger" },
  { value: "voice-mimicry", label: "🔊 Voice Mimicry" },
  { value: "something-inside", label: "🏠 Something Inside" },
  { value: "identity-swap", label: "🔄 Identity Swap" },
  { value: "shadow-entity", label: "🌑 Shadow Entity" },
];

const HORROR_RANDOM_COMBOS = [
  "Japan, mirrors", "Brazil, forest", "Korea, elevators", "Mexico, roads", "Russia, lakes",
  "India, temples", "Norway, fjords", "Egypt, tombs", "Turkey, tunnels", "Philippines, islands",
  "Scotland, castles", "Peru, mountains", "Indonesia, caves", "Greece, ruins", "Thailand, markets",
  "Iceland, glaciers", "Colombia, rivers", "Romania, villages", "Vietnam, bridges", "Morocco, deserts",
  "Chile, mines", "Poland, forests", "Argentina, trains", "Nepal, monasteries", "Ireland, cliffs",
];

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

// Extended presets — 6 additional niches for power users
const EXTENDED_PRESETS: NichePreset[] = [
  {
    id: "conspiracy",
    label: "Conspiracy",
    labelTr: "Komplo",
    icon: Eye,
    style: "suspense",
    topics: [
      "The 1971 experiment the government still hides",
      "Why every world map you've seen is wrong",
      "The town that was erased from every database",
      "What was found inside the sealed Vatican archives",
      "The phone call that predicted 9/11 — six years early",
      "The Antarctica expedition that never came back",
      "Why Denver Airport scares conspiracy theorists",
      "The book banned in 47 countries for one chapter",
    ],
    topicsTr: [
      "Hükümetin hâlâ sakladığı 1971 deneyi",
      "Gördüğünüz her dünya haritası neden yanlış",
      "Tüm veritabanlarından silinen kasaba",
      "Vatikan arşivlerinin mührünün arkasında bulunan şey",
      "11 Eylül'ü altı yıl önceden tahmin eden telefon",
      "Geri dönmeyen Antarktika seferi",
      "Denver Havalimanı komplo teorisyenlerini neden korkutuyor",
      "Tek bir bölüm yüzünden 47 ülkede yasaklanan kitap",
    ],
  },
  {
    id: "paranormal",
    label: "Paranormal",
    labelTr: "Paranormal",
    icon: Ghost,
    style: "suspense",
    topics: [
      "The hotel room that no one survives a full night in",
      "The girl who remembered her past life in detail",
      "The CCTV footage scientists still can't explain",
      "The 911 call that came from inside an empty house",
      "Why this forest in Japan has no animals",
      "The painting that follows you with its eyes — proven",
      "The voice on the radio that keeps repeating one date",
      "The man who woke up speaking a language he never learned",
    ],
    topicsTr: [
      "Kimsenin bütün geceyi atlatamadığı otel odası",
      "Geçmiş hayatını detaylıca hatırlayan kız",
      "Bilim insanlarının hâlâ açıklayamadığı kamera kaydı",
      "Boş bir evden gelen 112 araması",
      "Japonya'daki bu ormanın hiç hayvanı neden yok",
      "Sizi gözleriyle takip eden tablo — kanıtlandı",
      "Radyoda tek bir tarihi tekrar eden ses",
      "Hiç öğrenmediği bir dili konuşarak uyanan adam",
    ],
  },
  {
    id: "tech-ai",
    label: "Tech & AI",
    labelTr: "Teknoloji & AI",
    icon: Cpu,
    style: "viral",
    topics: [
      "The AI that taught itself to lie — and got caught",
      "Why ChatGPT will replace 300M jobs in 2 years",
      "The phone feature Apple buried for 8 years",
      "What happens when two AIs negotiate without humans",
      "The free AI tool that makes me $10K a month",
      "Why Elon Musk is terrified of GPT-5",
      "The dark web AI nobody is allowed to use",
      "How your iPhone is secretly listening — proof",
    ],
    topicsTr: [
      "Kendi kendine yalan söylemeyi öğrenen AI",
      "ChatGPT 2 yıl içinde 300M işi neden çalacak",
      "Apple'ın 8 yıl gömdüğü telefon özelliği",
      "İki AI insansız müzakere edince ne olur",
      "Bana ayda $10K kazandıran ücretsiz AI aracı",
      "Elon Musk GPT-5'ten neden korkuyor",
      "Kimsenin kullanmasına izin verilmeyen dark web AI'sı",
      "iPhone'unuz sizi nasıl gizlice dinliyor — kanıt",
    ],
  },
  {
    id: "space",
    label: "Space",
    labelTr: "Uzay",
    icon: Rocket,
    style: "educational",
    topics: [
      "What NASA found at the edge of the universe",
      "The signal from space that repeats every 16 days",
      "Why we never went back to the Moon — the real reason",
      "The planet where it rains diamonds",
      "What's inside Jupiter — it's not what you think",
      "The astronaut who saw something he can't talk about",
      "Why time moves differently on Mars",
      "The black hole that shouldn't exist",
    ],
    topicsTr: [
      "NASA evrenin sınırında ne buldu",
      "Her 16 günde bir tekrar eden uzay sinyali",
      "Aya neden bir daha gitmedik — gerçek sebep",
      "Elmas yağmurunun yağdığı gezegen",
      "Jüpiter'in içinde ne var — sandığınız gibi değil",
      "Anlatamadığı bir şey gören astronot",
      "Mars'ta zaman neden farklı akıyor",
      "Var olmaması gereken kara delik",
    ],
  },
  {
    id: "history",
    label: "Dark History",
    labelTr: "Karanlık Tarih",
    icon: Scroll,
    style: "suspense",
    topics: [
      "The medieval punishment too brutal to teach in schools",
      "Why ancient maps show Antarctica without ice",
      "The Roman invention we still can't replicate",
      "What was found in Hitler's secret bunker — declassified",
      "The pharaoh whose tomb killed everyone who entered",
      "The civilization that vanished overnight — no bodies",
      "Why the Library of Alexandria burning hid one book on purpose",
      "The forgotten war that killed more people than WWII",
    ],
    topicsTr: [
      "Okullarda öğretilemeyecek kadar vahşi ortaçağ cezası",
      "Antik haritalar Antarktika'yı neden buzsuz gösteriyor",
      "Hâlâ kopyalayamadığımız Roma icadı",
      "Hitler'in gizli sığınağında bulunan şey — açıklandı",
      "Mezarına giren herkesi öldüren firavun",
      "Bir gecede yok olan medeniyet — ceset yok",
      "İskenderiye Kütüphanesi yanarken bilerek saklanan kitap",
      "II. Dünya Savaşı'ndan fazla öldüren unutulmuş savaş",
    ],
  },
  {
    id: "storytime",
    label: "Storytime",
    labelTr: "Hikaye Zamanı",
    icon: MessageCircle,
    style: "emotional",
    topics: [
      "The text I got from my dad — three years after he died",
      "I caught my best friend doing this in my house",
      "The customer who tipped me $4,000 — and why",
      "I was kidnapped at 7 and didn't know it for 20 years",
      "The Uber driver who saved my life without knowing",
      "I found a hidden room in the apartment I just bought",
      "My twin sister has been living my life — for 6 months",
      "The interview question that made me walk out and cry",
    ],
    topicsTr: [
      "Babamdan gelen mesaj — öldükten üç yıl sonra",
      "En iyi arkadaşımı evimde bunu yaparken yakaladım",
      "Bana 4.000$ bahşiş bırakan müşteri — ve nedeni",
      "7 yaşında kaçırılmışım — 20 yıl sonra öğrendim",
      "Hayatımı bilmeden kurtaran Uber sürücüsü",
      "Yeni aldığım dairede gizli bir oda buldum",
      "İkiz kardeşim 6 aydır benim hayatımı yaşıyor",
      "Beni ağlatıp dışarı çıkaran iş görüşmesi sorusu",
    ],
  },
];

const ALL_PRESETS: NichePreset[] = [...NICHE_PRESETS, ...EXTENDED_PRESETS];

type Mode = "general" | "pro" | "horror";

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

// (Usage limit banner removed — single tier, every signed-in user has full access.)

// ── Main page ───────────────────────────────────────────────────────

export default function Index() {
  useRouteThemeSync();
  const isMobile = useIsMobile();
  const { settings } = useSettings();
  const locale = settings.language;
  const { user, planType, hasProAccess, trialDaysLeft, trialHoursLeft, requireAuth, loading: authLoading, setShowAuthModal, setShowUpgradeDialog } = useAuth();

  // Usage limits removed — every signed-in user has full access.
  const remaining = Infinity;
  const isAtLimit = false;
  const nextRefillLabel = "";
  const increment = useCallback(() => {}, []);

  // Gate the entire app behind authentication.
  useEffect(() => {
    if (!authLoading && !user) {
      setShowAuthModal(true);
    }
  }, [authLoading, user, setShowAuthModal]);

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
  const isHorrorMode = mode === "horror";
  const [horrorThreatType, setHorrorThreatType] = useState("ai-chooses");
  const [horrorUsedCombos, setHorrorUsedCombos] = useState<Set<string>>(new Set());
  const [countryWarning, setCountryWarning] = useState<string | null>(null);
  const suggestCount = isProMode ? 6 : 3;
  const [suggestions, setSuggestions] = useState(() => getTopicSuggestions(suggestCount, contentType, style));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"generate" | "results">("generate");
  const [profileForceOpen, setProfileForceOpen] = useState(false);

  // Quick Start expansion + AI topic generator
  const [showAllPresets, setShowAllPresets] = useState(false);
  const [generatingFreshTopics, setGeneratingFreshTopics] = useState(false);
  const [hookLabOpen, setHookLabOpen] = useState(false);
  const [freshTopicsCache, setFreshTopicsCache] = useState<Record<string, string[]>>(() => {
    try {
      const cached = sessionStorage.getItem("fresh-topics-cache");
      return cached ? JSON.parse(cached) : {};
    } catch { return {}; }
  });

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

  // Country tracker for horror mode
  const checkCountryUsed = useCallback((topicVal: string) => {
    const country = topicVal.split(",")[0]?.trim().toLowerCase();
    if (!country) { setCountryWarning(null); return; }
    try {
      const used: string[] = JSON.parse(localStorage.getItem("horror-used-countries") || "[]");
      if (used.includes(country)) {
        setCountryWarning(country.charAt(0).toUpperCase() + country.slice(1));
      } else {
        setCountryWarning(null);
      }
    } catch { setCountryWarning(null); }
  }, []);

  const saveCountryUsed = useCallback((topicVal: string) => {
    const country = topicVal.split(",")[0]?.trim().toLowerCase();
    if (!country) return;
    try {
      const used: string[] = JSON.parse(localStorage.getItem("horror-used-countries") || "[]");
      if (!used.includes(country)) {
        localStorage.setItem("horror-used-countries", JSON.stringify([...used, country]));
      }
    } catch {}
  }, []);

  const randomHorrorCombo = useCallback(() => {
    const available = HORROR_RANDOM_COMBOS.filter(c => !horrorUsedCombos.has(c));
    const pool = available.length > 0 ? available : HORROR_RANDOM_COMBOS;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    setHorrorUsedCombos(prev => new Set([...prev, pick]));
    setTopic(pick);
    checkCountryUsed(pick);
  }, [horrorUsedCombos, checkCountryUsed]);

  const [discoveryResult, setDiscoveryResult] = useState<DiscoveryResult | null>(null);
  const [discoveryFilter, setDiscoveryFilter] = useState("All");
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning | null>(null);

  const handlePresetClick = useCallback((preset: NichePreset) => {
    setSelectedPreset(preset.id);
    setStyle(preset.style);
    // Set content type based on preset
    if (preset.id === "educational" || preset.id === "fitness" || preset.id === "space" || preset.id === "tech-ai") {
      setContentType("educational");
    } else if (
      preset.id === "mystery" || preset.id === "horror" ||
      preset.id === "conspiracy" || preset.id === "paranormal" ||
      preset.id === "history" || preset.id === "storytime"
    ) {
      setContentType("story");
    } else if (preset.id === "motivation") {
      setContentType("story");
    } else if (preset.id === "finance") {
      setContentType("entertainment");
    }
    // Prefer AI-generated fresh topics if cached
    const fresh = freshTopicsCache[preset.id];
    if (fresh && fresh.length > 0) {
      setPresetTopics(fresh);
    } else {
      setPresetTopics(locale === "tr" ? preset.topicsTr : preset.topics);
    }
  }, [locale, freshTopicsCache]);

  // ✨ Generate fresh AI-powered topics for the selected preset
  const handleGenerateFreshTopics = useCallback(async () => {
    if (!selectedPreset) {
      toast.error(locale === "tr" ? "Önce bir kategori seç" : "Pick a category first");
      return;
    }
    const preset = ALL_PRESETS.find(p => p.id === selectedPreset);
    if (!preset) return;
    setGeneratingFreshTopics(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-topics", {
        body: {
          niche: preset.id,
          nicheLabel: preset.label,
          language: locale,
          targetAudience,
          count: 8,
        },
      });
      if (error) throw error;
      const topics: string[] = Array.isArray(data?.topics) ? data.topics.filter((t: any) => typeof t === "string") : [];
      if (topics.length === 0) throw new Error("No topics returned");
      setPresetTopics(topics);
      const next = { ...freshTopicsCache, [preset.id]: topics };
      setFreshTopicsCache(next);
      try { sessionStorage.setItem("fresh-topics-cache", JSON.stringify(next)); } catch {}
      toast.success(locale === "tr" ? "8 yeni viral fikir geldi ✨" : "8 fresh viral ideas loaded ✨");
    } catch (e: any) {
      console.error("Fresh topics error", e);
      toast.error(locale === "tr" ? "Fikir üretilemedi, tekrar dene" : "Couldn't generate, try again");
    } finally {
      setGeneratingFreshTopics(false);
    }
  }, [selectedPreset, locale, targetAudience, freshTopicsCache]);

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
    setActiveTab("results");
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
    const effectiveTopic = isHorrorMode && !topic.trim() ? "__horror_random__" : topic.trim();
    if (!effectiveTopic) return;
    if (!isProMode && !isHorrorMode && isAtLimit) {
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
      const body = isHorrorMode
        ? {
            mode: "horror", topic: effectiveTopic === "__horror_random__" ? "" : effectiveTopic,
            platforms, platform, scriptLength, language: locale,
            targetAudience, imageFormat: "9:16",
            threatType: horrorThreatType !== "ai-chooses" ? horrorThreatType : undefined,
          }
        : isProMode
        ? {
            mode: "pro", topic: effectiveTopic, platforms, contentType, style, scriptLength, goal, hookIntensity,
            imageFormat: "9:16", imagePromptCount,
            customDescription: customDescription.trim() || undefined,
            language: locale,
            targetAudience,
            hookStyle,
          }
        : {
            mode: "general", topic: effectiveTopic, platform, contentType, style, scriptLength, goal, hookIntensity,
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
      if (!isHorrorMode && scriptLen > 0 && scriptLen < Math.floor(target.min * 0.8)) {
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

      if (isHorrorMode || isProMode) {
        setProResult(normalizeResult(data) as ProResult);
        setGeneralResult(null);
      } else {
        setGeneralResult(normalizeResult(data) as GeneralResult);
        setProResult(null);
        increment();
      }
      setActiveTab("results");
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });

      // Save country for horror tracking
      if (isHorrorMode) {
        const savedTopic = effectiveTopic === "__horror_random__" ? (data?.title || "") : effectiveTopic;
        saveCountryUsed(savedTopic);
      }

      try {
        await supabase.from("generations").insert({
          user_id: user?.id,
          device_id: deviceId,
          topic: (effectiveTopic === "__horror_random__" ? data?.title || "Horror Mode" : effectiveTopic),
          platforms: (isProMode || isHorrorMode) ? platforms : [platform],
          duration: scriptLength,
          style: isHorrorMode ? "horror" : style,
          content_type: isHorrorMode ? "horror" : contentType,
          goal: isHorrorMode ? "viral" : goal,
          plan_type: isHorrorMode ? "horror" : isProMode ? "pro" : "free",
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
  }, [isProMode, isHorrorMode, topic, platform, platforms, contentType, style, scriptLength, goal, hookIntensity, imagePromptCount, customDescription, settings.outputStyle, isAtLimit, increment, locale, deviceId, targetAudience, hookStyle, checkDuplicate, horrorThreatType, saveCountryUsed]);

  const handleHistoryReopen = useCallback((item: any) => {
    setTopic(item.topic);
    if (item.plan_type === "horror") {
      setMode("horror");
      setPlatforms(item.platforms || ["tiktok"]);
      setProResult(normalizeResult(item.output_json) as ProResult);
      setGeneralResult(null);
    } else if (item.plan_type === "pro") {
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
    setActiveTab("results");
  }, []);

  const handleHistoryRegenerate = useCallback((item: any) => {
    setTopic(item.topic);
    if (item.plan_type === "horror") {
      setMode("horror");
      setPlatforms(item.platforms || ["tiktok"]);
    } else if (item.plan_type === "pro") {
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

  const hasResults = (isProMode || isHorrorMode) ? proResult !== null : generalResult !== null;

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
    const result = (isProMode || isHorrorMode) ? proResult : generalResult;
    if (!result) return;
    const all = buildFullPackText(result, isProMode || isHorrorMode);
    copyToClipboard("all", all);
  }, [isProMode, isHorrorMode, generalResult, proResult, copyToClipboard, buildFullPackText]);

  const downloadTxt = useCallback(() => {
    const result = (isProMode || isHorrorMode) ? proResult : generalResult;
    if (!result) return;
    const all = buildFullPackText(result, isProMode || isHorrorMode);
    const slug = topic.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40) || "content";

    const now = new Date();
    const dateStr = now.toISOString().replace("T", " ").slice(0, 19);
    const platformLabels = ((isProMode || isHorrorMode) ? platforms : [platform]).map((p: string) => {
      if (p === "tiktok") return "TikTok";
      if (p === "youtube-shorts") return "YouTube Shorts";
      if (p === "instagram-reels") return "Instagram Reels";
      return p;
    }).join(", ");
    const viralScore = result.viralAnalysis?.score || "N/A";

    const horrorSections = isHorrorMode ? `
Mode: Horror Mode
` : "";

    const metadata = `=== CONTENT PACK INFO ===
Topic: ${topic.trim()}
Platform: ${platformLabels}
Target Audience: ${targetAudience}
${isHorrorMode ? `Mode: Horror Mode\nThreat Type: ${HORROR_THREAT_TYPES.find(t => t.value === horrorThreatType)?.label || "AI Chooses"}\nCountry: ${topic.split(",")[0]?.trim() || "AI Random"}\n` : `Hook Style: ${hookStyle}\n`}Duration: ${scriptLength}s
Voice Speed: ${settings.voiceSpeed}
${isHorrorMode ? "" : `Style: ${style}\nContent Type: ${contentType}\nGoal: ${goal}\n`}Auto-Fix Used: ${autoFixUsed ? "Yes" : "No"}
Generated: ${dateStr}
Viral Score: ${viralScore}/10
=========================

`;

    // Horror mode extras from output_json
    let horrorExtras = "";
    if (isHorrorMode) {
      const data = result as any;
      if (data.textOverlays?.length) {
        horrorExtras += `\n\n📌 TEXT OVERLAYS:\n${data.textOverlays.map((o: any, i: number) => `${i + 1}. ${typeof o === "string" ? o : `${o.text} (${o.timing})`}`).join("\n")}`;
      }
      if (data.audioDirective) {
        horrorExtras += `\n\n🎙️ AUDIO DIRECTIVES:\n${typeof data.audioDirective === "string" ? data.audioDirective : JSON.stringify(data.audioDirective, null, 2)}`;
      }
      if (data.animationNotes) {
        horrorExtras += `\n\n🎬 ANIMATION NOTES:\n${typeof data.animationNotes === "string" ? data.animationNotes : JSON.stringify(data.animationNotes, null, 2)}`;
      }
    }

    const blob = new Blob([metadata + all + horrorExtras], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}-content-pack.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("toast.downloaded", locale));
  }, [isProMode, isHorrorMode, generalResult, proResult, topic, buildFullPackText, locale, platforms, platform, targetAudience, hookStyle, scriptLength, style, contentType, goal, autoFixUsed]);

  const autoFix = useCallback(async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setAutoFixImproved(false);
    setAutoFixScoreDiff(0);
    try {
      const prevResult = (isProMode || isHorrorMode) ? proResult : generalResult;
      const prevScore = prevResult?.viralAnalysis?.score || 0;

      // Save original before overwriting
      if (!autoFixUsed) {
        if ((isProMode || isHorrorMode) && proResult) setOriginalProResult({ ...proResult });
        if (!isProMode && !isHorrorMode && generalResult) setOriginalGeneralResult({ ...generalResult });
      }

      const body = isHorrorMode
        ? {
            mode: "horror", topic, platforms, platform, scriptLength,
            language: locale, targetAudience, imageFormat: "9:16",
            autoFixForced: true,
          }
        : isProMode
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

      if (isProMode || isHorrorMode) {
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
  }, [isProMode, isHorrorMode, topic, platform, platforms, contentType, style, scriptLength, goal, imagePromptCount, customDescription, settings.outputStyle, locale, targetAudience, hookStyle, proResult, generalResult, autoFixUsed]);

  const handleProfileSave = useCallback((profile: ChannelProfileData) => {
    if (profile.audience) setTargetAudience(profile.audience);
    if (profile.niche) {
      const presetMatch = NICHE_PRESETS.find(p => p.id === profile.niche);
      if (presetMatch) handlePresetClick(presetMatch);
    }
  }, [handlePresetClick]);

  const [historyOpen, setHistoryOpen] = useState(false);
  const trendingRef = useRef<HTMLDivElement>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
  const { recordGeneration } = useGamification();

  // Global shortcuts: ⌘K palette, ⌘Enter generate, ⌘H history
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCommandOpen((o) => !o);
      } else if (mod && e.key === "Enter") {
        // Triggered by generate button anyway; only fire if topic is set & not loading
        const target = e.target as HTMLElement;
        const tag = target?.tagName;
        if (tag === "TEXTAREA" || tag === "INPUT") return;
        e.preventDefault();
        // dispatched event listened by generate button
        document.dispatchEvent(new CustomEvent("cs:generate"));
      } else if (mod && e.key.toLowerCase() === "h") {
        e.preventDefault();
        setHistoryOpen(true);
      } else if (mod && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Listen for cs:generate event
  useEffect(() => {
    const fire = () => { if (topic.trim() && !loading) generateContent(); };
    document.addEventListener("cs:generate", fire);
    return () => document.removeEventListener("cs:generate", fire);
  }, [topic, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSidebarDiscover = useCallback(() => {
    if (trendingRef.current) {
      trendingRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  // Auth gate: signed-out users see a sign-in prompt instead of the app
  if (!authLoading && !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {locale === "tr" ? "Devam etmek için giriş yapın" : "Sign in to continue"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {locale === "tr"
                ? "Content Spark tüm özellikleriyle ücretsizdir. Devam etmek için lütfen giriş yapın veya hesap oluşturun."
                : "Content Spark is 100% free with full access. Please sign in or create a free account to continue."}
            </p>
          </div>
          <Button
            size="lg"
            className="w-full h-12 rounded-2xl text-base font-bold shadow-[var(--shadow-warm)]"
            onClick={() => setShowAuthModal(true)}
          >
            {locale === "tr" ? "Giriş yap / Kayıt ol" : "Sign in / Sign up"}
          </Button>
          <a
            href="/"
            className="block text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {locale === "tr" ? "← Ana sayfaya dön" : "← Back to home"}
          </a>
        </div>
      </div>
    );
  }

  // Trial-expired gate
  if (!authLoading && user && planType === "trial_expired") {
    const userEmail = user.email ?? "";
    const subject = encodeURIComponent("Pro Upgrade Request — Content Spark");
    const body = encodeURIComponent(`Hi,\n\nI'd like to upgrade to the Pro plan ($19/mo).\n\nAccount email: ${userEmail}\n\nThanks!`);
    const mailto = `mailto:hello@contentspark.app?subject=${subject}&body=${body}`;
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
            <Crown className="h-8 w-8 text-primary-foreground" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {locale === "tr" ? "3 günlük deneme süreniz doldu" : "Your 3-day trial has ended"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {locale === "tr"
                ? "Content Spark Pro'yu kullanmaya devam etmek için aboneliğinizi etkinleştirin. Ödeme henüz otomatik değil — bizimle iletişime geçin, 24 saat içinde size dönelim."
                : "To keep using Content Spark Pro, activate your subscription. Payments aren't automated yet — contact us and we'll set you up within 24h."}
            </p>
          </div>
          <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-5">
            <div className="flex items-baseline justify-center gap-1">
              <span className="text-4xl font-extrabold text-foreground">$19</span>
              <span className="text-sm text-muted-foreground">/{locale === "tr" ? "ay" : "month"}</span>
            </div>
            <p className="text-center text-xs text-muted-foreground mt-1">
              {locale === "tr" ? "Pro plan — tüm özellikler" : "Pro plan — full access"}
            </p>
          </div>
          <Button asChild size="lg" className="w-full h-12 rounded-2xl text-base font-bold shadow-[var(--shadow-warm)]">
            <a href={mailto}>
              {locale === "tr" ? "Yükseltmek için iletişime geçin" : "Contact us to upgrade"}
            </a>
          </Button>
          <a href="/" className="block text-xs text-muted-foreground hover:text-foreground transition-colors">
            {locale === "tr" ? "← Ana sayfaya dön" : "← Back to home"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Left Sidebar */}
      <AppSidebar
        locale={locale}
        activeNav="create"
        onHistoryClick={() => setHistoryOpen(true)}
      />

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col">
      <Navbar onEditProfile={() => setProfileForceOpen(true)} />

      {/* Trial countdown banner — visible only during the 3-day Pro trial */}
      {planType === "trial" && (
        <Alert className="rounded-none border-x-0 border-t-0 bg-primary/10 border-primary/20 py-2.5">
          <AlertDescription>
          <div className="mx-auto max-w-6xl flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <Crown className="h-4 w-4 text-primary shrink-0" />
              <span className="font-medium text-foreground">
                {locale === "tr" ? "Pro Deneme Aktif" : "Pro Trial Active"}
              </span>
              <span className="text-muted-foreground">
                {trialDaysLeft > 1
                  ? (locale === "tr" ? `${trialDaysLeft} gün kaldı` : `${trialDaysLeft} days left`)
                  : trialHoursLeft > 1
                    ? (locale === "tr" ? `${trialHoursLeft} saat kaldı` : `${trialHoursLeft} hours left`)
                    : (locale === "tr" ? "Yakında bitiyor" : "Ending soon")}
              </span>
            </div>
            <Button variant="link" size="sm" onClick={() => setShowUpgradeDialog(true)} className="text-xs text-primary h-auto p-0">
              {locale === "tr" ? "Pro'ya yükselt →" : "Upgrade to Pro →"}
            </Button>
          </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Mobile: keep floating trending panel */}
      {isMobile && (
        <TrendingPanel
          niche={selectedPreset}
          audience={targetAudience}
          locale={locale}
          onSelectTopic={(t) => setTopic(t)}
        />
      )}

      <div className="relative py-6 lg:py-8 px-4 lg:px-6 flex-1 overflow-hidden">
        {/* Ambient background — animated orbs + grid */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-grid-fade opacity-60" />
          <div className="absolute -top-24 -left-16 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-primary/20 blur-3xl animate-orb-1" />
          <div className="absolute top-40 -right-20 w-72 h-72 sm:w-[28rem] sm:h-[28rem] rounded-full bg-fuchsia-500/15 blur-3xl animate-orb-2" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 rounded-full bg-violet-500/10 blur-3xl animate-pulse-glow" />
        </div>
        <div className="mx-auto max-w-6xl relative">
          <div className="flex gap-8">
            {/* ── LEFT MAIN WORKSPACE ── */}
            <div className="flex-1 min-w-0 max-w-3xl mx-auto lg:mx-0 space-y-7">
          <div className="text-center space-y-3 pt-2 animate-fade-in">
            {/* Live status badge */}
            <div className="flex items-center justify-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] font-semibold text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75 animate-ping" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-live-pulse" />
                </span>
                {locale === "tr" ? "AI motoru çevrimiçi" : "AI engine online"}
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">
                <span className="text-gradient-animated">{t("app.title", locale)}</span>
              </h1>
              <HistoryDrawer
                deviceId={deviceId}
                isPro={isProMode}
                locale={locale}
                onReuse={(t) => setTopic(t)}
                onReopen={handleHistoryReopen}
                onRegenerate={handleHistoryRegenerate}
                externalOpen={historyOpen}
                onExternalOpenChange={setHistoryOpen}
                hideTrigger={!isMobile}
              />
            </div>
            <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto">
              {t("app.subtitle", locale)}
            </p>
            {/* Quick stat strip — mobile-friendly */}
            <div className="flex items-center justify-center gap-2 sm:gap-4 pt-2 flex-wrap">
              <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span><b className="text-foreground">12+</b> {locale === "tr" ? "niş" : "niches"}</span>
              </div>
              <span className="h-1 w-1 rounded-full bg-border" />
              <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span><b className="text-foreground">10</b> {locale === "tr" ? "hook varyasyonu" : "hook variations"}</span>
              </div>
              <span className="h-1 w-1 rounded-full bg-border" />
              <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span><b className="text-foreground">~60s</b> {locale === "tr" ? "üretim" : "to generate"}</span>
              </div>
            </div>
          </div>

          {/* MODE TOGGLE */}
          <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="w-full">
            <TabsList className="w-full rounded-2xl h-auto p-1 bg-card/70 backdrop-blur-sm border border-border/40 shadow-sm">
              <TabsTrigger value="general" className="flex-1 rounded-xl py-2.5 text-xs sm:text-sm font-semibold gap-1.5 sm:gap-2 transition-all data-[state=active]:shadow-md data-[state=active]:scale-[1.02]">
                <Zap className="h-4 w-4" />{t("mode.free", locale)}
              </TabsTrigger>
              <TabsTrigger value="pro" className="flex-1 rounded-xl py-2.5 text-xs sm:text-sm font-semibold gap-1.5 sm:gap-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-fuchsia-600 data-[state=active]:text-primary-foreground data-[state=active]:shadow-md data-[state=active]:scale-[1.02]">
                <Crown className="h-4 w-4" />{t("mode.pro", locale)}
              </TabsTrigger>
              <TabsTrigger value="horror" className="flex-1 rounded-xl py-2.5 text-xs sm:text-sm font-semibold gap-1.5 sm:gap-2 transition-all data-[state=active]:bg-gradient-to-r data-[state=active]:from-red-950 data-[state=active]:to-red-800 data-[state=active]:text-red-100 data-[state=active]:shadow-md data-[state=active]:scale-[1.02]">
                <Skull className="h-4 w-4" /><span className="hidden sm:inline">🎭 </span>Horror
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Horror Mode badge */}
          {isHorrorMode && (
            <Alert className="bg-red-950/30 border-red-800/40">
              <AlertDescription>
                <span className="text-xs font-bold text-red-400 uppercase tracking-widest">Urban Legend Format</span>
              </AlertDescription>
            </Alert>
          )}

          {/* GENERATE / RESULTS TABS */}
          <Tabs value={activeTab} onValueChange={(v) => { if (v === "results" && !hasResults && !loading) return; setActiveTab(v as "generate" | "results"); }} className="w-full">
            <TabsList className="w-full rounded-2xl h-auto p-1 bg-muted/40 border border-border/30">
              <TabsTrigger value="generate" className="flex-1 rounded-xl py-2 text-sm font-semibold gap-2">
                <PenTool className="h-3.5 w-3.5" />
                {locale === "tr" ? "Oluştur" : "Generate"}
              </TabsTrigger>
              <TabsTrigger value="results" disabled={!hasResults && !loading} className="flex-1 rounded-xl py-2 text-sm font-semibold gap-2">
                <LayoutGrid className="h-3.5 w-3.5" />
                {locale === "tr" ? "Sonuçlar" : "Results"}
                {hasResults && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* ─── GENERATE TAB CONTENT ─── */}
          {activeTab === "generate" && (
          <>
          {/* Channel Profile Onboarding (not in horror mode) */}
          {!isHorrorMode && <ChannelProfile locale={locale} onSave={handleProfileSave} forceOpen={profileForceOpen} />}

          {/* Weekly Content Plan (not in horror mode) */}
          {!isHorrorMode && <WeeklyPlan isPro={isProMode} locale={locale} onSelectTopic={(t) => { setTopic(t); setDiscoveryResult(null); }} />}

          {/* Usage limits removed — every signed-in user has full access */}

          {/* INPUT AREA */}
          <div className="space-y-5">

            {/* Platform + Audience row on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.platform", locale)}</p>
              <div className="flex gap-2">
                {PLATFORM_OPTIONS.map((o) => {
                  const sel = (isProMode || isHorrorMode) ? platforms.includes(o.value) : platform === o.value;
                  return (
                    <button
                      key={o.value}
                      onClick={() => (isProMode || isHorrorMode) ? togglePlatform(o.value) : setPlatform(o.value)}
                      className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-medium transition-all ${
                        sel
                          ? isHorrorMode ? "bg-red-900 text-red-100 shadow-sm" : "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <o.icon className="h-4 w-4" />
                      {o.label.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
              {(isProMode || isHorrorMode) && <p className="text-[10px] text-muted-foreground text-center">{t("selector.platform.multi", locale)}</p>}
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
            </div>{/* end platform+audience grid */}

            {/* Threat Type selector (Horror Mode only) */}
            {isHorrorMode && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">👁 Threat Type</p>
              <div className="flex gap-2 flex-wrap">
                {HORROR_THREAT_TYPES.map((tt) => (
                  <Pill
                    key={tt.value}
                    selected={horrorThreatType === tt.value}
                    onClick={() => setHorrorThreatType(tt.value)}
                  >
                    {tt.label}
                  </Pill>
                ))}
              </div>
            </div>
            )}

            {!isHorrorMode && (
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
            )}

            {/* 4. Niche Presets (hidden in horror mode) */}
            {!isHorrorMode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                  {t("preset.title", locale)}
                </p>
                <button
                  onClick={() => setShowAllPresets(v => !v)}
                  className="text-[10px] uppercase tracking-widest font-bold text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  {showAllPresets
                    ? (locale === "tr" ? "Daha az" : "Less")
                    : (locale === "tr" ? `+${EXTENDED_PRESETS.length} kategori` : `+${EXTENDED_PRESETS.length} more`)}
                  {showAllPresets ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              </div>
              <div className="grid grid-cols-3 lg:grid-cols-6 gap-2">
                {(showAllPresets ? ALL_PRESETS : NICHE_PRESETS).map((preset) => {
                  const isSelected = selectedPreset === preset.id;
                  const PresetIcon = preset.icon;
                  const hasFresh = !!freshTopicsCache[preset.id];
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handlePresetClick(preset)}
                      className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-2xl text-xs font-medium transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      }`}
                    >
                      <PresetIcon className="h-4 w-4" />
                      {locale === "tr" ? preset.labelTr : preset.label}
                      {hasFresh && (
                        <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-emerald-400" title="Fresh AI topics cached" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* AI Topic Generator action bar */}
              {selectedPreset && (
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[11px] text-muted-foreground">
                    {presetTopics.length > 0
                      ? (freshTopicsCache[selectedPreset]
                          ? (locale === "tr" ? "✨ AI'dan taze fikirler" : "✨ Fresh AI ideas")
                          : (locale === "tr" ? "Hazır viral fikirler" : "Curated viral ideas"))
                      : ""}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleGenerateFreshTopics}
                    disabled={generatingFreshTopics}
                    className="h-7 text-[11px] gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
                  >
                    {generatingFreshTopics ? (
                      <><Loader2 className="h-3 w-3 animate-spin" /> {locale === "tr" ? "Üretiliyor…" : "Generating…"}</>
                    ) : (
                      <><Wand2 className="h-3 w-3" /> {locale === "tr" ? "✨ Yeni fikirler üret" : "✨ Generate fresh topics"}</>
                    )}
                  </Button>
                </div>
              )}

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
            )}

            {/* 3. Topic */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("input.topic", locale)}</p>

              {/* Topic Suggestions (hidden in horror mode and when preset topics are showing) */}
              {!isHorrorMode && presetTopics.length === 0 && (
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

              <div className="flex gap-2">
                <Input
                  value={topic}
                  onChange={(e) => {
                    setTopic(e.target.value);
                    if (isHorrorMode) checkCountryUsed(e.target.value);
                  }}
                  placeholder={isHorrorMode
                    ? "e.g. Japan, mirrors / Brazil, forest / Korea, elevators"
                    : locale === "tr" ? "ör. Brian Shaffer gizemi, pasif gelir mitleri..." : "e.g. Brian Shaffer mystery, passive income myths..."}
                  className="h-12 rounded-2xl text-base border-border/60 bg-muted/30 px-4 flex-1"
                  onKeyDown={(e) => e.key === "Enter" && generateContent()}
                />
                {isHorrorMode && (
                  <Button
                    variant="outline"
                    className="h-12 px-4 rounded-2xl border-red-800/40 text-red-400 hover:bg-red-950/30"
                    onClick={randomHorrorCombo}
                  >
                    🎲 Random
                  </Button>
                )}
              </div>
              {isHorrorMode && (
                <p className="text-[10px] text-muted-foreground">
                  Enter a country + phenomenon, or leave blank for AI to choose randomly
                </p>
              )}
              {isHorrorMode && countryWarning && (
                <Alert className="bg-yellow-500/10 border-yellow-500/20 text-yellow-500">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  <AlertDescription className="flex items-center gap-2 text-xs">
                    <span>⚠️ You've used {countryWarning} before. Consider a new location.</span>
                    <Button variant="ghost" size="sm" onClick={() => setCountryWarning(null)} className="ml-auto text-yellow-400 hover:text-yellow-300 text-[10px] h-auto p-0">Dismiss</Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Hook Lab quick action */}
              {!isHorrorMode && topic.trim().length > 3 && (
                <button
                  type="button"
                  onClick={() => setHookLabOpen(true)}
                  className="text-[11px] font-medium text-primary/90 hover:text-primary flex items-center gap-1.5 transition-colors"
                >
                  <Wand2 className="h-3 w-3" />
                  {locale === "tr" ? "🧪 Hook Lab — 10 farklı açıdan hook üret" : "🧪 Hook Lab — generate 10 angled hooks"}
                </button>
              )}

            </div>

            {/* 4. Length */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">{t("selector.length", locale)}</p>
              <div className="flex gap-2">
                {LENGTH_OPTIONS.map((len) => {
                  const isLocked = !isProMode && !isHorrorMode && len === "60";
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

            {/* ⚙️ Advanced Settings (collapsible, hidden in horror mode) */}
            {!isHorrorMode && (
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen} className="rounded-2xl border border-border/40 overflow-hidden">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold rounded-none h-auto hover:bg-muted/30">
                  <span>⚙️ {locale === "tr" ? "Gelişmiş Ayarlar" : "Advanced Settings"}</span>
                  {advancedOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </Button>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-4 pt-2 space-y-5">
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
                    <ToggleGroup type="single" value={String(hookIntensity)} onValueChange={(v) => v && setHookIntensity(Number(v))} className="w-full">
                      <ToggleGroupItem value="0" className="flex-1 rounded-xl text-xs font-medium data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:border-primary/30">
                        {t("hook.low", locale)}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="2" className="flex-1 rounded-xl text-xs font-medium data-[state=on]:bg-primary/10 data-[state=on]:text-primary data-[state=on]:border-primary/30">
                        {t("hook.high", locale)}
                      </ToggleGroupItem>
                    </ToggleGroup>
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
                      <Textarea
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder={t("selector.customDesc.placeholder", locale)}
                        rows={3}
                        className="rounded-2xl border-border/60 bg-muted/30 resize-none"
                      />
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>
            )}
            {/* Generate + Bulk Pack buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                id="generate-btn"
                className={`h-14 text-base rounded-2xl font-bold flex-1 shadow-lg hover:shadow-xl transition-all ${isHorrorMode ? "bg-red-900 hover:bg-red-800 text-red-100" : ""}`}
                disabled={(isHorrorMode ? false : !topic.trim()) || loading || (!isProMode && !isHorrorMode && isAtLimit)}
                onClick={() => generateContent()}
              >
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin" />{t("btn.generating", locale)}</>
                ) : !isProMode && !isHorrorMode && isAtLimit ? (
                  <><Lock className="h-5 w-5" />{t("btn.noCredits", locale)}</>
                ) : isHorrorMode ? (
                  <><Skull className="h-5 w-5" />Generate Horror</>
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

            {/* Hook Lab dialog */}
            <HookLab
              open={hookLabOpen}
              onOpenChange={setHookLabOpen}
              topic={topic}
              language={locale}
              platform={platform}
              audience={targetAudience}
              style={style}
              onUseHook={(hookText) => {
                if (isProMode && proResult) {
                  setProResult({ ...proResult, bestHook: hookText });
                  setActiveTab("results");
                } else if (generalResult) {
                  setGeneralResult({ ...generalResult, bestHook: hookText });
                  setActiveTab("results");
                } else {
                  // No result yet — copy to clipboard for the user
                  navigator.clipboard.writeText(hookText);
                }
              }}
            />

          </div>

          {/* Duplicate Warning Banner */}
          {duplicateWarning && (
            <Alert className="rounded-2xl border-yellow-500/30 bg-yellow-500/10">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="space-y-3">
              <p className="text-sm font-semibold text-foreground">
                You generated content about this topic before.
              </p>
              <p className="text-xs text-muted-foreground">
                {duplicateWarning.date} — &quot;{duplicateWarning.topic}&quot;
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setDuplicateWarning(null);
                    generateContent(true);
                  }}
                  className="rounded-xl text-xs"
                >
                  Yes, Continue
                </Button>
                <Button
                  variant="outline"
                  size="sm"
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
                  className="rounded-xl text-xs"
                >
                  View Previous
                </Button>
              </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Discovery Results (shown in generate tab) */}
          {!loading && discoveryResult && discoveryResult.ideas?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1 flex items-center gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 text-primary" />{t("result.discovery", locale)}
              </h3>
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
          </>
          )}

          {/* ─── LOADING STATE (visible in both tabs) ─── */}
          {loading && <LoadingState mode={mode} locale={locale} />}

          {/* ─── RESULTS TAB CONTENT ─── */}
          {activeTab === "results" && !loading && (
          <div className="space-y-6">
            {/* Results header */}
            {hasResults && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-foreground">
                    {locale === "tr" ? "📦 Oluşturulan İçerik Paketi" : "📦 Generated Content Pack"}
                  </h2>
                </div>
                <Card className="rounded-2xl shadow-sm">
                <CardContent className="p-4 flex flex-wrap items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Topic</p>
                    <p className="text-sm font-bold text-foreground truncate">{topic}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-center">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Platform</p>
                      <p className="text-xs font-semibold text-foreground">{((isProMode || isHorrorMode) ? platforms : [platform]).map(p => p === "tiktok" ? "TikTok" : p === "youtube-shorts" ? "Shorts" : "Reels").join(", ")}</p>
                    </div>
                    {(generalResult?.viralAnalysis?.score || proResult?.viralAnalysis?.score) && (
                      <Badge variant="secondary" className="bg-primary/10 text-primary border-0 gap-1.5 px-3 py-1.5">
                        <TrendingUp className="h-3.5 w-3.5" />
                        {Math.round((Number(generalResult?.viralAnalysis?.score || proResult?.viralAnalysis?.score) || 0) * 10)}/100
                      </Badge>
                    )}
                  </div>
                </CardContent>
                </Card>
              </div>
            )}

            {/* Action bar */}
            {hasResults && (
              <Card className="rounded-2xl shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={copyAll}
                    className="flex-1 rounded-2xl bg-primary/10 border-primary/20 text-primary hover:bg-primary/15 h-auto py-3"
                  >
                    <Copy className="h-4 w-4" />
                    {copied === "all" ? t("btn.copied", locale) : t("btn.copyFullPack", locale)}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={downloadTxt}
                    className="rounded-2xl h-auto py-3"
                  >
                    <Download className="h-4 w-4" />
                    {t("btn.downloadTxt", locale)}
                  </Button>
                </div>
                <div className="flex justify-center gap-3 flex-wrap">
                  <Button variant="ghost" size="sm" onClick={() => setActiveTab("generate")} className="text-xs h-auto py-1">
                    <PenTool className="h-3 w-3" />{locale === "tr" ? "Düzenle" : "Edit & Regenerate"}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => generateContent()} className="text-xs h-auto py-1">
                    <RefreshCw className="h-3 w-3" />{t("btn.regenerate", locale)}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={autoFix} disabled={loading} className="text-xs text-primary hover:text-primary/80 h-auto py-1">
                    <Zap className="h-3 w-3" />{t("btn.autoFix", locale)}
                  </Button>
                  {autoFixUsed && (originalGeneralResult || originalProResult) && (
                    <Button variant="ghost" size="sm" onClick={() => setShowOriginal(!showOriginal)} className="text-xs h-auto py-1">
                      {showOriginal ? t("result.autoFixedVersion", locale) : t("result.originalVersion", locale)}
                    </Button>
                  )}
                </div>
                {autoFixImproved && (
                  <div className="flex justify-center gap-2">
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-0 text-[10px] uppercase tracking-widest font-bold rounded-full">
                      ✓ {autoFixScoreDiff > 0 ? t("badge.improvedBy", locale).replace("{x}", String(autoFixScoreDiff)) : t("badge.improved", locale)}
                    </Badge>
                  </div>
                )}
                {autoFixUsed && (originalGeneralResult || originalProResult) && !showOriginal && (
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
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
                      className="text-xs h-auto py-1"
                    >
                      {t("btn.revertOriginal", locale)}
                    </Button>
                  </div>
                )}
              </CardContent>
              </Card>
            )}

            {/* Auto-Fixed Version label */}
            {autoFixUsed && !showOriginal && hasResults && (
              <p className="text-xs font-bold uppercase tracking-widest text-primary px-1">{t("result.autoFixedVersion", locale)}</p>
            )}

            <ErrorBoundary compact resetKey={`${proResult ? "p" : "g"}-${(generalResult || proResult)?.bestHook || ""}`}>
              {!isProMode && !isHorrorMode && generalResult && !showOriginal && (
                <GeneralResults result={generalResult} copied={copied} onCopy={copyToClipboard} locale={locale} targetAudience={targetAudience} scriptLength={scriptLength} voiceSpeed={settings.voiceSpeed} />
              )}
              {(isProMode || isHorrorMode) && proResult && !showOriginal && (
                <ProResults result={proResult} platforms={platforms} copied={copied} onCopy={copyToClipboard} locale={locale} targetAudience={targetAudience} scriptLength={scriptLength} voiceSpeed={settings.voiceSpeed} />
              )}
            </ErrorBoundary>

            {/* A/B Hook Tester */}
            {hasResults && (
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

            {autoFixUsed && showOriginal && (
              <>
                <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-1">{t("result.originalVersion", locale)}
                  {originalGeneralResult?.viralAnalysis?.score || originalProResult?.viralAnalysis?.score
                    ? ` (Score: ${(originalGeneralResult?.viralAnalysis?.score || originalProResult?.viralAnalysis?.score)}/10)`
                    : ""}
                </p>
                {!isProMode && !isHorrorMode && originalGeneralResult && (
                  <GeneralResults result={originalGeneralResult} copied={copied} onCopy={copyToClipboard} locale={locale} targetAudience={targetAudience} scriptLength={scriptLength} voiceSpeed={settings.voiceSpeed} />
                )}
                {(isProMode || isHorrorMode) && originalProResult && (
                  <ProResults result={originalProResult} platforms={platforms} copied={copied} onCopy={copyToClipboard} locale={locale} targetAudience={targetAudience} scriptLength={scriptLength} voiceSpeed={settings.voiceSpeed} />
                )}
              </>
            )}

            {!hasResults && (
              <div className="text-center py-16 space-y-2">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-muted/60 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{locale === "tr" ? "Henüz sonuç yok. Önce içerik oluşturun." : "No results yet. Generate content first."}</p>
                <button onClick={() => setActiveTab("generate")} className="text-sm font-medium text-primary hover:text-primary/80 transition-colors">
                  {locale === "tr" ? "← Oluşturmaya Git" : "← Go to Generate"}
                </button>
              </div>
            )}
          </div>
          )}
            </div>{/* end left workspace */}

            {/* ── RIGHT SIDEBAR (desktop only) ── */}
            {!isMobile && (
              <aside className="hidden lg:block w-72 xl:w-80 shrink-0 space-y-6 sticky top-20 self-start max-h-[calc(100vh-6rem)] overflow-y-auto">
                {/* Trending Panel - inline */}
              <Card ref={trendingRef} className="rounded-2xl border-border/40 bg-muted/10">
                <CardContent className="p-4">
                  <TrendingPanel
                    niche={selectedPreset}
                    audience={targetAudience}
                    locale={locale}
                    onSelectTopic={(t) => setTopic(t)}
                    inline
                  />
                </CardContent>
              </Card>

                {/* Quick Tips */}
                <Card className="rounded-2xl border-border/40 bg-muted/10">
                <CardContent className="p-4 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5 mb-3">
                    <Lightbulb className="h-3.5 w-3.5 text-primary" />
                    {locale === "tr" ? "İpuçları" : "Quick Tips"}
                  </h3>
                  <div className="space-y-2">
                    <Card className="rounded-xl bg-muted/30 border-border/20 shadow-none">
                    <CardContent className="p-3">
                      <p className="text-[11px] font-medium text-foreground leading-snug">
                        {locale === "tr" ? "İlk 3 saniye hayati önem taşır" : "The first 3 seconds are critical"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {locale === "tr" ? "En güçlü hookunuzu en başa koyun." : "Place your strongest hook at the very start."}
                      </p>
                    </CardContent>
                    </Card>
                    <Card className="rounded-xl bg-muted/30 border-border/20 shadow-none">
                    <CardContent className="p-3">
                      <p className="text-[11px] font-medium text-foreground leading-snug">
                        {locale === "tr" ? "Niş kalın, geniş değil" : "Stay niche, not broad"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {locale === "tr" ? "Belirli konulardaki içerikler daha iyi performans gösterir." : "Content on specific topics performs better than generic."}
                      </p>
                    </CardContent>
                    </Card>
                    <Card className="rounded-xl bg-muted/30 border-border/20 shadow-none">
                    <CardContent className="p-3">
                      <p className="text-[11px] font-medium text-foreground leading-snug">
                        {locale === "tr" ? "Auto-Fix ile skoru yükseltin" : "Use Auto-Fix to boost score"}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {locale === "tr" ? "Sonuçtan sonra Auto-Fix ile viral skorunuzu artırın." : "After generating, use Auto-Fix to improve your viral score."}
                      </p>
                    </CardContent>
                    </Card>
                  </div>
                </CardContent>
                </Card>
              </aside>
            )}
          </div>{/* end flex */}
        </div>
      </div>
      </div>{/* end main content area */}
    </div>
  );
}
