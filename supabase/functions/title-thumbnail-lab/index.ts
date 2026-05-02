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

    const {
      topic,
      hook,
      language = "en",
      platform = "youtube-shorts",
      audience = "global",
      imageStyle = "cinematic",
    } = await req.json();

    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "topic required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = language === "tr" ? "Turkish" : "English";
    const platformLabel =
      platform === "tiktok" ? "TikTok" :
      platform === "instagram-reels" ? "Instagram Reels" : "YouTube Shorts";

    const styleSuffix: Record<string, string> = {
      cinematic: "shot on Arri Alexa, anamorphic lens flare, shallow depth of field, color-graded cinematic look, photorealistic",
      cartoon: "anime / Studio Ghibli inspired illustration, cel-shaded, expressive saturated colors, clean bold outlines",
      horror: "psychological horror aesthetic, deep blacks, charcoal grays, single cold blue or blood-red accent only, volumetric fog, single chiaroscuro light source, eerie uncanny mood",
      "3d": "high-quality 3D render, Pixar / DreamWorks animation aesthetic, soft volumetric lighting, polished materials, cinematic depth of field",
    };
    const styleLine = styleSuffix[imageStyle] || styleSuffix.cinematic;

    const prompt = `You are the world's #1 ${platformLabel} title strategist and thumbnail art director. You've engineered titles & thumbnails for channels with 10M+ subs.

TOPIC: "${topic}"
${hook ? `WORKING HOOK: "${hook}"` : ""}
PLATFORM: ${platformLabel}
LANGUAGE: ${lang}
AUDIENCE: ${audience}
IMAGE STYLE: ${imageStyle} — ${styleLine}

TASK: Produce a complete A/B testing pack:
- 5 TITLE variants (each engineered for a different psychological lever)
- 5 THUMBNAIL CONCEPTS (each paired logically with a title)
- A WINNER pick with reasoning

=== TITLE RULES (NON-NEGOTIABLE) ===
1. Max 60 characters. Front-load the keyword/payoff in the first 30.
2. NO clickbait clichés: "you won't believe", "shocking", "this changed everything", "gone wrong".
3. Each title must use a DIFFERENT lever — do not repeat the same trick.
4. Specific numbers > vague adjectives. ("47 hours" beats "a long time".)
5. Imply, don't reveal — the title must withhold the payoff.
6. ${platform === "youtube-shorts" ? "Include 1-2 search keywords near the front." : "Conversational opener acceptable, sound-driven."}

TITLE LEVERS (use one per variant — do not repeat):
- A) Curiosity Gap (open loop)
- B) Specificity Bomb (number/date/place)
- C) Stakes Reveal (what could be lost)
- D) Contrast / Reversal ("Everyone thinks X. It's actually Y.")
- E) Identity / Status hook (in-group / aspiration)

=== THUMBNAIL RULES (NON-NEGOTIABLE) ===
1. ${platform === "youtube-shorts" ? "Vertical 9:16 framing." : "Vertical 9:16, mobile-first."}
2. NO faces, NO identifiable people, NO portraits. (Use silhouettes, hands, objects, environments.)
3. Maximum 3 words of overlay text. Bold, high-contrast, readable at thumbnail size.
4. ONE clear focal subject. No clutter.
5. Color must contrast with platform feed (avoid pure white/grey backgrounds).
6. Style locked to: ${styleLine}.
7. Each thumbnail concept must include: a one-sentence visual prompt + a 1-3 word overlay text + an emotional driver (curiosity / fear / awe / desire).

=== CTR FORECAST ===
Score each title-thumbnail PAIR on predicted CTR vs platform baseline:
- 90-100: Top 1% — outperforms baseline by 3x+
- 75-89: Top 10% — strong outperform
- 60-74: Above average
- <60: Rewrite

Pick the WINNER and explain in 1 sentence WHY it will outperform the others.`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are an elite YouTube/TikTok title & thumbnail strategist. Output only via the provided tool." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_lab",
            description: "Return 5 title+thumbnail variants with CTR scores and a winner pick",
            parameters: {
              type: "object",
              properties: {
                variants: {
                  type: "array",
                  minItems: 5, maxItems: 5,
                  items: {
                    type: "object",
                    properties: {
                      lever: { type: "string", enum: ["Curiosity Gap", "Specificity Bomb", "Stakes Reveal", "Contrast", "Identity"] },
                      title: { type: "string" },
                      thumbnail: {
                        type: "object",
                        properties: {
                          visual: { type: "string", description: "Single-sentence image generation prompt, 9:16, no faces" },
                          overlay: { type: "string", description: "1-3 words of bold overlay text" },
                          driver: { type: "string", enum: ["curiosity", "fear", "awe", "desire", "shock"] },
                        },
                        required: ["visual", "overlay", "driver"],
                        additionalProperties: false,
                      },
                      ctrScore: { type: "integer", minimum: 0, maximum: 100 },
                      reason: { type: "string", description: "Why this pair will perform — 1 sentence" },
                    },
                    required: ["lever", "title", "thumbnail", "ctrScore", "reason"],
                    additionalProperties: false,
                  },
                },
                winnerIndex: { type: "integer", minimum: 0, maximum: 4 },
                winnerWhy: { type: "string" },
              },
              required: ["variants", "winnerIndex", "winnerWhy"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_lab" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("title-thumbnail-lab AI error", aiResp.status, txt);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway: ${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const args = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = null;
    if (args) { try { parsed = JSON.parse(args); } catch (e) { console.error(e); } }
    if (!parsed?.variants?.length) throw new Error("No variants returned");

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("title-thumbnail-lab error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});