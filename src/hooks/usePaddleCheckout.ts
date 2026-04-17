import { useState } from "react";
import { initializePaddle, getPaddlePriceId } from "@/lib/paddle";
import { toast } from "sonner";

interface CheckoutOptions {
  priceId: string;
  customerEmail?: string;
  userId?: string;
  successUrl?: string;
}

export function usePaddleCheckout() {
  const [loading, setLoading] = useState(false);

  const openCheckout = async (options: CheckoutOptions) => {
    setLoading(true);
    try {
      await initializePaddle();
      const paddlePriceId = await getPaddlePriceId(options.priceId);

      window.Paddle.Checkout.open({
        items: [{ priceId: paddlePriceId, quantity: 1 }],
        customer: options.customerEmail ? { email: options.customerEmail } : undefined,
        customData: options.userId ? { userId: options.userId } : undefined,
        settings: {
          displayMode: "overlay",
          successUrl: options.successUrl || `${window.location.origin}/app?checkout=success`,
          allowLogout: false,
          variant: "one-page",
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Checkout failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return { openCheckout, loading };
}
