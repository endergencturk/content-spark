import { useAuth } from "@/contexts/AuthContext";
import { UpgradeContactDialog } from "./UpgradeContactDialog";

/** Mounted once at the app root so any component can call `setShowUpgradeDialog(true)`. */
export function GlobalUpgradeDialog() {
  const { showUpgradeDialog, setShowUpgradeDialog } = useAuth();
  return <UpgradeContactDialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog} />;
}
