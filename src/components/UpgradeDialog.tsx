import { memo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Zap, Target, Film, Mic, CalendarClock, Image, Sparkles, SlidersHorizontal } from "lucide-react";

const FEATURES = [
  { icon: Target, label: "10 higher-converting hook variations" },
  { icon: Mic, label: "Voiceover-ready structured scripts" },
  { icon: Film, label: "Scene-by-scene editing plan" },
  { icon: Sparkles, label: "Advanced styles (Suspense, Emotional, etc.)" },
  { icon: SlidersHorizontal, label: "Custom video description input" },
  { icon: Image, label: "Up to 10 cinematic image prompts" },
  { icon: CalendarClock, label: "Posting strategy & timing" },
  { icon: Zap, label: "Unlimited daily generations" },
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
          <DialogTitle className="text-xl font-bold">Upgrade to Pro</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
            {trigger || "Get access to the full content pipeline — better hooks, editing plans, and more."}
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
              window.open("https://endergenctuerk.gumroad.com/l/fiblfb", "_blank");
              onOpenChange(false);
            }}
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade Now
          </Button>
          <p className="text-center text-[11px] text-muted-foreground">
            Creators using Pro get 3× better results
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
});
