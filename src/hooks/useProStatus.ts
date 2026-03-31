import { useState, useEffect } from "react";

const PRO_KEY = "is_pro";
const GUMROAD_URL = "https://endergenctuerk.gumroad.com/l/fiblfb";

export function useProStatus() {
  const [isPro, setIsPro] = useState(() => localStorage.getItem(PRO_KEY) === "true");

  // Check for ?success=true on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      localStorage.setItem(PRO_KEY, "true");
      setIsPro(true);
      // Clean URL
      const url = new URL(window.location.href);
      url.searchParams.delete("success");
      window.history.replaceState({}, "", url.pathname + url.search);
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
