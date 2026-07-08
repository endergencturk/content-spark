import React, { memo, useEffect, useMemo, useState } from "react";
import { Gift, Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { grantBonusCredits } from "@/hooks/useUsageLimit";
import type { Locale } from "@/lib/i18n";

const REDEEMED_KEY = "cs-referral-redeemed"; // list of ref codes we've already used
const OWN_CODE_KEY = "cs-referral-my-code";
const WINS_KEY = "cs-referral-wins"; // count of friends who joined via our link
const BONUS_PER_REFERRAL = 3;

function codeFromId(id: string): string {
  // 6-char base36 hash from a UUID/device-id
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase().padStart(6, "0").slice(0, 6);
}

function loadList(key: string): string[] {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

function loadWins(): number {
  try { return parseInt(localStorage.getItem(WINS_KEY) || "0", 10) || 0; } catch { return 0; }
}

interface Props {
  deviceId: string;
  locale: Locale;
}

export const ReferralCard = memo(function ReferralCard({ deviceId, locale }: Props) {
  const myCode = useMemo(() => {
    const existing = localStorage.getItem(OWN_CODE_KEY);
    if (existing) return existing;
    const code = codeFromId(deviceId);
    localStorage.setItem(OWN_CODE_KEY, code);
    return code;
  }, [deviceId]);

  const [wins, setWins] = useState<number>(loadWins);
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/app?ref=${myCode}`;
  }, [myCode]);

  // Auto-redeem inbound ?ref= on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const inbound = url.searchParams.get("ref");
    if (!inbound) return;

    const cleanUrl = () => {
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.toString());
    };

    if (inbound.toUpperCase() === myCode) { cleanUrl(); return; }
    const redeemed = loadList(REDEEMED_KEY);
    if (redeemed.includes(inbound.toUpperCase())) { cleanUrl(); return; }

    redeemed.push(inbound.toUpperCase());
    localStorage.setItem(REDEEMED_KEY, JSON.stringify(redeemed));
    grantBonusCredits(BONUS_PER_REFERRAL);
    toast.success(
      locale === "tr"
        ? `🎁 +${BONUS_PER_REFERRAL} bonus kredi kazandın!`
        : `🎁 You got +${BONUS_PER_REFERRAL} bonus credits!`,
      { duration: 4000 }
    );
    cleanUrl();
  }, [myCode, locale]);

  // Listen for wins toasts from elsewhere (kept simple: manual bump via storage event)
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === WINS_KEY) setWins(loadWins());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(locale === "tr" ? "Bağlantı kopyalandı" : "Link copied");
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error(locale === "tr" ? "Kopyalanamadı" : "Copy failed");
    }
  };

  const share = async () => {
    const text = locale === "tr"
      ? `Content Spark ile viral kısa video scriptleri üret. Bağlantımla +${BONUS_PER_REFERRAL} bonus kredi kazan:`
      : `Generate viral short-video scripts with Content Spark. Get +${BONUS_PER_REFERRAL} bonus credits with my link:`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Content Spark", text, url: shareUrl });
        return;
      } catch { /* user cancelled */ }
    }
    copy();
  };

  return (
    <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-card/40 to-emerald-500/5 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Gift className="h-3.5 w-3.5 text-emerald-400" />
          <span className="text-[10px] uppercase tracking-widest font-bold text-emerald-300">
            {locale === "tr" ? "Arkadaş Davet Et" : "Refer a Friend"}
          </span>
        </div>
        {wins > 0 && (
          <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 px-1.5 py-0.5 rounded-md">
            {wins} {locale === "tr" ? "kazanım" : "wins"}
          </span>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground leading-snug">
        {locale === "tr"
          ? `Bağlantını paylaş — her katılanla ikinize de +${BONUS_PER_REFERRAL} bonus kredi.`
          : `Share your link — you both get +${BONUS_PER_REFERRAL} bonus credits per friend.`}
      </p>

      <div className="flex items-center gap-1.5 rounded-lg bg-background/60 border border-border/50 px-2 py-1.5">
        <code className="flex-1 text-[11px] font-mono font-bold text-foreground truncate">
          {myCode}
        </code>
        <button
          onClick={copy}
          className="h-6 w-6 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
          title={locale === "tr" ? "Bağlantıyı kopyala" : "Copy link"}
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
        </button>
      </div>

      <button
        onClick={share}
        className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-[11px] font-semibold text-emerald-200 transition-colors"
      >
        <Share2 className="h-3 w-3" />
        {locale === "tr" ? "Bağlantıyı Paylaş" : "Share Link"}
      </button>
    </div>
  );
});
