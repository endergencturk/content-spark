import { useState, useEffect } from "react";
import { toast } from "sonner";

const PRO_KEY = "is_pro";
const ADMIN_KEY = "is_admin_preview";
const GUMROAD_URL = "https://endergenctuerk.gumroad.com/l/fiblfb";

export function useProStatus() {
  const [isPro, setIsPro] = useState(() => localStorage.getItem(PRO_KEY) === "true");
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem(ADMIN_KEY) === "true");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const url = new URL(window.location.href);
    let changed = false;

    if (params.get("admin") === "true") {
      localStorage.setItem(ADMIN_KEY, "true");
      setIsAdmin(true);
      url.searchParams.delete("admin");
      changed = true;
      toast.success("🔑 Admin preview activated");
    }

    if (params.get("success") === "true") {
      localStorage.setItem(PRO_KEY, "true");
      setIsPro(true);
      url.searchParams.delete("success");
      changed = true;
      toast.success("🎉 Pro unlocked successfully", {
        description: "You now have access to advanced hooks, voiceover-ready scripts, editing plans, and more.",
        duration: 6000,
      });
    }

    if (changed) {
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);

  const hasProAccess = isPro || isAdmin;

  const openGumroad = () => {
    window.open(GUMROAD_URL, "_blank");
  };

  const resetPro = () => {
    localStorage.removeItem(PRO_KEY);
    localStorage.removeItem(ADMIN_KEY);
    setIsPro(false);
    setIsAdmin(false);
  };

  return { isPro: hasProAccess, isAdmin, openGumroad, resetPro };
}

