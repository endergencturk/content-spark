import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { visual, overlay, style = "cinematic" } = await req.json();
    if (!visual || typeof visual !== "string") {
      return new Response(JSON.stringify({ error: "visual required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const styleSuffix: Record<string, string> = {
      cinematic: "shot on Arri Alexa, anamorphic lens flare, shallow depth of field, color-graded cinematic look, photorealistic",
      cartoon: "anime / Studio Ghibli inspired illustration, cel-shaded, expressive saturated colors, clean bold outlines",
      horror: "psychological horror aesthetic, deep blacks, charcoal grays, single cold blue or blood-red accent only, volumetric fog, single chiaroscuro light source, eerie uncanny mood",
      "3d": "high-quality 3D render, Pixar / DreamWorks animation aesthetic, soft volumetric lighting, polished materials, cinematic depth of field",
    };
    const styleLine = styleSuffix[style] || styleSuffix.cinematic;

    const overlayLine = overlay
      ? `\n\nBold high-contrast overlay text reading "${overlay.toString().toUpperCase()}" in the upper third — thick sans-serif, drop shadow, ultra-readable at thumbnail size.`
      : "";

    const prompt = `Vertical 9:16 mobile-first thumbnail for short-form video. ${visual}\n\nStyle: ${styleLine}. Single clear focal subject, no clutter, high contrast against dark background. No faces, no identifiable people, no portraits — use silhouettes, hands, objects, or environments only.${overlayLine}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.1-flash-image",
        messages: [{ role: "user", content: prompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("generate-thumbnail-image AI error", aiResp.status, txt);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway: ${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const b64 = aiJson?.data?.[0]?.b64_json;
    if (!b64) throw new Error("No image returned");

    return new Response(JSON.stringify({ image: `data:image/png;base64,${b64}` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-thumbnail-image error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});