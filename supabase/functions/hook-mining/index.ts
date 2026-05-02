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
      niche,
      topic = "",
      language = "en",
      platform = "youtube-shorts",
      audience = "global",
    } = await req.json();

    if (!niche || typeof niche !== "string") {
      return new Response(JSON.stringify({ error: "niche required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = language === "tr" ? "Turkish" : "English";
    const platformLabel =
      platform === "tiktok" ? "TikTok" :
      platform === "instagram-reels" ? "Instagram Reels" : "YouTube Shorts";

    const prompt = `You are a viral hook archaeologist. You study what's currently exploding on ${platformLabel} in the "${niche}" niche and reverse-engineer the structural patterns top creators are using THIS quarter.

NICHE: "${niche}"
${topic ? `USER'S CURRENT TOPIC: "${topic}"` : ""}
PLATFORM: ${platformLabel}
LANGUAGE: ${lang}
AUDIENCE: ${audience}

TASK: Mine 8 hook STRUCTURAL PATTERNS that top ${niche} creators are riding right now (recent quarter), then for EACH pattern produce a ready-to-use hook ${topic ? `applied to the user's topic ("${topic}")` : "applied to a fresh angle inside the niche"}.

RULES:
1. Each pattern must be DISTINCT — no two patterns can be near-duplicates.
2. Patterns must reflect CURRENT short-form trends (callouts, stitch-bait, contrarian POVs, "I tried", "we tested", whisper-reveal, day-N challenges, anti-influencer, before/after, etc.) — not generic 2019 advice.
3. For each pattern, give:
   - patternName: short label (2-4 words)
   - structure: the abstract template (e.g. "[Authority figure] told me X. They were wrong because [reversal].")
   - whyWorking: 1 sentence on the psychology of why this is winning right now
   - exampleHook: a fully written hook (max 14 words) using the pattern, in ${lang}
   - heat: integer 1-10 estimating how hot the pattern is right now
4. NO banned clichés: "you won't believe", "POV:", "wait for it", "this changed everything".
5. Hooks must be SHORT, punchy, and pattern-interrupt first.
6. Return strongest patterns first (sort by heat descending).

Bonus: include 3 OVERUSED patterns to AVOID (with a 1-line reason each).`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a viral hook archaeologist. Output only via the provided tool." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_mining",
            description: "Return current top hook patterns and patterns to avoid",
            parameters: {
              type: "object",
              properties: {
                patterns: {
                  type: "array",
                  minItems: 8, maxItems: 8,
                  items: {
                    type: "object",
                    properties: {
                      patternName: { type: "string" },
                      structure: { type: "string" },
                      whyWorking: { type: "string" },
                      exampleHook: { type: "string" },
                      heat: { type: "integer", minimum: 1, maximum: 10 },
                    },
                    required: ["patternName", "structure", "whyWorking", "exampleHook", "heat"],
                    additionalProperties: false,
                  },
                },
                avoid: {
                  type: "array",
                  minItems: 3, maxItems: 3,
                  items: {
                    type: "object",
                    properties: {
                      pattern: { type: "string" },
                      reason: { type: "string" },
                    },
                    required: ["pattern", "reason"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["patterns", "avoid"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_mining" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("hook-mining AI error", aiResp.status, txt);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway: ${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const args = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let parsed: any = null;
    if (args) { try { parsed = JSON.parse(args); } catch (e) { console.error(e); } }
    if (!parsed?.patterns?.length) throw new Error("No patterns returned");

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("hook-mining error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});