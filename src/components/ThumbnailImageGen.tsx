import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Wand2, Download, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import type { Locale } from "@/lib/i18n";

interface Props {
  visual: string;
  overlay?: string;
  index: number;
  locale: Locale;
}

export function ThumbnailImageGen({ visual, overlay, index, locale }: Props) {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const { user, planType, setShowAuthModal } = useAuth();
  const { imageStyle } = useSettings();
  const isTr = locale === "tr";
  const isPro = planType === "pro";

  const run = async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!isPro) {
      toast.info(isTr ? "Gerçek thumbnail üretimi Pro'ya özel." : "Real thumbnail generation is Pro-only.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-thumbnail-image", {
        body: { visual, overlay, style: imageStyle },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setImage((data as any).image);
      toast.success(isTr ? "Thumbnail hazır" : "Thumbnail ready");
    } catch (e: any) {
      toast.error(e?.message || (isTr ? "Üretim başarısız" : "Generation failed"));
    } finally {
      setLoading(false);
    }
  };

  const download = () => {
    if (!image) return;
    const a = document.createElement("a");
    a.href = image;
    a.download = `thumbnail-${index + 1}.png`;
    a.click();
  };

  return (
    <div className="space-y-2 pt-2 border-t border-border/30">
      {image ? (
        <div className="space-y-2">
          <div className="relative rounded-xl overflow-hidden bg-black/40 max-w-[220px] mx-auto">
            <img src={image} alt={`Thumbnail ${index + 1}`} className="w-full aspect-[9/16] object-cover" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={run} disabled={loading} className="flex-1 h-8 text-xs">
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
              {isTr ? "Yeniden Üret" : "Regenerate"}
            </Button>
            <Button size="sm" onClick={download} className="flex-1 h-8 text-xs">
              <Download className="h-3 w-3" />
              {isTr ? "İndir" : "Download"}
            </Button>
          </div>
        </div>
      ) : (
        <Button
          size="sm"
          variant="outline"
          onClick={run}
          disabled={loading}
          className="w-full h-8 text-xs rounded-lg border-primary/40 hover:bg-primary/10"
        >
          {loading ? (
            <><Loader2 className="h-3 w-3 animate-spin" />{isTr ? "Üretiliyor…" : "Generating…"}</>
          ) : (
            <>
              {isPro ? <Wand2 className="h-3 w-3 text-primary" /> : <Crown className="h-3 w-3 text-primary" />}
              {isTr ? "Gerçek Thumbnail Üret" : "Generate Real Thumbnail"}
              {!isPro && <span className="ml-1 text-[9px] font-bold uppercase text-primary">Pro</span>}
            </>
          )}
        </Button>
      )}
    </div>
  );
}