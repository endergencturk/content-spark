import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ANGLES = [
  { id: "shock",       label: "Shock",        desc: "Open with a brutal, undeniable fact that breaks the scroll.",        formula: "Disruptor + extreme fact" },
  { id: "curiosity",   label: "Curiosity",    desc: "Tease an unanswered mystery the viewer needs resolved.",             formula: "Setup + open loop" },
  { id: "fear",        label: "Fear",         desc: "Trigger primal threat detection — danger, loss, exposure.",          formula: "Threat + proximity" },
  { id: "controversy", label: "Controversy",  desc: "Take a polarizing stance most people won't say out loud.",           formula: "Forbidden opinion + receipts" },
  { id: "authority",   label: "Authority",    desc: "Open as the insider, expert, or whistleblower.",                     formula: "Credential + leak" },
  { id: "story",       label: "Story",        desc: "Drop straight into a personal narrative mid-action.",                formula: "In medias res + sensory" },
  { id: "question",    label: "Question",     desc: "Ask a question the viewer cannot ignore.",                           formula: "Identity question + tension" },
  { id: "contrast",    label: "Contrast",     desc: "Two opposing facts smashed together (then vs now, A vs B).",         formula: "Before/after collision" },
  { id: "stat",        label: "Stat Bomb",    desc: "Lead with a stunning specific number or percentage.",                formula: "Specific number + payoff tease" },
  { id: "secret",      label: "Forbidden",    desc: "Frame the topic as suppressed knowledge.",                           formula: "Hidden knowledge + reveal promise" },
  { id: "list",        label: "Numbered List", desc: "Promise a finite, ranked countdown viewers must finish to see #1.", formula: "N reasons / things + ranked promise" },
  { id: "cliffhanger", label: "Cliffhanger",  desc: "Open mid-event at the highest tension moment, then cut.",            formula: "Mid-action freeze + delayed payoff" },
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

    const {
      topic,
      language = "en",
      platform = "tiktok",
      audience = "global",
      style = "viral",
    } = await req.json();
    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "topic required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = language === "tr" ? "Turkish" : "English";

    const platformGuidance: Record<string, string> = {
      tiktok:           "TikTok — raw, conversational, pattern-interrupt FIRST WORD. No polish. Sound-driven.",
      "youtube-shorts": "YouTube Shorts — slightly more setup OK (search-friendly keyword in first 5 words), retention-engineered.",
      "instagram-reels":"Instagram Reels — visually evocative, aesthetic-aware, identity/aspiration-coded.",
    };
    const platformLine = platformGuidance[platform] || platformGuidance.tiktok;

    const audienceLine = audience && audience !== "global"
      ? `Audience: ${audience} — adapt cultural references, idioms, and emotional triggers accordingly.`
      : `Audience: Global — use universal references, avoid region-locked slang.`;

    const prompt = `You are the world's #1 viral hook engineer. You've written hooks for accounts with 100M+ views.

TOPIC: "${topic}"
PLATFORM: ${platformLine}
${audienceLine}
STYLE TONE: ${style}

Generate exactly 12 hook variations — ONE per psychological angle below. For EACH hook, you must also score and diagnose it.

HARD RULES (violate any → useless hook):
1. MAX 14 words total. Shorter wins.
2. First 1-3 words MUST be a pattern interrupt (a punch, not a setup phrase).
3. NO banned clichés: "you won't believe", "wait for it", "this changed everything", "POV:", "tell me why", "the truth about".
4. NO vague words ("things", "stuff", "amazing", "incredible", "crazy") — be SPECIFIC.
5. Every hook must create a CURIOSITY GAP — the viewer MUST know what comes next.
6. Language: ${lang}. Sound spoken, not written.
7. Match the angle's emotional intent exactly. Don't blur angles.
8. Use sensory, concrete, present-tense language whenever possible.

SCORING (0-100, be honest, not generous):
- 90-100: Industry-killer. Stops thumb in <0.4s. Top 1%.
- 75-89:  Strong. Will outperform average. Top 10%.
- 60-74:  Solid baseline. Average viral.
- <60:    Weak. Rewrite needed.

ANGLES (return in THIS order):
${ANGLES.map((a, i) => `${i + 1}. ${a.label} — ${a.desc} | Formula: ${a.formula}`).join("\n")}

For each hook also return:
- "score" (0-100 integer)
- "curiosityGap" (1 sentence: what unanswered question this creates)
- "emotionalTrigger" (one of: fear, anger, awe, curiosity, desire, shame, pride, validation, disgust, anticipation)
- "retentionForecast" ("3s", "10s", "full" — how long this hook can hold attention solo)
- "tip" (1 short sentence: how to make this hook even sharper)`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are the world's #1 viral hook engineer. You diagnose hooks like a surgeon. Output only via the provided tool." },
          { role: "user", content: prompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "return_hooks",
            description: "Return 12 hook variations with scores and diagnostics",
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
                      score: { type: "integer", minimum: 0, maximum: 100 },
                      curiosityGap: { type: "string" },
                      emotionalTrigger: { type: "string" },
                      retentionForecast: { type: "string", enum: ["3s", "10s", "full"] },
                      tip: { type: "string" },
                    },
                    required: ["angle", "text", "score", "curiosityGap", "emotionalTrigger", "retentionForecast", "tip"],
                    additionalProperties: false,
                  },
                  minItems: 12, maxItems: 12,
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