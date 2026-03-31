import { memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Target, Film, Mic, Image, Sparkles } from "lucide-react";
import { PAYMENTS_ENABLED } from "@/hooks/useProStatus";

const FEATURES = [
  { icon: Sparkles, label: "Advanced viral styles (emotional, suspense, controversy)" },
  { icon: Target, label: "High-converting hooks (10 variations)" },
  { icon: Film, label: "Scene-by-scene editing plans" },
  { icon: Mic, label: "Advanced storytelling & selling scripts" },
  { icon: Image, label: "Up to 10 cinematic image prompts" },
  { icon: Zap, label: "Unlimited generations" },
];

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: string;
}

export const UpgradeDialog = memo(function UpgradeDialog({
  open,
  onOpenChange,
  trigger,
}: UpgradeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-3xl p-6">
        <DialogHeader className="text-center items-center space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Crown className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold">
            {PAYMENTS_ENABLED ? "Unlock Pro" : "Pro Features"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {trigger || "Upgrade to create content that actually performs."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 pt-2">
          {FEATURES.map((f) => (
            <div key={f.label} className="flex items-center gap-3 px-1">
              <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <f.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="text-sm text-foreground font-medium">{f.label}</p>
            </div>
          ))}
        </div>

        <div className="pt-4 space-y-2.5">
          <Button
            className="w-full h-12 rounded-2xl text-base font-bold"
            onClick={() => {
              if (PAYMENTS_ENABLED) {
                window.open("https://endergenctuerk.gumroad.com/l/fiblfb", "_blank");
              }
              onOpenChange(false);
            }}
          >
            <Crown className="h-4 w-4 mr-2" />
            {PAYMENTS_ENABLED ? "Upgrade Now" : "Coming Soon"}
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            {PAYMENTS_ENABLED ? "Creators using Pro get 3× better results" : "Preview mode — payments temporarily disabled"}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});
