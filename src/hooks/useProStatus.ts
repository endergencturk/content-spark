import { useState, useEffect } from "react";
import { toast } from "sonner";

const PRO_KEY = "is_pro";
const GUMROAD_URL = "https://endergenctuerk.gumroad.com/l/fiblfb";

export function useProStatus() {
  const [isPro, setIsPro] = useState(() => localStorage.getItem(PRO_KEY) === "true");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Admin bypass
    if (params.get("admin") === "true") {
      localStorage.setItem(PRO_KEY, "true");
      setIsPro(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("admin");
      window.history.replaceState({}, "", url.pathname + url.search);
      toast.success("🔑 Admin Pro access activated");
      return;
    }

    // Gumroad success redirect
    if (params.get("success") === "true") {
      localStorage.setItem(PRO_KEY, "true");
      setIsPro(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      window.history.replaceState({}, "", url.pathname + url.search);
      toast.success("🎉 Pro unlocked successfully", {
        description: "You now have access to advanced hooks, voiceover-ready scripts, editing plans, and more.",
        duration: 6000,
      });
    }
  }, []);

  const openGumroad = () => {
    window.open(GUMROAD_URL, "_blank");
  };

  const resetPro = () => {
    localStorage.removeItem(PRO_KEY);
    setIsPro(false);
  };

  return { isPro, openGumroad, resetPro };
}
