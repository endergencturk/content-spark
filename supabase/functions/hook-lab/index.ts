import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANGLES = [
  { id: "shock",      label: "Shock",      desc: "Open with a brutal, undeniable fact that breaks the scroll." },
  { id: "curiosity",  label: "Curiosity",  desc: "Tease an unanswered mystery the viewer needs resolved." },
  { id: "fear",       label: "Fear",       desc: "Trigger primal threat detection — danger, loss, exposure." },
  { id: "controversy",label: "Controversy",desc: "Take a polarizing stance most people won't say out loud." },
  { id: "authority",  label: "Authority",  desc: "Open as the insider, expert, or whistleblower." },
  { id: "story",      label: "Story",      desc: "Drop straight into a personal narrative mid-action." },
  { id: "question",   label: "Question",   desc: "Ask a question the viewer cannot ignore." },
  { id: "contrast",   label: "Contrast",   desc: "Two opposing facts smashed together (then vs now, A vs B)." },
  { id: "stat",       label: "Stat Bomb",  desc: "Lead with a stunning specific number or percentage." },
  { id: "secret",     label: "Forbidden",  desc: "Frame the topic as suppressed knowledge." },
];

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

    const { topic, language = "en", platform = "tiktok" } = await req.json();
    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "topic required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = language === "tr" ? "Turkish" : "English";

    const prompt = `You are a viral hook engineer. Topic: "${topic}". Platform: ${platform}.

Generate exactly 10 hook variations — ONE per psychological angle below. Each hook must:
- Be MAX 14 words total
- Open with a 1-3 word disruptor (a punch, not a sentence)
- Avoid clickbait clichés ("you won't believe", "wait for it")
- Be in ${lang}
- Match the angle's emotional intent precisely

ANGLES:
${ANGLES.map((a, i) => `${i + 1}. ${a.label} — ${a.desc}`).join("\n")}

Return strictly: { "hooks": [{ "angle": "Shock", "text": "..." }, ... 10 items in the same order] }`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a viral hook engineer. Output only valid JSON." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_hooks",
            description: "Return 10 hook variations",
            parameters: {
              type: "object",
              properties: {
                hooks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      angle: { type: "string" },
                      text: { type: "string" },
                    },
                    required: ["angle", "text"],
                    additionalProperties: false,
                  },
                  minItems: 10, maxItems: 10,
                },
              },
              required: ["hooks"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "return_hooks" } },
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      console.error("hook-lab AI error", aiResp.status, txt);
      if (aiResp.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (aiResp.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`AI gateway: ${aiResp.status}`);
    }

    const aiJson = await aiResp.json();
    const args = aiJson?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    let hooks: any[] = [];
    if (args) {
      try { const p = JSON.parse(args); if (Array.isArray(p.hooks)) hooks = p.hooks; } catch (e) { console.error(e); }
    }
    if (hooks.length === 0) throw new Error("No hooks returned");

    return new Response(JSON.stringify({ hooks, angles: ANGLES }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("hook-lab error", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});