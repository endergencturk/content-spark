import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NICHE_GUIDANCE: Record<string, string> = {
  mystery: "true crime, unsolved disappearances, cold cases, conspiracies grounded in real reports",
  educational: "psychology, science, neuroscience, productivity hacks, counterintuitive facts",
  motivation: "mindset shifts, success stories, hard truths, brutal advice",
  horror: "real reported paranormal incidents, urban legends, scary places — no gore details",
  finance: "wealth psychology, money mindset, investing stories, business shockers",
  fitness: "fitness myths debunked, body science, nutrition shockers, workout hacks",
  conspiracy: "real declassified files, suppressed history, hidden tech, suspicious deaths — no extremist or violent content",
  paranormal: "ghost reports, near-death experiences, unexplained CCTV, missing 411 cases",
  "tech-ai": "AI breakthroughs, big tech secrets, future predictions, surveillance, AI risks",
  space: "NASA discoveries, exoplanets, cosmic mysteries, astronaut stories, deep space facts",
  history: "dark historical events, lost civilizations, suppressed inventions, brutal practices — educational tone",
  storytime: "shocking personal stories, betrayal, twists, family secrets, life-changing moments — first person POV",
};

function buildPrompt(niche: string, nicheLabel: string, language: string, targetAudience: string, count: number) {
  const lang = language === "tr" ? "Turkish" : "English";
  const audienceMap: Record<string, string> = {
    global: "global English-speaking audience",
    usa: "American audience (US references, US English)",
    europe: "European audience",
    "latin-america": "Latin American audience",
    turkey: "Turkish audience (Turkish cultural references)",
  };
  const audience = audienceMap[targetAudience] || "global audience";
  const guidance = NICHE_GUIDANCE[niche] || nicheLabel;

  return `You generate viral short-form video TOPIC IDEAS for ${audience}.
Niche: ${nicheLabel} (${guidance})
Output language: ${lang}

Generate ${count} EXTREMELY scroll-stopping topic ideas. Each topic must:
- Be ONE sentence, max 12 words
- Spark immediate curiosity (use specific numbers, places, dates, or shocking claims)
- NOT be a generic tip or "X reasons why" listicle
- Feel like a TikTok/YouTube Shorts hook ready to go viral
- Be FRESH — avoid the most overused topics in this niche
- Be plausibly real (no fabricated quotes from public figures)

STRICT RULES:
- No emojis in topics
- No quotes around the topics
- No numbering like "1." — return clean strings only
- ${language === "tr" ? "TÜM topic'ler Türkçe olmalı" : "ALL topics in English"}

Return ONLY a JSON object: { "topics": ["topic 1", "topic 2", ...] }`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth required ─────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const { niche, nicheLabel, language = "en", targetAudience = "global", count = 8 } = await req.json();
    if (!niche || !nicheLabel) {
      return new Response(JSON.stringify({ error: "niche and nicheLabel required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeCount = Math.max(3, Math.min(12, Number(count) || 8));
    const prompt = buildPrompt(String(niche), String(nicheLabel), String(language), String(targetAudience), safeCount);

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a viral content topic generator. You only output valid JSON, no preamble." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_topics",
            description: "Return the list of viral topic ideas",
            parameters: {
              type: "object",
              properties: {
                topics: { type: "array", items: { type: "string" }, minItems: safeCount, maxItems: safeCount },
              },
              required: ["topics"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_topics" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, txt);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit, try again in a moment" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResp.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway: ${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const toolCall = aiJson?.choices?.[0]?.message?.tool_calls?.[0];
    let topics: string[] = [];
    if (toolCall?.function?.arguments) {
      try {
        const parsed = JSON.parse(toolCall.function.arguments);
        if (Array.isArray(parsed.topics)) topics = parsed.topics.filter((t: any) => typeof t === "string");
      } catch (e) {
        console.error("Tool args parse error", e);
      }
    }

    if (topics.length === 0) {
      // Fallback: try parsing message content as JSON
      const content = aiJson?.choices?.[0]?.message?.content;
      if (typeof content === "string") {
        try {
          const m = content.match(/\{[\s\S]*\}/);
          if (m) {
            const parsed = JSON.parse(m[0]);
            if (Array.isArray(parsed.topics)) topics = parsed.topics.filter((t: any) => typeof t === "string");
          }
        } catch {}
      }
    }

    if (topics.length === 0) {
      throw new Error("No topics returned from AI");
    }

    return new Response(JSON.stringify({ topics }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-topics error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});