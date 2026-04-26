import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  darker: "Make the entire script DARKER and more ominous. Increase tension. Use shorter, sharper sentences. Add unsettling imagery. Pull the camera closer to dread.",
  funnier: "Make the script FUNNIER while keeping the core information. Add deadpan beats, unexpected punchlines, ironic asides. Keep the hook intact.",
  shocking: "Make the script MORE SHOCKING. Front-load the most extreme facts. Use stronger contrast. Make the viewer audibly react every 5-7 seconds.",
  emotional: "Make the script MORE EMOTIONAL. Add a personal stake. Slow down for the heart-punch lines. End on a feeling, not a fact.",
  faster: "Make the script FASTER paced. Cut filler ruthlessly. One idea per line. Punch-cut sentences. Keep all key facts but compress 30%.",
  controversial: "Make the script MORE CONTROVERSIAL. Take a polarizing stance. Challenge the audience's assumptions. Force them to comment.",
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

    const { script, tone, language = "en", scriptLength = "30" } = await req.json();
    if (!script || typeof script !== "string" || script.trim().length < 30) {
      return new Response(JSON.stringify({ error: "script (min 30 chars) required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const toneInstr = TONE_INSTRUCTIONS[tone];
    if (!toneInstr) {
      return new Response(JSON.stringify({ error: "Invalid tone. Allowed: darker|funnier|shocking|emotional|faster|controversial" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = language === "tr" ? "Turkish" : "English";
    const wordTarget =
      scriptLength === "15" ? "40-50 words"
      : scriptLength === "60" ? "150-180 words"
      : "85-100 words";

    const prompt = `You are a viral script remixer. Rewrite the script below following the tone instruction. Keep the topic and core facts intact.

TONE INSTRUCTION:
${toneInstr}

RULES:
- Output language: ${lang}
- Target length: ${wordTarget} (for ${scriptLength}s video)
- Keep the 4-part structure: Hook → Build-up → Reveal → Loop ending
- First line MAX 3 words (hook disruptor)
- No markdown, no labels like "HOOK:" — pure spoken voiceover text
- Final line should loop back to the opening

ORIGINAL SCRIPT:
"""
${script.slice(0, 4000)}
"""

Return strictly: { "script": "the full rewritten voiceover text" }`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a viral video script remixer. Output only valid JSON." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_script",
            description: "Return the remixed script",
            parameters: {
              type: "object",
              properties: { script: { type: "string" } },
              required: ["script"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_script" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("script-remix AI error", aiResp.status, txt);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway: ${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const args = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let newScript = "";
    if (args) {
      try {
        const p = JSON.parse(args);
        if (typeof p.script === "string") newScript = p.script.trim();
      } catch (e) { console.error(e); }
    }
    if (!newScript) throw new Error("No remixed script returned");

    return new Response(JSON.stringify({ script: newScript, tone }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("script-remix error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});