import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Require authenticated user (prevent abuse of paid AI API) ─────
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

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY not found");

    const body = await req.json();
    const {
      mode,
      topic,
      platforms,
      platform,
      contentType,
      style,
      scriptLength,
      goal,
      hookIntensity,
      imageFormat,
      imagePromptCount,
      imageStyle,
      imageMode,
      faceIntensity,
      outputDepth,
      customDescription,
      language,
      targetAudience,
      hookStyle,
      autoFixForced,
    } = body;

    const lang = language === "tr" ? "Turkish" : "English";

    // ── DISCOVERY MODE ──────────────────────────────────────────────
    const niche = body.niche;

    if (!topic || !topic.trim()) {
      const selectedPlatforms: string[] =
        platforms && Array.isArray(platforms) && platforms.length > 0
          ? platforms
          : platform
          ? [platform]
          : ["tiktok"];

      const platformList = selectedPlatforms
        .map((p: string) => {
          if (p === "tiktok") return "TikTok";
          if (p === "youtube-shorts") return "YouTube Shorts";
          if (p === "instagram-reels") return "Instagram Reels";
          return p;
        })
        .join(", ");

      const nicheBlock = niche
        ? `Niche: ${niche}\n- ALL ideas MUST be specifically about the "${niche}" niche\n- Do NOT generate generic ideas outside this niche`
        : "";

      const discoveryPrompt = `You are a viral content strategist for ${platformList}.

Generate 8 viral content ideas optimized for short-form video.

Language: ${lang}
${lang === "Turkish" ? "Write in natural, fluent Turkish. Do NOT translate from English." : ""}
${nicheBlock}
${contentType ? `Content type: ${contentType}` : ""}
${style ? `Style: ${style}` : ""}

Rules:
- Focus on: curiosity gaps, emotional triggers, mystery, surprising facts
- Avoid generic or overused ideas
- Each idea must feel like "I NEED to make this video"
- Ideas should be specific, not broad categories
${niche ? `- Every idea must be directly related to the "${niche}" niche` : ""}

For each idea provide:
- title: A specific, attention-grabbing content idea (max 10 words)
- why: One sentence explaining why it can go viral
- category: One of: Mystery, Horror, True Crime, Educational, Finance, Entertainment
- region: Trending region label (e.g. "🇺🇸 USA Trending", "🌍 Global", "🇹🇷 Turkey", "🇪🇺 Europe")

Return exactly 8 ideas as JSON.`;

      const discoverySchema = {
        type: "OBJECT",
        properties: {
          ideas: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                title: { type: "STRING" },
                why: { type: "STRING" },
                category: { type: "STRING" },
                region: { type: "STRING" },
              },
              required: ["title", "why", "category", "region"],
            },
          },
        },
        required: ["ideas"],
      };

      const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
      const geminiBody = {
        contents: [{ parts: [{ text: discoveryPrompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: discoverySchema,
        },
      };

      const response = await fetchWithRetry(geminiUrl, GEMINI_API_KEY, geminiBody);
      if (!response || !response.ok) {
        return new Response(
          JSON.stringify({ error: "Model temporarily busy. Please try again in a moment." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned empty response");

      const parsed = JSON.parse(text);
      return new Response(JSON.stringify({ discoveryMode: true, ...parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── WEEKLY PLAN MODE ────────────────────────────────────────────
    if (mode === "weekly-plan") {
      const weekNiche = body.niche || "mystery";
      const weekAudience = body.audience || "global";
      const channelName = body.channelName || "";

      const weekPrompt = `You are a viral content strategist.

Generate 7 unique viral content ideas for a weekly posting schedule.
Channel: ${channelName}
Niche: ${weekNiche}
Target Audience: ${weekAudience}
Language: ${lang}
${lang === "Turkish" ? "Write in natural, fluent Turkish." : ""}

For each idea provide:
- topic: A specific attention-grabbing topic (max 12 words)
- hookWord: A single shocking opening word (e.g. "Vanished.", "Dead.", "Gone.")
- platform: Either "TikTok" or "YouTube" (alternate)
- viralScore: Estimated viral potential 1-10

Rules:
- All 7 topics must be different angles within the "${weekNiche}" niche
- Each topic should feel like "I NEED to make this video"
- Hook words must be 1-3 words maximum, ending with period
- Viral scores should be realistic (7-10 range for good ideas)

Return exactly 7 ideas as JSON array in "ideas" key.`;

      const weekSchema = {
        type: "OBJECT",
        properties: {
          ideas: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                topic: { type: "STRING" },
                hookWord: { type: "STRING" },
                platform: { type: "STRING" },
                viralScore: { type: "NUMBER" },
              },
              required: ["topic", "hookWord", "platform", "viralScore"],
            },
          },
        },
        required: ["ideas"],
      };

      const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
      const geminiBody = {
        contents: [{ parts: [{ text: weekPrompt }] }],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2048,
          responseMimeType: "application/json",
          responseSchema: weekSchema,
        },
      };

      const response = await fetchWithRetry(geminiUrl, GEMINI_API_KEY, geminiBody);
      if (!response || !response.ok) {
        return new Response(
          JSON.stringify({ error: "Model temporarily busy. Please try again in a moment." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned empty response");
      const parsed = JSON.parse(text);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── A/B HOOKS MODE ──────────────────────────────────────────────
    if (mode === "ab-hooks") {
      const abPrompt = `You are a viral hook specialist.

Topic: "${topic}"
Style: ${style || "viral"}
Language: ${lang}
${lang === "Turkish" ? "Write in natural, fluent Turkish." : ""}

Generate 2 completely different hooks for the same topic:

Hook A (Fear-based, aggressive):
- Use fear, urgency, shock psychology
- Start with a shocking 1-3 word opener
- Make viewers feel they MUST watch NOW

Hook B (Curiosity-based, open loop):
- Use curiosity gap, unanswered question
- Create an irresistible open loop
- Make viewers feel they NEED to know the answer

Rules:
- Each hook must be 1-2 sentences max
- Hooks must be completely different approaches
- First word of each hook must be maximum 3 words
- Never start with: He, She, They, A man, A woman

Return as JSON with "hookA" and "hookB" string fields.`;

      const abSchema = {
        type: "OBJECT",
        properties: {
          hookA: { type: "STRING" },
          hookB: { type: "STRING" },
        },
        required: ["hookA", "hookB"],
      };

      const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent";
      const geminiBody = {
        contents: [{ parts: [{ text: abPrompt }] }],
        generationConfig: {
          temperature: 0.95,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
          responseSchema: abSchema,
        },
      };

      const response = await fetchWithRetry(geminiUrl, GEMINI_API_KEY, geminiBody);
      if (!response || !response.ok) {
        return new Response(
          JSON.stringify({ error: "Model temporarily busy. Please try again in a moment." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned empty response");
      const parsed = JSON.parse(text);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── HORROR MODE ───────────────────────────────────────────────────
    if (mode === "horror") {
      const horrorTopic = topic && topic.trim() ? topic.trim() : "";
      const lang = language === "tr" ? "Turkish" : "English";
      const threatType = body.threatType || null;
      const horrorPrompt = buildHorrorPrompt(horrorTopic, lang, scriptLength || "30", targetAudience || "global", !!body.autoFixForced, threatType);

      const horrorSchema = buildHorrorSchema();

      const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
      const geminiBody = {
        contents: [{ parts: [{ text: horrorPrompt }] }],
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          responseSchema: horrorSchema,
        },
      };

      const response = await fetchWithRetry(geminiUrl, GEMINI_API_KEY, geminiBody);
      if (!response || !response.ok) {
        return new Response(
          JSON.stringify({ error: "Model temporarily busy. Please try again in a moment." }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const result = await response.json();
      const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Gemini returned empty response");

      const parsed = JSON.parse(text);
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── GENERATION MODE ─────────────────────────────────────────────
    const selectedPlatforms: string[] =
      platforms && Array.isArray(platforms) && platforms.length > 0
        ? platforms
        : platform
        ? [platform]
        : ["tiktok"];

    const depth = outputDepth || "standard";
    const hookCount = mode === "pro" ? 10 : 3;

    const prompt = buildPrompt({
      mode,
      topic,
      platforms: selectedPlatforms,
      contentType,
      style,
      scriptLength,
      goal,
      hookIntensity,
      imageFormat: imageFormat || "9:16",
      imageStyle: imageStyle || "cinematic",
      imageMode: imageMode || "character",
      faceIntensity: faceIntensity || "medium",
      depth,
      hookCount,
      customDescription,
      language: lang,
      targetAudience: targetAudience || "global",
      hookStyle: hookStyle || "aggressive",
      autoFixForced: !!autoFixForced,
    });

    const schema = mode === "pro"
      ? buildProSchema(selectedPlatforms, hookCount)
      : buildFreeSchema();

    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    const geminiBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: mode === "pro" ? 0.8 : 0.7,
        maxOutputTokens: mode === "pro" ? 6144 : 4096,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    };

    const response = await fetchWithRetry(geminiUrl, GEMINI_API_KEY, geminiBody);

    if (!response || !response.ok) {
      return new Response(
        JSON.stringify({ error: "Model temporarily busy. Please try again in a moment." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await response.json();
    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned empty response");

    const parsed = JSON.parse(text);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // Log full details server-side, return generic message to client
    console.error("generate-content error:", error);
    return new Response(
      JSON.stringify({ error: "Generation failed. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Fetch with retry + Lovable AI fallback ──────────────────────────
// Optimized for speed: shorter timeouts, fewer retries, faster fallback.

async function fetchWithRetry(url: string, apiKey: string, body: any): Promise<Response | null> {
  let response: Response | null = null;
  const delays = [600, 1200]; // 2 attempts only — fall back fast

  for (let attempt = 0; attempt < delays.length; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 18000); // was 30s
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (response.ok) return response;

      const errBody = await response.text();
      if (/high demand|overloaded|unavailable|503|429|RESOURCE_EXHAUSTED/i.test(errBody) || response.status === 429 || response.status === 503) {
        console.warn(`Gemini attempt ${attempt + 1} failed (transient): ${response.status}`);
        response = null;
        await new Promise((r) => setTimeout(r, delays[attempt]));
        continue;
      }

      console.error("Gemini API error:", errBody);
      throw new Error(errBody || "Gemini request failed");
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        console.warn(`Gemini attempt ${attempt + 1} timed out`);
        response = null;
        await new Promise((r) => setTimeout(r, delays[attempt]));
        continue;
      }
      throw e;
    }
  }

  // ── Fallback to Lovable AI Gateway ──────────────────────────────
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (LOVABLE_API_KEY) {
    console.log("Gemini exhausted retries, falling back to Lovable AI gateway");
    try {
      const prompt = body.contents?.[0]?.parts?.[0]?.text || "";
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      const fallbackResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "You are a viral content generation engine. Always respond with valid JSON matching the requested schema exactly. No markdown, no extra text." },
            { role: "user", content: prompt + "\n\nIMPORTANT: Respond ONLY with valid JSON matching the schema described in the prompt. No markdown fences, no explanation." },
          ],
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (fallbackResp.ok) {
        const fallbackData = await fallbackResp.json();
        const content = fallbackData.choices?.[0]?.message?.content || "";
        const wrappedBody = JSON.stringify({
          candidates: [{ content: { parts: [{ text: content.replace(/^```json\s*|```\s*$/g, "").trim() }] } }],
        });
        return new Response(wrappedBody, { status: 200, headers: { "Content-Type": "application/json" } });
      }
      console.warn("Lovable AI fallback also failed:", fallbackResp.status);
    } catch (e2) {
      console.warn("Lovable AI fallback error:", e2);
    }
  }

  return response;
}

// ── Viral Analysis schema ───────────────────────────────────────────

const viralScoreCategory = {
  type: "OBJECT",
  properties: {
    name: { type: "STRING" },
    score: { type: "NUMBER" },
  },
  required: ["name", "score"],
};

const viralAnalysisSchema = {
  type: "OBJECT",
  properties: {
    score: { type: "NUMBER" },
    categories: { type: "ARRAY", items: viralScoreCategory },
    strengths: { type: "ARRAY", items: { type: "STRING" } },
    weaknesses: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["score", "categories", "strengths", "weaknesses"],
};

// ── Music schema (structured) ───────────────────────────────────────

const musicSuggestionSchema = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING" },
    source: { type: "STRING" },
    why: { type: "STRING" },
  },
  required: ["type", "source", "why"],
};

// ── Schema builders ─────────────────────────────────────────────────

const hookWithLabelSchema = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING" },
    hook: { type: "STRING" },
  },
  required: ["type", "hook"],
};

const angleVariationSchema = {
  type: "OBJECT",
  properties: {
    type: { type: "STRING" },
    hook: { type: "STRING" },
  },
  required: ["type", "hook"],
};

function buildFreeSchema() {
  return {
    type: "OBJECT",
    properties: {
      hooks: { type: "ARRAY", items: hookWithLabelSchema },
      bestHook: { type: "STRING" },
      angleVariations: { type: "ARRAY", items: angleVariationSchema },
      script: { type: "STRING" },
      editingPlan: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            scene: { type: "NUMBER" },
            visual: { type: "STRING" },
            onScreenText: { type: "STRING" },
            mood: { type: "STRING" },
          },
          required: ["scene", "visual"],
        },
      },
      imagePrompts: { type: "ARRAY", items: { type: "STRING" } },
      youtube: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          tags: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["title", "description", "tags"],
      },
      tiktok: {
        type: "OBJECT",
        properties: {
          caption: { type: "STRING" },
          hashtags: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["caption", "hashtags"],
      },
      music: { type: "ARRAY", items: musicSuggestionSchema },
      seriesPotential: { type: "STRING" },
      viralAnalysis: viralAnalysisSchema,
      thumbnails: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            image: { type: "STRING" },
            text: { type: "STRING" },
          },
          required: ["image", "text"],
        },
      },
    },
    required: ["hooks", "bestHook", "script", "editingPlan", "imagePrompts", "youtube", "tiktok", "music", "seriesPotential", "viralAnalysis", "thumbnails", "angleVariations"],
  };
}

function buildProSchema(platforms: string[], _hookCount: number) {
  const editingScene = {
    type: "OBJECT",
    properties: {
      scene: { type: "NUMBER" },
      visual: { type: "STRING" },
      onScreenText: { type: "STRING" },
      mood: { type: "STRING" },
    },
    required: ["scene", "visual"],
  };

  const props: Record<string, any> = {
    bestHook: { type: "STRING" },
    hooks: { type: "ARRAY", items: hookWithLabelSchema },
    hookVariations: { type: "ARRAY", items: { type: "STRING" } },
    angleVariations: { type: "ARRAY", items: angleVariationSchema },
    script: { type: "STRING" },
    editingPlan: { type: "ARRAY", items: editingScene },
    voiceStyle: { type: "STRING" },
    postingStrategy: {
      type: "OBJECT",
      properties: {
        bestTime: { type: "STRING" },
        platformTip: { type: "STRING" },
      },
      required: ["bestTime", "platformTip"],
    },
    imagePrompts: { type: "ARRAY", items: { type: "STRING" } },
    youtube: {
      type: "OBJECT",
      properties: {
        title: { type: "STRING" },
        description: { type: "STRING" },
        tags: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["title", "description", "tags"],
    },
    tiktok: {
      type: "OBJECT",
      properties: {
        caption: { type: "STRING" },
        hashtags: { type: "ARRAY", items: { type: "STRING" } },
      },
      required: ["caption", "hashtags"],
    },
    music: { type: "ARRAY", items: musicSuggestionSchema },
    seriesPotential: { type: "STRING" },
    viralAnalysis: viralAnalysisSchema,
    thumbnails: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          image: { type: "STRING" },
          text: { type: "STRING" },
        },
        required: ["image", "text"],
      },
    },
  };

  const required = [
    "bestHook", "hooks", "hookVariations", "angleVariations", "script", "editingPlan",
    "voiceStyle", "postingStrategy", "imagePrompts", "youtube", "tiktok", "music", "seriesPotential", "viralAnalysis", "thumbnails",
  ];

  if (platforms.includes("instagram-reels")) {
    props.instagramCaption = { type: "STRING" };
    required.push("instagramCaption");
  }

  return { type: "OBJECT", properties: props, required };
}

// ── Prompt builder ──────────────────────────────────────────────────

function getLineCountGuidance(scriptLength: string): string {
  switch (scriptLength) {
    case "15": return `STRICT TIMING CONTROL (15s):
- HARD LIMIT: 160–190 characters total (letters + spaces + punctuation). Target 175 characters.
- Each line: 1 breath, max 6 words per line
- Count characters (not words) before finalizing. If over 190 → trim from MIDDLE only. If under 160 → add tension line.
- Focus on immediate impact, 1–2 ideas max`;
    case "30": return `STRICT TIMING CONTROL (30s):
- HARD LIMIT: 330–380 characters total (letters + spaces + punctuation). Target 355 characters.
- Each line: 1 breath, max 6 words per line
- Count characters (not words) before finalizing. If over 380 → trim from MIDDLE only. If under 330 → add tension line.
- Use 2–3 key ideas, minimal buildup`;
    case "60": return `STRICT TIMING CONTROL (60s):
- HARD LIMIT: 660–760 characters total (letters + spaces + punctuation). Target 710 characters.
- Each line: 1 breath, max 6 words per line
- Count characters (not words) before finalizing. If over 760 → trim from MIDDLE only. If under 660 → add tension line.
- Develop 3–5 ideas with narrative flow`;
    default: return `STRICT TIMING CONTROL (30s):
- HARD LIMIT: 330–380 characters total (letters + spaces + punctuation). Target 355 characters.
- Each line: 1 breath, max 6 words per line
- Count characters before finalizing. If over 380 → compress. If under 330 → add tension line.`;
  }
}

function getStyleInstructions(style: string): string {
  switch (style) {
    case "viral": return `Maximize shock, speed, and curiosity. Use aggressive short lines. Scroll-stopping energy. Pattern-interrupt openers. Every line must hit hard.`;
    case "story": return `Add narrative flow: beginning → tension → escalation. Relatable situation. Emotional payoff. Build toward a twist.`;
    case "high-retention": return `Add pattern breaks every 2 lines. Use interruptions frequently ("Wait.", "But here's the thing…"). Keep the viewer hooked every 3 seconds. Open loops everywhere.`;
    case "emotional": return `Focus on feelings and internal tension. Slightly slower pacing. Use deeply relatable language. Make them feel something real. Emotional triggers over information.`;
    case "suspense": return `Increase unknown elements. Avoid full explanations. Add eerie tone. Build tension, ambiguity, and intrigue. Cliffhanger-style pacing. Leave things unresolved.`;
    case "controversial": return `Add bold, risky, tension-based statements. Challenge conventional thinking. Be polarizing but not offensive. Make viewers debate in comments.`;
    case "curiosity": return `Increase questions and curiosity gaps. Delay key reveals. Create information gaps the viewer NEEDS to fill. Make them NEED to keep watching.`;
    case "educational": return `Clear, structured, valuable. Teach something useful fast. Still engaging — not boring. Use surprising facts as hooks.`;
    default: return "";
  }
}

function getGoalInstructions(goal: string): string {
  switch (goal) {
    case "viral": return "Prioritize shareability and a strong, open-ended ending. Make it feel like something people MUST share.";
    case "followers": return "Add subtle series or identity feel. Make the viewer want to follow for more. End with implicit 'follow for part 2' energy.";
    case "brand": return "Maintain consistent tone throughout. Build authority and trust. The content should feel like a signature style.";
    case "sell": return "Add light persuasive undertone. Do NOT hard-sell. Create desire through storytelling, not pitch.";
    case "leads": return "Create value-first content that makes viewers want to learn more. Subtle call-to-action energy.";
    case "storytelling": return "Strengthen narrative depth. Use full story arc. Build emotional investment over the duration.";
    default: return "";
  }
}

function getHookIntensityInstructions(intensity: number): string {
  if (intensity === 0) return `HOOK INTENSITY: LOW
- Soft curiosity hooks
- Intriguing but not aggressive
- Viewer feels pulled in gently`;
  if (intensity === 1) return `HOOK INTENSITY: MEDIUM
- Balanced curiosity + tension
- Strong enough to stop scrolling
- Clear emotional or curiosity trigger`;
  return `HOOK INTENSITY: HIGH
- Aggressive, shocking, risky hooks
- Must feel dangerous or forbidden
- Maximum scroll-stopping power
- Push boundaries without being offensive`;
}

function getContentTypeInstructions(contentType: string): string {
  switch (contentType) {
    case "story": return "Use narrative storytelling format. Build characters, situations, and emotional arcs.";
    case "educational": return "Slightly clearer delivery but still engaging. Use surprising facts. Structure: hook → insight → payoff.";
    case "entertainment": return "Fast and engaging tone. Pure entertainment value. Make them laugh, gasp, or share.";
    case "selling": return "Subtle persuasion through story. Create desire, not a pitch. Product/service woven into narrative.";
    case "personal-brand": return "Show personality and expertise. Build parasocial connection. Make viewer feel they know you.";
    case "hooks-only": return "OUTPUT ONLY HOOKS. No script, no editing plan. Just the strongest hooks possible.";
    case "script-only": return "OUTPUT ONLY THE SCRIPT. No hooks list, no editing plan. Focus entirely on the voiceover script.";
    default: return "";
  }
}

interface PromptInput {
  mode: string;
  topic: string;
  platforms: string[];
  contentType: string;
  style: string;
  scriptLength: string;
  goal: string;
  hookIntensity: number;
  imageFormat: string;
  imageStyle: string;
  imageMode: string;
  faceIntensity: string;
  depth: string;
  hookCount: number;
  customDescription?: string;
  language: string;
  targetAudience: string;
  hookStyle: string;
  autoFixForced?: boolean;
}

function getTargetAudienceInstructions(audience: string): string {
  switch (audience) {
    case "usa": return `TARGET AUDIENCE: USA
- Bold, direct English
- Use American cultural references
- Fast, confident, assertive tone
- Slang is OK if natural`;
    case "europe": return `TARGET AUDIENCE: EUROPE
- Neutral, clear English
- Avoid American-specific slang
- Slightly more formal but still engaging
- Universal European appeal`;
    case "latam": return `TARGET AUDIENCE: LATIN AMERICA
- Simple, clear English
- Slightly Spanish-friendly phrasing where natural
- Warm, energetic tone
- Relatable across Latin American cultures`;
    case "turkey": return `TARGET AUDIENCE: TURKEY
- Write in natural, spoken Turkish
- Use Turkish rhythm and cadence
- Culturally relevant references
- No translated-sounding phrases`;
    default: return `TARGET AUDIENCE: GLOBAL
- Simple, universally clear English
- No region-specific slang or references
- Accessible to non-native English speakers
- Clean, direct phrasing`;
  }
}

function getHookStyleInstructions(hookStyle: string): string {
  switch (hookStyle) {
    case "curiosity": return `HOOK STYLE: CURIOSITY (HOOK ENGINE)
- First line MUST be an incomplete statement that creates an open loop
- Maximum 3 words in first line
- Examples: "He never left." / "Something went wrong." / "Nobody checked."
- Do NOT explain context in the first line
- Do NOT use generic openings like "Have you ever..." or "What if..."
- The hook must make the viewer NEED to know what happens next
- Delay the reveal as long as possible`;
    case "emotional": return `HOOK STYLE: EMOTIONAL (HOOK ENGINE)
- First line MUST be a human statement that triggers empathy
- Maximum 3 words in first line
- Examples: "They were wrong." / "He wasn't ready." / "She knew."
- Do NOT explain context in the first line
- Do NOT use generic openings like "This is the story of..."
- The hook must make the viewer feel something immediately
- Tap into shared human experiences`;
    case "dark": return `HOOK STYLE: DARK (HOOK ENGINE)
- First line MUST be a disturbing implication
- Maximum 3 words in first line
- Examples: "This shouldn't happen." / "He wasn't alone." / "Nobody survived."
- Do NOT explain context in the first line
- Do NOT use generic openings
- The hook must create immediate unease or dread
- Leave something unexplained`;
    default: return `HOOK STYLE: AGGRESSIVE (HOOK ENGINE)
- First line MUST be a shocking word or command
- Maximum 3 words in first line
- Examples: "Cut." / "Dead." / "Wrong." / "Gone." / "Trapped."
- Do NOT explain context in the first line
- Do NOT use generic openings like "This is..." or "Did you know..."
- The hook must stop scrolling instantly
- Hit hard and fast, no buildup`;
  }
}

function getCreatorDNA(hookStyle: string): string {
  // Map Hook Style → famous YouTube creator pacing & rhythm DNA.
  // The model studies these creators' opening 10-second behavior.
  switch (hookStyle) {
    case "curiosity":
      return `=== CREATOR DNA: JOHNNY HARRIS / VERITASIUM ===
- Open with one specific, weird, undeniable detail (not a generic claim).
- Layer information slowly: each line should answer ONE small question and create TWO new ones.
- Use "but / except / however" pivots every 3-4 lines to redirect attention.
- Cinematic narration rhythm: short → short → medium → SHORT.
- Avoid hype words. Whisper the wild parts. Confidence > volume.
- The viewer should feel they're being walked into a secret.`;
    case "emotional":
      return `=== CREATOR DNA: HUMANS-OF / DHAR MANN STORYTELLERS ===
- Open mid-feeling, never mid-explanation. ("She knew.", "He waited.", "Nobody came.")
- Use named or specific people (not "a man" / "a woman" — give them an age, a job, a detail).
- One concrete sensory anchor per beat: a smell, a sound, a small object.
- Pacing: heartbeat rhythm — tight, breath, tight, breath.
- Land the climax on a single line of human truth, not on a fact.
- Last line should make the viewer text someone, not just stop scrolling.`;
    case "dark":
      return `=== CREATOR DNA: MR BALLEN / LEMMINO / NEXPO ===
- Slow burn. The opening 3 seconds should feel quiet, almost calm — wrong calm.
- Trust the listener. Withhold context aggressively. Reveal one disturbing detail at a time.
- Avoid splatter words (blood, gore, screaming). Use absence (silence, missing, locked, no answer).
- Sentence rhythm: long, hushed line → tiny breaking line. Repeat.
- The horror is in what is NOT said. Imply, don't show.
- End on a question the viewer cannot un-think.`;
    default: // aggressive
      return `=== CREATOR DNA: MR BEAST / SIDEMEN / IMAN GADZHI OPENERS ===
- First line is a verb, a number, or a one-word verdict. No setup.
- Stack stakes inside the first 3 seconds: who, what, how high the cost.
- Use specific numbers ("3 seconds", "$40,000", "47 floors") — vagueness kills retention.
- Pattern interrupt every 2 lines: rhythm break, sudden 1-word line, contradicting fact.
- Energy stays at 9/10 the whole way — never let the listener relax.
- Close with a stake reveal or a "...and that was just the beginning."`;
  }
}

const viralRetentionMechanics = `
=== YOUTUBE FENOMEN-LEVEL RETENTION MECHANICS (NON-NEGOTIABLE) ===
These are the mechanics top short-form creators use to push 90%+ average view duration.
The script MUST embed ALL of them implicitly (never label them in output):

1. THE 0.5-SECOND STOP
   - Word #1 of the script must be physically arresting (a verb, a verdict, a number, a name).
   - Words 1-3 must be processable in one glance.

2. THE 3-SECOND PROMISE
   - By second 3 the viewer must know WHY they should keep watching (the stake).
   - Implied promise = a specific payoff is coming. Vague = scroll.

3. OPEN LOOP CHAIN
   - Open at least 3 micro-loops in the first 60% of the script.
   - Close ONLY one of them before the very end. The rest force replay/comments.

4. INFORMATION DELAY (RESERVE THE BEST FACT)
   - The single most shocking fact does NOT appear until 60-75% in.
   - Anything that gives the answer too early = REWRITE.

5. PATTERN INTERRUPT EVERY 2-3 LINES
   - Sudden rhythm shift, 1-word line, contradiction, time-jump, or zoom-in detail.
   - If 4+ lines pass without an interrupt → INVALID.

6. STAKE ESCALATION
   - Stakes must rise monotonically: personal → social → existential.
   - A line that lowers stakes is forbidden mid-script.

7. SPECIFICITY OVER ADJECTIVES
   - Replace adjectives with numbers, names, locations, time codes.
   - "Many people" → "47 people". "A long time" → "11 days". "Far away" → "in a Mongolian truck stop".

8. THE LOOP CLOSE
   - The final line must rhyme thematically with the opening line so the viewer can replay seamlessly.
   - It must also leave one loop deliberately OPEN (the comment-driver).

9. COMMENT TRIGGER (BUILT IN, NEVER LABELED)
   - Bake one mildly debatable / divisive / "wait what?" beat into the middle.
   - The viewer should feel the urge to comment without being asked.

10. NO DEAD WORDS
    - Strike: very, really, just, basically, actually, literally, somehow.
    - Strike all hedges: "kind of", "sort of", "maybe a little".
    - Every word must increase tension, specificity, or emotion.

SELF-CHECK BEFORE RETURNING:
- Read the script aloud mentally. If at ANY second you could imagine a viewer scrolling away → rewrite that section.
- Could the script be confused with a generic AI script? If yes → add specificity and rewrite the openers.`;

function getImagePromptRules(imageStyle: string, imageMode: string = "character", faceIntensity: string = "medium"): string {
  // Style suffix per visual style
  const styleSuffix: Record<string, string> = {
    cartoon:     "anime / Studio Ghibli inspired illustration, cel-shaded, expressive saturated colors, clean bold outlines, hand-drawn feel, dramatic anime rim lighting, painterly background",
    horror:      "dark horror ink illustration, semi-realistic, sharp ink lines, cross-hatching shading, gritty texture, high contrast lighting, analog horror grain, deep blacks, single cold blue or blood-red accent, eerie uncanny mood",
    "3d":        "high-quality 3D render, Pixar / DreamWorks animation aesthetic, soft volumetric lighting, subtle subsurface scattering, polished materials, cinematic depth of field, octane render quality",
    cinematic:   "shot on Arri Alexa LF, 35mm anamorphic lens, T1.4, shallow depth of field, natural cinematic color grade, teal-and-orange palette, soft volumetric haze, ultra-detailed, photorealistic, IMAX clarity",
    documentary: "raw documentary photography, available natural light, slight motion blur, photojournalistic framing, Magnum Photos style, neutral tone, true-to-life skin tones, 35mm grain",
    editorial:   "high-fashion editorial photography, Vogue / National Geographic cover quality, dramatic studio lighting, bold color palette, magazine-cover composition, hyperdetailed, glossy print finish",
    cyberpunk:   "neon cyberpunk aesthetic, magenta and cyan rim lighting, rain-slicked reflective surfaces, glowing holographic signage bokeh, Blade Runner 2049 inspired, cinematic anamorphic flare, moody atmosphere",
    noir:        "classic film noir, high-contrast black and white, hard chiaroscuro lighting, venetian blind shadows, smoke in the air, 1940s detective mood, 35mm film grain, deep shadows",
    vintage35mm: "vintage 35mm film photography, Kodak Portra 400, warm faded colors, light leaks, soft halation, slight grain, nostalgic 1970s mood, analog imperfections",
    hyperreal:   "hyperreal macro photography, 100mm macro lens, ultra-shallow depth of field, microscopic skin texture and pore detail, dewdrop sharpness, studio softbox lighting, 8k clarity",
  };
  const suffix = styleSuffix[imageStyle] || styleSuffix.cinematic;

  // Face intensity expression block
  const faceIntensityBlock = (() => {
    switch (faceIntensity) {
      case "low":
        return "Subtle expression: thoughtful eyes, slight tension in the brow, calm but quietly unsettled, micro-emotion only.";
      case "extreme":
        return "EXTREME expression: terrified wide eyes, dilated pupils, visible fear, tense facial muscles, mouth open mid-gasp, sweat beading on temple, vein on neck, raw panic energy frozen at peak intensity.";
      case "medium":
      default:
        return "Strong expression: wide eyes, clear emotion (fear / shock / curiosity / awe), tense brow, parted lips, palpable intensity, micro-expression caught mid-realization.";
    }
  })();

  // Safety language for human characters (NO real identities)
  const safetySuffix = "fictional character, generic person, no real identity, not a celebrity, not a real public figure, no text, no logos, no watermarks, vertical 9:16 portrait orientation";

  // Cinematic shot vocabulary — enforce variety across the 5 prompts
  const shotVariety = [
    "extreme close-up of eyes only (macro, eyelash detail)",
    "tight close-up of face (chin to forehead, fills frame)",
    "medium close-up (shoulders up, slight low angle)",
    "over-the-shoulder shot (subject's POV reveal)",
    "profile silhouette against strong rim light",
    "Dutch angle close-up (tilted, unsettling)",
    "hands-only detail shot (trembling, gripping object)",
  ].join(" / ");

  // Lighting vocabulary
  const lightingVocab = "cinematic three-point lighting, motivated practical lights, hard single-source key, low-key chiaroscuro, neon rim, window-light backlight, underlit horror key";

  // Composition vocabulary
  const compositionVocab = "rule-of-thirds, negative space, leading lines, deep foreground/background separation, off-center framing, symmetrical headroom for text overlay";

  const baseHeader = `
IMAGE PROMPTS:
- Generate exactly 5 prompts.
- imagePrompts must be an array of plain strings.
- Each prompt is a single text string. Never return objects.
- Each prompt must be vertical 9:16, no text, no logos.
- IMPORTANT: Human faces and characters ARE allowed and encouraged. Use ONLY fictional characters. Never depict, name, or resemble real people, celebrities, politicians, or public figures.
- Every prompt MUST include the safety phrase: "${safetySuffix}".
- Visual style suffix to append to every prompt: "${suffix}".
- LIGHTING palette to draw from: ${lightingVocab}.
- COMPOSITION palette to draw from: ${compositionVocab}.
- Each prompt MUST contain at least: [subject + action/expression] + [lighting cue] + [composition cue] + [mood] + [style suffix] + [safety suffix].
- Avoid generic words: "beautiful", "amazing", "cool". Use concrete sensory and cinematographic detail instead.
- Vary lens choice across the 5 prompts (e.g. 24mm wide / 50mm portrait / 85mm telephoto / 100mm macro / anamorphic).
- Each prompt should be 25–45 words — dense, specific, scroll-stopping.`;

  if (imageMode === "scene") {
    return baseHeader + `

IMAGE MODE — SCENE (environment only):
- NO people, NO faces, NO characters, NO silhouettes of people in any prompt.
- Focus entirely on environments, objects, atmosphere, lighting.
- Vary scale across the 5 prompts: macro detail / interior space / exterior wide / aerial / impossible surreal vista.
- Format: [environment / object], [time of day], [lighting], [composition], [mood], ${suffix}, ${safetySuffix}, no people
- Each prompt must end with: "no faces, no identifiable people, no portraits, ${safetySuffix.replace("vertical 9:16","")}"
- At least 1 prompt should feel unsettling, surreal, or visually impossible (gravity wrong, doubled object, impossible architecture).
- At least 1 prompt should be a tight macro detail (texture, single object) — not all wide shots.`;
  }

  if (imageMode === "mixed") {
    return baseHeader + `

IMAGE MODE — MIXED (character + environment, cinematic edit feel):
- Generate exactly: 2 CHARACTER close-ups, 1 ACTION/HANDS shot, 1 SCENE/ENVIRONMENT shot, 1 SYMBOLIC OBJECT shot. Sequence them so the 5 images feel like a film cut: hook → reveal → tension → world → symbol.
- Character prompts: extreme close-up of fictional character's face, strong facial expression, emotional intensity. ${faceIntensityBlock}
- Action/hands shot: trembling hands, gripping/reaching/dropping an object, shallow DOF, motion blur acceptable, NO face required.
- Scene shot: environment only, NO people, atmosphere-driven, mood-rich.
- Symbolic shot: a single charged object or detail (door slightly ajar, broken mirror, locked phone, footprint, blood drop on white) — macro framing, metaphorical.
- Vary shot types across the set (use shot vocabulary): ${shotVariety}.
- Format (character): "[shot type] of fictional character's face, [expression], [lighting cue], [composition cue], [mood], ${suffix}, ${safetySuffix}"
- Format (action): "Close-up of [body part / object interaction], [lighting], [composition], [mood], ${suffix}, ${safetySuffix}, no face visible"
- Format (scene): "[environment], [time/lighting], [composition], [mood], ${suffix}, ${safetySuffix}, no people"
- Format (symbolic): "Macro shot of [single charged object], [lighting], [mood], ${suffix}, ${safetySuffix}, no people"`;
  }

  if (imageMode === "pov") {
    return baseHeader + `

IMAGE MODE — POV (first-person perspective):
- Every prompt is a first-person POV shot — what the character sees, not the character's face.
- Include POV cues: "first-person view", "looking down at hands", "looking through a doorway", "looking up at ceiling", "GoPro chest-mount perspective", "phone screen POV".
- Vary the 5 POVs (hands / mirror reflection / through window / down a hallway / phone screen).
- 1 prompt may include a fictional character glimpsed in a mirror or reflection (apply ${faceIntensityBlock}).
- Format: "First-person POV, [what the viewer sees], [lighting], [composition], [mood], ${suffix}, ${safetySuffix}"`;
  }

  if (imageMode === "action") {
    return baseHeader + `

IMAGE MODE — ACTION (dynamic motion):
- Every prompt captures a frozen moment of intense motion or interaction.
- Use motion vocabulary: "frozen mid-action", "motion blur trail", "shutter drag", "split-second peak action", "dust kicked up", "object mid-fall".
- Mix close-up character action (face + body in motion) with object action (hands gripping, item shattering, door slamming).
- Apply face intensity for character shots: ${faceIntensityBlock}
- Format: "[shot type] of [subject + dynamic action], [lighting], [motion cue], [mood], ${suffix}, ${safetySuffix}"`;
  }

  if (imageMode === "symbolic") {
    return baseHeader + `

IMAGE MODE — SYMBOLIC (metaphor & object-driven):
- Each prompt is a single, charged metaphorical object or detail shot — NO faces, NO people.
- Examples of symbolic frames: cracked mirror reflecting nothing, locked door with light leaking under it, hourglass with red sand, broken phone screen, single chair in empty room, key on dark wood, footprints leading nowhere.
- Macro framing, dramatic lighting, museum-still feel.
- Vary the 5 objects across emotional categories: secrecy / time / loss / surveillance / threshold.
- Format: "Macro / still-life shot of [single object + state], [lighting], [composition], [symbolic mood], ${suffix}, ${safetySuffix}, no people"`;
  }

  // CHARACTER (default)
  return baseHeader + `

IMAGE MODE — CHARACTER (default, human-centered):
- Every prompt MUST feature a fictional human character — close-up of face, strong emotional expression.
- Vary the SHOT TYPE across the 5 prompts (do NOT make all 5 identical extreme close-ups). Pick from: ${shotVariety}.
- Each prompt must include: shot type + expression + lighting cue + composition cue + style suffix + safety suffix.
- ${faceIntensityBlock}
- Avoid: empty rooms, distant figures, environment-only scenes, generic stock-photo poses.
- Vary the fictional character across the 5 prompts (age range, gender, ethnicity), but ALWAYS fictional — never real people or celebrities.
- Format: "[shot type] of fictional character's face, [emotion/expression], [lighting], [composition], [mood], ${suffix}, ${safetySuffix}"
- Example (horror): "Extreme close-up of a fictional young adult's face, terrified wide eyes mid-gasp, harsh single-source key from below, deep shadows carving cheekbones, off-center framing, dark horror ink illustration, semi-realistic, sharp ink lines, cross-hatching shading, gritty texture, analog horror grain, fictional character, generic person, no real identity, not a celebrity, vertical 9:16 portrait orientation"
- All 5 prompts must center a fictional character. No environment-only fallback.`;
}

function buildPrompt(input: PromptInput) {
  const { autoFixForced } = input;
  const hookLevel =
    input.hookIntensity === 0 ? "safe" : input.hookIntensity === 1 ? "balanced" : "aggressive";

  const platformList = input.platforms
    .map((p) => {
      if (p === "tiktok") return "TikTok";
      if (p === "youtube-shorts") return "YouTube Shorts";
      if (p === "instagram-reels") return "Instagram Reels";
      return p;
    })
    .join(", ");

  const lineCountGuidance = getLineCountGuidance(input.scriptLength);
  const styleInstructions = getStyleInstructions(input.style);
  const goalInstructions = getGoalInstructions(input.goal);
  const hookIntensityInstructions = getHookIntensityInstructions(input.hookIntensity);
  const contentTypeInstructions = getContentTypeInstructions(input.contentType);
  const targetAudienceInstructions = getTargetAudienceInstructions(input.targetAudience);
  const hookStyleInstructions = getHookStyleInstructions(input.hookStyle);
  const creatorDNA = getCreatorDNA(input.hookStyle);

  const globalRules = `
GLOBAL RULES:
- Output must strictly follow ${input.language} language.
- Optimize for short-form vertical video, mobile-first, fast consumption.
- Every line must increase tension, curiosity, or emotion.
- No filler, no explanations, no long paragraphs.
- Avoid generic or neutral phrasing.
- Prioritize emotional impact over information.
- Write for viewers, not readers.
- Use virality principles: curiosity gaps, open loops, emotional triggers, pattern interrupts.
- Content must feel human, not AI-generated.`;

  const languageBehavior = input.language === "Turkish"
    ? `
LANGUAGE BEHAVIOR (TURKISH):
- Write in natural, fluent, spoken Turkish
- Do NOT translate from English — think in Turkish
- Use culturally natural phrasing and idioms
- Keep sentences clean and smooth
- Avoid overly dramatic horror tone UNLESS the topic is actually horror/mystery
- The output must sound like a native Turkish speaker wrote it`
    : `
LANGUAGE BEHAVIOR (ENGLISH):
- Keep cinematic, engaging tone
- Use natural spoken English rhythm
- Adapt tone to match the topic category`;

  const topicAdaptation = `
TOPIC-AWARE TONE ADAPTATION (CRITICAL):
- You MUST adapt your tone and style to match the topic category
- Do NOT default to dark/horror tone for every topic

If topic is educational (health, science, tips, how-to):
  → Use clear, engaging, curiosity-driven tone
  → Focus on value + intrigue
  → No horror or suspense elements
  → Structure: Hook → Value → Expansion → Insight → Ending

If topic is horror / mystery / true crime:
  → Use dark, suspenseful, psychological tone
  → Structure: Hook → Unease → Escalation → Disturbance → Open-ended question

If topic is self-improvement / motivation:
  → Use motivational + curiosity tone
  → Inspire action and self-reflection
  → Structure: Hook → Challenge → Insight → Shift → Call to action

If topic is entertainment / fun / lifestyle:
  → Use fast, light, engaging tone
  → Focus on relatability and shareability

If topic is selling / product / business:
  → Use persuasive curiosity tone
  → Create desire through storytelling

AI MUST match the topic category. Mismatched tone = INVALID output.`;

  const factSafetyRule = `
FACT SAFETY RULES (TOP PRIORITY — APPLY TO ALL OUTPUT):
- Never invent dialogue or direct quotes
- Never write invented dialogue or direct speech
- Never write: screamed, whispered, cried, begged
- Never add the word 'Reportedly' in script
- Never invent emotional reactions
- Describe only what is verifiably known
- If uncertain → use 'reportedly' style phrasing in narration only, never as script dialogue
- Do not put words in real people's mouths
- Do not fabricate specific actions or quotes
- Apply to: script, hooks, all text output`;

  const autoFixRule = `
AUTO-FIX RULE (CRITICAL — VIRAL SCORE THRESHOLD = 8):
${autoFixForced ? `- AUTO-FIX MODE IS FORCED. Previous output was not strong enough.
- Rewrite the hook with a stronger, more shocking opening word.
- Rewrite the middle with shorter lines (max 4 words per line).
- Increase pattern interrupts significantly.
- Make ending more open and tense.
- Keep total word count strictly under the duration limit.
- The viral score MUST be at least 8.5. Push to 9+ if possible.` : ''}
- After generating ALL content, evaluate the viral analysis score
- If the estimated viral score is BELOW 8:
  1. Rewrite the bestHook with a stronger, more shocking opening word
  2. Add MORE pattern interrupts throughout the script (at least 2 extra)
  3. Strengthen the loop ending to be more emotionally impactful
  4. Push hook intensity to maximum
- Do NOT return low-quality output. Only return the IMPROVED version.
- Do NOT skip this step. Every output must meet the threshold.
- If after improvement the score is still below 8, push harder on hook and ending.`;

  const microRetentionRule = `
MICRO-RETENTION TRIGGERS (FOR EDITING PLAN ONLY):
- In the EDITING PLAN (not the script), include pacing notes like [pause], [cut], [zoom], [whisper] in the mood or visual fields
- The SCRIPT must be 100% clean voiceover text — NO bracketed cues whatsoever
- Never put [pause], [cut], [zoom], [whisper] or any bracketed text in the script field
- These editing cues belong ONLY in the editingPlan scenes`;

  const scriptFormatRules = `
VOICE SCRIPT (CRITICAL — STRICT RULES):
- Generate a voiceover script optimized for ElevenLabs TTS at speed 0.90.
- OUTPUT FORMAT (MANDATORY):
  - Pure voiceover text ONLY
  - NO bracketed cues like [pause], [cut], [zoom], [whisper] — these go ONLY in editingPlan
  - NO asterisks (*word*) — ElevenLabs reads them literally
  - NO stage directions of any kind
  - NO action notes or labels (Beat 1, Hook:, CTA:)
  - NO parenthetical instructions
  - Short lines: 1-6 words maximum per line
  - One idea per line
  - NEVER write paragraphs — if the script is a paragraph, the output is INVALID
  - Use "..." for pauses and "—" for dramatic breaks
  - Add empty lines between sections for breathing space

=== SCRIPT TIMING ENGINE (WORD COUNT TARGETS) ===
STEP 1 - DETERMINE WORD COUNT TARGET:
- If duration = 15s → write 40-50 words
- If duration = 30s → write 85-100 words
- If duration = 60s → write 150-180 words

STEP 2 - WRITE THE SCRIPT:
- Short lines: 1-6 words maximum
- Use rhythm and spacing between ideas
- Avoid long sentences
- Add tension through controlled repetition
- Prioritize pacing over strict word count
Structure:
- Opening (shocking word): 1 line, 1-3 words
- Setup (context): 3-4 lines, 3-5 words each
- Escalation (tension builds): 4-5 lines, 3-6 words each
- Pattern interrupt: 1 line, 1-3 words (shocking fact)
- Peak (most intense): 3-4 lines, 2-4 words each
- Loop ending: 1-2 lines, connects back to opening

STEP 3 - COUNT WORDS:
Count every word in the script.

STEP 4 - POST-GENERATION ADJUSTMENT:
If UNDER target word count:
→ Add tension lines: "No warning." / "Nothing." / "Silence."
→ Add atmosphere: "The room was still." / "Nobody moved."
→ Only add lines that increase tension or curiosity
→ Never add filler. Every line must earn its place.

If OVER target word count:
→ Remove weak or repetitive lines
→ Compress sentences
→ Keep only strongest lines
→ Keep first 3 and last 3 lines always

STEP 5 - RECOUNT AND VERIFY:
- Recount words after adjustment
- Script must feel: natural, properly paced, not rushed, not dragged
- Quality rule: Never add filler. Every line must earn its place.
- ONLY RETURN when word count is within target range.
- This is NON-NEGOTIABLE. Outside the range = INVALID output.

CHARACTER COUNT TARGETS (for live counter validation):
- If duration = 15s → 160-190 characters
- If duration = 30s → 260-340 characters (speed 0.8x=260-300, 0.9x=290-340, 1.0x=330-380)
- If duration = 60s → 660-760 characters

- STRUCTURE: Adapt to topic (see TOPIC-AWARE TONE ADAPTATION above)
- First line MUST stop scrolling
- Ending MUST create curiosity or impact (open loop or strong closer)

${lineCountGuidance}`;

  const intensityEngineRule = `
=== INTENSITY ENGINE (MANDATORY FOR EVERY SCRIPT) ===
Every script MUST contain ALL of the following:

1. AT LEAST 1 HARD IMPACT LINE:
   - A short, powerful line that hits like a punch
   - Examples: "Not one trace." / "Gone." / "Nobody survived." / "Dead silence."
   - Must appear naturally within the script flow

2. AT LEAST 1 PATTERN INTERRUPT IN THE MIDDLE:
   - A sudden short line after a longer build
   - An unexpected fact or rhythm break
   - Examples: sudden 1-word line after 5-word lines, shocking detail that changes direction

3. AT LEAST 1 EMOTIONAL OR DISTURBING SPIKE:
   - Family angle, personal detail, or impossible fact
   - Something that makes the viewer feel something visceral
   - Examples: "His daughter was 4." / "The door was locked from inside." / "They never came back."

INTENSITY RULES:
- Avoid generic phrasing like "mysterious events" or "strange occurrences"
- Increase tension PROGRESSIVELY through the script — never flatten
- Never flatten the pacing — always build toward something
- The last 3 lines MUST be the most powerful lines in the entire script
- If the last 3 lines are not the strongest → REWRITE the ending
- Every line must earn its place — no filler, no padding, no generic narration`;

  const hookScriptContinuityRule = `
=== HOOK → SCRIPT CONTINUITY (CRITICAL) ===
The script MUST directly continue the tone and energy of the selected bestHook.

Rules:
- First line of script must feel like a NATURAL continuation of the hook
- Do NOT restart the story from zero after the hook
- Maintain the SAME tension level and style throughout
- If hook is aggressive → script must stay aggressive
- If hook is emotional → script must stay emotional
- If hook is dark → script must stay dark

BAD example:
  Hook: "Vanished. On camera."
  Script: "This is a story about a man who disappeared..."

GOOD example:
  Hook: "Vanished. On camera."
  Script: "He walked into the terminal."

- The hook and script must read as ONE continuous piece
- A listener should not feel a "reset" between hook and script opening`;

  const scriptStructureRule = `
=== SCRIPT STRUCTURE ENFORCEMENT (MANDATORY) ===
Every script MUST follow this exact structure:

OPENING (first 2 lines):
- Immediate continuation of the hook
- Fast escalation — no background explanation
- Do NOT introduce or explain the subject here

BUILD (middle section):
- Add details, tension, progression
- Insert at least 1 pattern interrupt here
- Each line adds new information or raises stakes

SPIKE (climax):
- The most emotional, shocking, or disturbing element
- This is the peak moment — make it hit hard
- Can be a single devastating line

ENDING (last 3 lines):
- MUST be the strongest part of the entire script
- Options: cliffhanger / disturbing realization / unanswered question
- Must NOT feel flat, explanatory, or conclusive
- Must connect back to the opening (loop ending)

If the ending feels weak or explanatory → REWRITE until it's the strongest section.`;

  const intensityLevelRule = `
=== INTENSITY LEVEL SYSTEM ===
Apply intensity based on hook intensity setting:

LOW (safe):
- Softer tone, gentler pacing
- Less aggressive language
- Curiosity over shock
- Longer, more descriptive lines (4-6 words)

MEDIUM (balanced):
- Balanced pacing with clear tension
- Mix of short and medium lines
- Steady emotional build
- Pattern interrupts every 3-4 lines

HIGH (aggressive):
- Strong hooks, more impact lines
- Faster rhythm, shorter lines (2-4 words)
- Pattern interrupts every 2-3 lines
- More emotional weight per line

EXTREME (maximum tension):
- Very short lines (1-3 words dominant)
- Aggressive, punchy phrasing
- Maximum tension and curiosity in every line
- Pattern interrupts every 2 lines
- Every sentence must hit like a punch
- No breathing room — relentless pacing

Intensity level affects: word choice, sentence length, emotional weight, pacing, and number of pattern interrupts.`;

  const platformScriptAdaptationRule = `
=== PLATFORM SCRIPT ADAPTATION (CRITICAL) ===
Do NOT generate identical scripts for all platforms. Adapt style based on primary platform:

TIKTOK:
- Fastest pacing of all platforms
- Shortest lines (1-4 words dominant)
- Most aggressive hooks — situation words only
- Maximum pattern interrupts
- Raw, unfiltered energy
- Conversational but punchy

YOUTUBE SHORTS:
- Slightly more context than TikTok
- Smoother progression between ideas
- Curiosity-driven over shock-driven
- Lines can be 3-6 words
- More narrative flow, less staccato

INSTAGRAM REELS:
- Most emotional / relatable tone
- Personal, human connection focus
- Slightly warmer language
- Relatable situations over shocking facts
- Lines can be 3-5 words with emotional weight

The script should feel optimized for the PRIMARY selected platform.
If multiple platforms selected, optimize for the first one listed.`;

  const finalQualityRule = `
=== FINAL QUALITY CHECK (BEFORE OUTPUT) ===
Before returning the final output, perform this mental check:

1. Read the script as if speaking it out loud
2. Does it flow naturally as a voiceover? If not → rewrite awkward lines
3. Does every line transition smoothly to the next? If not → fix transitions
4. Are there any repeated sentence structures? If yes → vary them
5. Does any line sound robotic, translated, or AI-generated? If yes → rewrite in natural speech
6. Does the hook connect seamlessly to the script opening? If not → fix continuity
7. Is the ending stronger than the middle? If not → strengthen ending

If ANY check fails → rewrite the affected section before returning.
The final output must sound like a skilled human writer, not an AI.`;


  const platformHookRules = `
=== PLATFORM HOOK RULES (CRITICAL) ===

TIKTOK HOOKS:
- First WORD must be a situation word: "Vanished." / "Dead." / "Gone." / "Missing." / "Trapped." / "Erased." / "Found." / "Watched."
- First sentence: max 4 words
- NEVER start with: He / She / They / A man / A woman / In [year] / This is
- Start with SITUATION, not person
- Format: SITUATION → IMPOSSIBLE DETAIL → OPEN QUESTION

YOUTUBE SHORTS HOOKS:
- Curiosity-first, not shock-first
- First sentence: 6–8 words
- Use: "last seen" / "never found" / "vanished" / "on camera" / "no trace"
- Format: NORMAL → DISRUPTION → QUESTION

MULTI-PLATFORM: Generate TikTok hooks first, then adapt for YouTube.
If any hook feels weak or narrative → rewrite internally before returning.`;

  const scrollStopperRule = `
SCROLL STOPPER / OPENING WORD RULE (CRITICAL - HOOK ENGINE):
- The FIRST LINE of the script MUST be maximum 3 words
- First word must be disruptive, emotional, or unusual
- Do NOT explain context in the first line
- Do NOT use generic openings: "This is...", "Did you know...", "Have you ever...", "What if..."
- Aggressive: shocking word ("Cut.", "Dead.", "Wrong.")
- Curiosity: incomplete statement ("He never left.", "Something went wrong.")
- Emotional: human statement ("They were wrong.", "He wasn't ready.")
- Dark: disturbing implication ("This shouldn't happen.", "He wasn't alone.")
- If the script opens with He / She / They / A man / In [year] → REWRITE
- The first line must stop scrolling instantly
- Bad: "London, 1888." / "This is Lars Mittank" / "Did you know..."
- Good: "Vanished." / "Gone." / "Dead. No body." / "Missing."`;

  const patternInterruptRule = `
PATTERN INTERRUPT RULE:
- Every 2–3 lines, break the rhythm:
  - Use a short punch line (1–2 words)
  - Insert an unexpected twist
  - Change the emotional direction
  - Add a micro-cliffhanger
- Examples: "Wait.", "Think again.", "But here's the thing…", "Wrong."`;

  const informationDelayRule = `
INFORMATION DELAY RULE (CRITICAL):
- First 5–8 lines: build mystery WITHOUT naming the subject
- Name/reveal = mid-script payoff
- BAD: "This is Lars Mittank" at line 1
- GOOD: tension → reveal → escalation
- The viewer must be hooked BEFORE they know what the video is about`;

  const rewatchFactorRule = `
REWATCH LOOP RULE (CRITICAL):
- You MUST include exactly one line in the script that:
  - Feels confusing or ambiguous on first watch
  - Reveals a completely new meaning when viewed a second time
  - Makes the viewer go "wait... I need to watch that again"
- This line should be subtle — not obvious
- Mark it internally during generation (do not label it in output)
- The ending must connect subtly to the beginning
- Viewer should feel: something was missed, something is hidden
- Never fully resolve the story
- If no rewatch moment exists → REWRITE the script until it does`;

  const hookVariationRule = `
HOOK ENGINE (5 PSYCHOLOGICAL ANGLES):
- Generate exactly 5 hooks, each with a DIFFERENT psychological angle:
  Hook 1 - Fear: immediate danger or threat
  Hook 2 - Curiosity: open loop, unanswered question
  Hook 3 - WTF: impossible or bizarre situation
  Hook 4 - Conspiracy: hidden truth, cover-up angle
  Hook 5 - Emotional: human loss, family, personal impact
- Each hook MUST be returned as an object: { type: "Fear" | "Curiosity" | "WTF" | "Conspiracy" | "Emotional", hook: "the hook text" }
- The bestHook must be the single strongest one from these 5
- Avoid repeating the same tone across hooks
- If two hooks feel similar → rewrite one

HOOK VALIDATION (MANDATORY - APPLY TO ALL HOOKS):
- Every hook's first line MUST be maximum 3 words
- First word MUST be disruptive, emotional, or unusual
- Do NOT explain context in the first line
- Do NOT use generic openings: "This is the story of...", "Have you ever...", "What if...", "Did you know..."
- The hook MUST create immediate curiosity or tension
- If any hook fails these checks → regenerate that hook
- Output format for bestHook:
  HOOK:
  Line 1 (impact line - max 3 words)
  Line 2 (optional continuation)

VISUAL SYNC RULE (IMPORTANT):
- The first hook line must visually match the first scene in the editing plan
- Ensure the hook can be paired with a strong visual moment
- The opening word/phrase should evoke a clear, filmable image
- Example: "Vanished." pairs with empty room / "Dead." pairs with crime scene`;

  const loopEndingRule = `
LOOP ENDING RULE (CRITICAL):
- The LAST line of the script MUST connect back to the opening
- It must reference the first word or situation from the hook
- Example: if hook starts "Vanished." → ending references vanishing
- Do NOT add any "LOOP:" prefix or label in the script output — the final line must be plain text only
- This creates a circular narrative that rewards rewatching
- The loop ending must still feel natural and not forced`;

  const angleVariationRule = `
ANGLE VARIATION (REQUIRED):
- After generating the main script, generate 3 alternative angles for the same topic
- Each angle is a SINGLE hook line (not a full script), returned as { type, hook }:
  ANGLE 1 - Fear: reframe as personal danger to viewer
  ANGLE 2 - Mystery: focus on unanswered questions only
  ANGLE 3 - Conspiracy: suggest cover-up or hidden party
- Return these in the "angleVariations" array
- Each must be a completely different perspective from the main hook`;

  const editSyncRule = `
EDIT SYNC RULE:
- Each major script beat must match a visual change in the editing plan
- New idea → new scene
- Tension spike → visual shift
- Reveal → strongest visual moment
- The editing plan must mirror script pacing exactly`;

  const platformBehaviorRule = `
PLATFORM BEHAVIOR RULE:
TikTok:
- Faster pacing
- Shorter lines
- More tension spikes
- Aggressive hooks

YouTube Shorts:
- Slightly clearer storytelling
- Smoother transitions
- Curiosity over shock`;

  const retentionHookRule = `
RETENTION HOOK RULE (CRITICAL):
- The LAST LINE of every script MUST be a forward-looking teaser
- It must hint at another mystery, story, or revelation
- Goal: make the viewer want to see the next video
- Examples:
  "And this wasn't the only case like this..."
  "But that's not even the strangest part."
  "What they found next... changed everything."
  "And nobody has explained it since."
- If the ending does not tease something more → REWRITE the ending`;

  const hookQualityGate = `
HOOK QUALITY GATE (MANDATORY):
- Before returning ANY hook, check if it contains at least one of these power words:
  "vanished", "never found", "last seen", "no trace", "on camera", "disappeared", "caught", "exposed", "deleted", "hidden", "forbidden", "secret"
- If the best hook does NOT contain at least one of these words → REWRITE the hook until it does
- This applies to bestHook specifically — other hooks can vary
- Exception: If the topic is clearly educational/motivational and none of these words fit naturally, use equivalent high-tension words like: "nobody tells you", "they don't want you to know", "the truth about", "what really happens"
- NEVER return a weak, generic hook`;

  const commentTriggerRule = `
COMMENT TRIGGER RULE:
- The ending MUST provoke engagement using:
  - Uncertainty
  - Disagreement potential
  - Hidden clue implication
  - A provocative question
  - A theory viewers will debate
- Goal: maximize comments and interaction`;

  const imagePromptRules = getImagePromptRules(input.imageStyle, (input as any).imageMode, (input as any).faceIntensity);

  const thumbnailRules = `
THUMBNAIL IDEAS:
- Generate exactly 2 thumbnail ideas
- Each must include:
  - image: A plain string thumbnail prompt (NOT an object), vertical 9:16, visually strong, platform-ready, high contrast, clickable. Should feature a fictional character's face (extreme close-up, strong emotion) — fictional character, generic person, no real identity, not a celebrity.
  - text: Overlay text, UPPERCASE, max 5 words, punchy and attention-grabbing
- CRITICAL: thumbnail "image" field must be a plain string, never an object
- CRITICAL: Every thumbnail image prompt MUST include "fictional character, no real identity, not a celebrity"
- Match thumbnail style to the selected Hook Style
- Make prompts visually clickable and high-contrast
- Keep text short and punchy
- Do not add extra explanation text`;

  const seoRules = `
SEO PACK:
YOUTUBE:
- Title: must include curiosity gap + emotional trigger + strong wording + #shorts. Avoid generic titles.
- Description: 1–2 sentences, keyword-rich but natural
- Tags: high-relevance searchable keywords
- youtube.tags MUST be a JSON array of strings. Example: ["tag1", "tag2", "tag3"]. Never return tags as a comma-separated string.

TIKTOK:
- Caption: short, emotional, curiosity-driven
- Hashtags: 5–8 high-relevance tags
- tiktok.hashtags MUST be a JSON array of strings. Example: ["#tag1", "#tag2"]. Never return hashtags as a comma-separated string.`;

  const musicRules = `
🎵 VIRAL MUSIC SYSTEM:
- Suggest exactly 3 music ideas as structured objects.
- Each must include:
  - type: music style/genre (e.g., "dark ambient", "lo-fi beat", "emotional piano")
  - source: where to find it (e.g., "TikTok trending", "CapCut library", "YouTube Audio Library", "generic royalty-free")
  - why: one sentence explaining why this music works for this specific content

Match music to content type:
- Horror/mystery: dark ambient, suspense drone, distorted sounds
- Educational: light background beat, minimal lo-fi, clean corporate
- Motivational: uplifting instrumental, emotional piano, epic orchestral
- Entertainment/fun: trending TikTok sounds, upbeat pop, catchy lo-fi
- Selling/business: confident corporate, subtle electronic
- Emotional: piano ballad, ambient strings, reflective acoustic`;

  const seriesRule = `
SERIES POTENTIAL:
- Suggest how this content can become a series (1–2 sentences)
- If the topic naturally lends itself to a multi-part series, describe the angle
- Example: "This works as a '5 things nobody tells you about X' series — each episode covers one shocking fact."
- If the topic doesn't fit a series, suggest a related series angle instead`;

  const viralAnalysisRules = `
VIRAL ANALYSIS (STRUCTURED SCORING):
You MUST score this content honestly. Average content should score 5–7. Only truly exceptional content should score 8+. Never default to 9 or 10.

Score each category from 1 to 10:
- hookStrength: How scroll-stopping is the hook?
- curiosityGap: Does it create an information gap the viewer NEEDS to fill?
- emotionalTrigger: Does it provoke a strong emotion (fear, awe, anger, joy)?
- clarity: Is the message instantly clear within 2 seconds?
- rewatchPotential: Would someone watch this twice?
- commentPotential: Would this provoke comments/debate?
- platformFit: Is this optimized for the target platform's algorithm?

Return:
- viralAnalysis.score: The AVERAGE of all category scores (rounded to 1 decimal)
- viralAnalysis.categories: Array of {name, score} for each category above
- viralAnalysis.strengths: 2–3 short bullet points about what works well
- viralAnalysis.weaknesses: 1–2 short bullet points about what could be improved

CRITICAL: Do NOT inflate scores. Be honest and critical. A generic topic with a weak hook should score 4–6, not 8+.`;

  const qualityEnforcement = `
QUALITY ENFORCEMENT (CRITICAL):
If output feels robotic, too generic, or has a tone mismatch with the topic → REWRITE internally before returning.

QUALITY GATE CHECKLIST (check ALL before returning):
✔ Best hook starts with situation word, not pronoun
✔ Script word count is WITHIN target (15s=40-50, 30s=85-100, 60s=150-180 words) AND character count is WITHIN the hard limit range (15s=160-190, 30s=260-380 depending on speed, 60s=660-760 characters) — if outside range, trim from MIDDLE only (keep first 3 and last 3 lines), then re-check. NEVER return script above limit.
✔ Script contains NO asterisks (*word*), NO stage directions, NO bracketed cues — pure voiceover only
✔ Script has NO "LOOP:" prefix on any line — last line must be plain text
✔ Subject revealed mid-script, not at line 1
✔ Script ends with tension/teaser, not summary
✔ At least 1 unsettling image prompt included
✔ Music suggestions included and match content type
✔ Each hook uses a different emotional trigger
✔ Editing plan syncs with script beats
✔ No fabricated quotes or unverified details (see FACT SAFETY)
✔ Viral score ≥ 8 after auto-fix (see AUTO-FIX RULE)

The script MUST:
- Start with a situation word (see OPENING WORD RULE)
- Delay subject reveal (see INFORMATION DELAY)
- Maintain engagement every 2–3 lines (see PATTERN INTERRUPT RULE)
- Include micro-retention editing cues every 3-4 lines (see MICRO-RETENTION TRIGGERS)
- Include at least one rewatch-worthy moment (see REWATCH LOOP)
- End with a forward-looking teaser (see RETENTION HOOK)
- End with a comment trigger (see COMMENT TRIGGER)
- Match the tone to the topic category (NOT always dark/horror)
- Sound human and natural, not AI-generated
- Be immediately usable for voice recording (after removing bracketed cues)
- Must feel like a PERFORMANCE, not narration

PACING MUST FEEL LIKE A PERFORMANCE:
- Opening: 1–3 word punch
- Middle: tension build, 3–6 words
- Peak: short fast cuts
- End: slow down → tension
- Never repeat same-length sentences consecutively

FORBIDDEN:
- Flat narration
- Tone mismatch (e.g., horror tone for a health tip)
- Over-explaining
- Robotic or translated-sounding language
- Generic phrasing that could apply to any topic
- Safe, predictable endings
- Opening with pronouns (He/She/They)
- Revealing the subject in line 1
- Fabricating specific quotes or dialogue
- Returning viral score below 8 without attempting auto-fix`;

  const outputRules = `
IMPORTANT:
- Do not explain anything
- Do not add extra commentary
- Output only the structured result
- Make everything instantly usable for content creation
- Script must be directly readable for voice recording
- If script is written as paragraph, output is INVALID
- Content must feel human, not AI-generated
- Must match topic type naturally
- Must match language naturally
- Return only valid JSON`;

  if (input.mode === "pro") {
    const customBlock = input.customDescription
      ? `\nCUSTOM USER INSTRUCTIONS (prioritize these over presets):\n${input.customDescription}\n`
      : "";

    return `You are an advanced AI short-form content engine designed to generate viral-ready, high-retention content for TikTok, Instagram Reels, and YouTube Shorts.
Your goal is to create content that is immediately usable, emotionally engaging, and optimized for maximum watch time and interaction.
You MUST adapt tone, structure, and style based on the topic, language, and user selections.
${factSafetyRule}

${globalRules}

${languageBehavior}

${topicAdaptation}

Create a PRO content production package:
- Topic: ${input.topic}
- Language: ${input.language}
- Platforms: ${platformList}
- Content type: ${input.contentType}
- Style: ${input.style}
- Duration: ${input.scriptLength} seconds
- Goal: ${input.goal}
- Hook intensity: ${hookLevel}
- Target audience: ${input.targetAudience}
- Hook style: ${input.hookStyle}
- Output depth: ${input.depth}
${customBlock}
${targetAudienceInstructions}

${hookStyleInstructions}

STYLE BEHAVIOR:
${styleInstructions}

GOAL BEHAVIOR:
${goalInstructions}

${hookIntensityInstructions}

CONTENT TYPE:
${contentTypeInstructions}

${platformHookRules}

HOOK LENGTH RULES:
- First sentence of every hook = maximum 4 words
- Never start hook with: He, She, They, A man, A woman
- Always start with situation word: Vanished. / Dead. / Gone. / Missing. / Trapped. / Found. / Erased. / Poisoned.
- If hook violates these rules → rewrite before returning

HOOK GENERATION:
- Generate exactly 5 hooks with different psychological angles (see HOOK ENGINE)
- Each hook = { type, hook } object
- Create immediate curiosity gap
- Max 6 words per hook
- Avoid safe or explanatory language
- Adapt hook tone to match topic (not always dark/shocking)

BEST HOOK:
- Select the single most viral hook and return it as bestHook

${hookVariationRule}

${loopEndingRule}

${angleVariationRule}


${autoFixRule}

${microRetentionRule}

${scriptFormatRules}

${intensityEngineRule}

${hookScriptContinuityRule}

${scriptStructureRule}

${intensityLevelRule}

${platformScriptAdaptationRule}

${informationDelayRule}

${patternInterruptRule}

${rewatchFactorRule}

${retentionHookRule}

${hookQualityGate}

${commentTriggerRule}

${editSyncRule}

${platformBehaviorRule}

${creatorDNA}

${viralRetentionMechanics}

EDITING PLAN:
- Provide scenes with sequential numbering (scene: 1, scene: 2, etc.)
- The "visual" field must describe the visual ONLY — do NOT start with "Scene 1:" or "Scene X:" prefix. The UI adds scene numbers automatically.
- Optional on-screen text and mood
- Keep it short and practical
- Match content type

VISUAL SYNC:
- Every 2–3 lines of the script must be visualizable
- Avoid abstract-only writing — connect to concrete visuals

${imagePromptRules}

${thumbnailRules}

${seoRules}

${platforms_include_instagram(input.platforms)}

${musicRules}

${seriesRule}

${viralAnalysisRules}

${qualityEnforcement}

${finalQualityRule}

GENERATE:
1. bestHook: The single strongest scroll-stopping hook
2. hooks: exactly 5 hooks as {type, hook} objects (Fear, Curiosity, WTF, Conspiracy, Emotional)
3. hookVariations: ${input.hookCount} rewrites (different angles, styles, emotional triggers)
4. script: Plain voiceover text, one sentence per line, with empty lines for pacing. NO labels, NO structure markers, NO "LOOP:" prefix. Last line connects back to opening naturally.
5. editingPlan: scenes with visual, onScreenText, mood
6. voiceStyle: recommended voice style
7. postingStrategy: bestTime and platformTip
8. imagePrompts: exactly 5 cinematic prompts
9. youtube: title, description, tags
10. tiktok: caption, hashtags
11. music: exactly 3 music suggestions, each with type, source, why
12. seriesPotential: how this can become a series
13. thumbnails: exactly 2 thumbnail ideas, each with image prompt and overlay text
14. angleVariations: exactly 3 alternative angle hooks as {type, hook} objects (Fear, Mystery, Conspiracy)
${input.platforms.includes("instagram-reels") ? "15. instagramCaption: Instagram caption with hashtags\n16. viralAnalysis: score (1-10) and reasons array" : "15. viralAnalysis: score (1-10) and reasons array"}

- ${input.depth === "concise" ? "Keep everything minimal and tight" : input.depth === "detailed" ? "Add extra detail and depth" : "Balance detail and brevity"}
${outputRules}`;
  }

  return `You are an advanced AI short-form content engine designed to generate viral-ready, high-retention content for TikTok, Instagram Reels, and YouTube Shorts.
Your goal is to create content that is immediately usable, emotionally engaging, and optimized for maximum watch time and interaction.
You MUST adapt tone, structure, and style based on the topic, language, and user selections.
${factSafetyRule}

${globalRules}

${languageBehavior}

${topicAdaptation}

Create a content package:
- Topic: ${input.topic}
- Language: ${input.language}
- Platform: ${platformList}
- Content type: ${input.contentType}
- Style: ${input.style}
- Duration: ${input.scriptLength} seconds
- Goal: ${input.goal}
- Hook intensity: ${hookLevel}
- Target audience: ${input.targetAudience}
- Hook style: ${input.hookStyle}

${targetAudienceInstructions}

${hookStyleInstructions}

STYLE BEHAVIOR:
${styleInstructions}

GOAL BEHAVIOR:
${goalInstructions}

${hookIntensityInstructions}

CONTENT TYPE:
${contentTypeInstructions}

${platformHookRules}

HOOK LENGTH RULES:
- First sentence of every hook = maximum 4 words
- Never start hook with: He, She, They, A man, A woman
- Always start with situation word: Vanished. / Dead. / Gone. / Missing. / Trapped. / Found. / Erased. / Poisoned.
- If hook violates these rules → rewrite before returning

HOOK GENERATION:
- Generate exactly 5 hooks with different psychological angles (see HOOK ENGINE)
- Each hook = { type, hook } object
- Create immediate curiosity gap
- Max 6 words per hook
- Avoid safe or explanatory language
- Adapt hook tone to match topic

BEST HOOK:
- Select the single most viral hook and return it as bestHook

${hookVariationRule}

${loopEndingRule}

${angleVariationRule}


${autoFixRule}

${microRetentionRule}

${scriptFormatRules}

${intensityEngineRule}

${hookScriptContinuityRule}

${scriptStructureRule}

${intensityLevelRule}

${platformScriptAdaptationRule}

${informationDelayRule}

${patternInterruptRule}

${rewatchFactorRule}

${retentionHookRule}

${hookQualityGate}

${commentTriggerRule}

${editSyncRule}

${platformBehaviorRule}

EDITING PLAN:
- Provide scenes with sequential numbering (scene: 1, scene: 2, etc.)
- The "visual" field must describe the visual ONLY — do NOT start with "Scene 1:" or "Scene X:" prefix. The UI adds scene numbers automatically.
- Optional on-screen text and mood
- Keep it short and practical
- Match content type

VISUAL SYNC:
- Every 2–3 lines of the script must be visualizable
- Avoid abstract-only writing

${creatorDNA}

${viralRetentionMechanics}

${imagePromptRules}

${thumbnailRules}

${seoRules}

${musicRules}

${seriesRule}

${viralAnalysisRules}

${qualityEnforcement}

${finalQualityRule}

GENERATE:
1. hooks: exactly 5 hooks as {type, hook} objects (Fear, Curiosity, WTF, Conspiracy, Emotional)
2. bestHook: the single strongest hook (marked with ⭐ in output)
3. script: voiceover text, one line per sentence. Last line connects back to opening (no LOOP: prefix).
4. editingPlan: scenes
5. imagePrompts: 5 prompts
6. youtube: title, description, tags
7. tiktok: caption, hashtags
8. music: exactly 3 music suggestions, each with type, source, why
9. seriesPotential: how this can become a series
10. thumbnails: exactly 2 thumbnail ideas, each with image prompt and overlay text
11. angleVariations: exactly 3 alternative angle hooks as {type, hook} objects (Fear, Mystery, Conspiracy)
12. viralAnalysis: score (1-10) and reasons array

${outputRules}`;
}

function platforms_include_instagram(platforms: string[]): string {
  if (platforms.includes("instagram-reels")) {
    return "INSTAGRAM:\n- instagramCaption: Instagram Reels caption with hashtags";
  }
  return "";
}

// ── Horror Mode ──────────────────────────────────────────────────────

function buildHorrorSchema() {
  return {
    type: "OBJECT",
    properties: {
      title: { type: "STRING" },
      bestHook: { type: "STRING" },
      hooks: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING" },
            hook: { type: "STRING" },
          },
          required: ["type", "hook"],
        },
      },
      hookVariations: { type: "ARRAY", items: { type: "STRING" } },
      angleVariations: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING" },
            hook: { type: "STRING" },
          },
          required: ["type", "hook"],
        },
      },
      script: { type: "STRING" },
      textOverlays: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            text: { type: "STRING" },
            timing: { type: "STRING" },
          },
          required: ["text", "timing"],
        },
      },
      imagePrompts: { type: "ARRAY", items: { type: "STRING" } },
      thumbnails: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            image: { type: "STRING" },
            text: { type: "STRING" },
          },
          required: ["image", "text"],
        },
      },
      audioDirective: { type: "STRING" },
      animationNotes: { type: "STRING" },
      editingPlan: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            scene: { type: "NUMBER" },
            visual: { type: "STRING" },
            onScreenText: { type: "STRING" },
            mood: { type: "STRING" },
          },
          required: ["scene", "visual"],
        },
      },
      youtube: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          description: { type: "STRING" },
          tags: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["title", "description", "tags"],
      },
      tiktok: {
        type: "OBJECT",
        properties: {
          caption: { type: "STRING" },
          hashtags: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["caption", "hashtags"],
      },
      music: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            type: { type: "STRING" },
            source: { type: "STRING" },
            why: { type: "STRING" },
          },
          required: ["type", "source", "why"],
        },
      },
      seriesPotential: { type: "STRING" },
      viralAnalysis: {
        type: "OBJECT",
        properties: {
          score: { type: "NUMBER" },
          categories: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING" },
                score: { type: "NUMBER" },
              },
              required: ["name", "score"],
            },
          },
          strengths: { type: "ARRAY", items: { type: "STRING" } },
          weaknesses: { type: "ARRAY", items: { type: "STRING" } },
        },
        required: ["score", "categories", "strengths", "weaknesses"],
      },
    },
    required: [
      "title", "bestHook", "hooks", "hookVariations", "angleVariations",
      "script", "textOverlays", "imagePrompts", "thumbnails",
      "audioDirective", "animationNotes", "editingPlan",
      "youtube", "tiktok", "music", "seriesPotential", "viralAnalysis",
    ],
  };
}

function buildHorrorPrompt(topic: string, language: string, scriptLength: string, targetAudience: string, autoFixForced: boolean, threatType?: string | null): string {
  const topicInstruction = topic
    ? "Topic/Setting: " + topic + "\nUse the provided country and phenomenon as the basis for the urban legend."
    : "Choose a RANDOM country and a unique local phenomenon/location/object as the basis for the urban legend. Be creative and varied — never default to the same country twice.";

  const threatTypeMap: Record<string, string> = {
    "wrong-reflection": "Wrong reflection",
    "doppelganger": "Duplicate self / doppelganger",
    "voice-mimicry": "Voice mimicry",
    "something-inside": "Something already inside",
    "identity-swap": "Identity swap",
    "shadow-entity": "Shadows acting independently",
  };
  const threatInstruction = threatType && threatTypeMap[threatType]
    ? `\n\nCRITICAL THREAT TYPE OVERRIDE: The supernatural twist in Step 6 MUST be: ${threatTypeMap[threatType]}. Do not use any other threat type.`
    : "";

  const langNote = language === "Turkish" ? "\nWrite in natural, fluent Turkish. Do NOT translate from English." : "";
  const autoFixNote = autoFixForced ? "\nAUTO-FIX MODE IS FORCED. Rewrite with maximum tension. Viral score MUST be at least 8.5." : "";

  return "You are the world's most specialized viral short-form content architect for psychological horror channels.\n\nYou do not tell stories. You engineer psychological traps.\n\nCHANNEL DNA:\n- Theme: Forbidden knowledge, psychological horror, localized urban legends, impossible existential realities\n- Tone: Ominous. Authoritative. Uncanny calm. Never theatrical\n- Core Philosophy: The viewer must feel they are receiving a suppressed documentary warning, NOT watching fiction\n- Format: 30-40 seconds / 80-110 words maximum\n\nLanguage: " + language + langNote + "\nTarget Audience: " + targetAudience + "\n\n" + topicInstruction + threatInstruction + "\n\nTHE PSYCHOLOGY ENGINE:\n1. Never explain the origin of the threat\n2. Never resolve the danger\n3. Break the 4th wall in the final line\n4. Use 1-6 word sentences ONLY\n5. Each line must be a realization, a rule, or a warning\n\nMANDATORY SCRIPT STRUCTURE (7 STEPS):\nStep 1 - AGGRESSIVE HOOK: Begin EXACTLY with \"Did you know... in [COUNTRY]\"\nStep 2 - HIDDEN TRUTH: Reveal a chilling local secret as established fact\nStep 3 - THE RULE: State an illogical survival rule locals follow\nStep 4 - SOMETHING IS WRONG: The rule was broken. One sharp sentence.\nStep 5 - ESCALATION: Compress time. Make danger feel immediate.\nStep 6 - DISTURBING SHIFT: One uncanny element (choose one):\n  - Duplicate self / doppelganger\n  - Wrong reflection\n  - Voice mimicry\n  - Something already inside\n  - Identity swap\n  - Shadows acting independently\nStep 7 - FINAL WARNING: Speak DIRECTLY to the viewer. Issue a chilling command. No resolution. No comfort.\n\nSCRIPT RULES:\n- Word count: 80-110 words ONLY\n- Sentence length: 1-6 words maximum\n- Filler words: ZERO\n- Every line must raise tension\n- One impossible element required\n- One psychological twist required\n- Ending: Unresolved\n- Script must be pure voiceover text — NO asterisks, NO stage directions, NO bracketed cues\n\nTEXT OVERLAYS (5 MANDATORY):\nGenerate exactly 5 text overlays for CapCut.\n- 1-3 words each, uppercase\n- Bold Impact font on thick solid RED banner\n- Include timing (e.g. \"at 0:08\")\n- Examples: WRONG FACE / DON'T LOOK / STILL THERE / BEHIND YOU / TOO LATE / NOT HUMAN / ALREADY INSIDE\n\nIMAGE STYLE (SEMI-REALISTIC 2D):\nEvery image prompt must begin with: \"A graphic novel illustration of...\"\nSafe language rules:\n- NEVER: terrified, horror, screaming, blood, dying, dead\n- ALWAYS USE: deeply unsettled, dark and eerie, wide eyes catching light, an unseen presence, motionless\n\nMANDATORY IMAGE STYLE SUFFIX (add to EVERY image prompt):\n\"Art style: semi-realistic cel-shaded illustration. Characters have thick bold black outlines with flat color fills and 2-3 discrete hard-edged shadow levels, no smooth gradients on characters. Background: atmospheric gradient shading with dense volumetric fog and light beams cutting through darkness. Lighting: single chiaroscuro light source, 70-80% of frame in deep pitch-black shadow. Color palette: deep blacks, charcoal grays, cold navy blues, single vivid blood-red accent only. Composition: vertical 9:16, subject slightly off-center, large dark negative space above subject. Mood: eerie, uncanny valley. NOT photorealistic. NOT 3D. NOT anime.\"\n\nTHUMBNAIL PROMPT:\nBegin with: \"A dark semi-realistic cel-shaded illustration, extreme close-up portrait of an adult, face centered in vertical 9:16 frame.\"\nInclude: Kubrick Stare, one side in complete shadow, wide eyes catching cold light, unnervingly still expression.\nAdd full style suffix.\nAfter prompt add: \"CANVA BANNER: Thick solid red rectangle across center. White IMPACT font, 1-3 words. Options: NOT HUMAN / DON'T LOOK / IT'S YOU / STILL HERE\"\n\nAUDIO DIRECTIVES:\nVoice: Deep, slow, subtly threatening male\nElevenLabs Settings: Stability: 45% / Clarity/Similarity: 85% / Style Exaggeration: 15% / Speed: 0.9x\n\nANIMATION NOTES (CAPCUT):\n- Scene 1-2: Slow zoom in (Ken Burns)\n- Scene 3: Glitch cut at supernatural twist moment\n- Scene 4-5: Static + very slow zoom out\n- Text overlays: flash 0.8-1 second max\n- Color grade: Saturation -30% / Contrast +40% / Cold blue tint\n- Final frame: freeze 1 second, hard cut to black\n\nTITLE FORMAT: [Entity Name] | [Country] Urban Legend\n\nCONTENT VARIATION RULES:\nEvery video MUST change all four:\n- Country (never repeat)\n- Scenario (never repeat)\n- Character (vary age, gender, relationship)\n- Threat type (rotate through all 6 elements in Step 6)" + autoFixNote + "\n\nOUTPUT FORMAT (produce in this exact order):\n1. title: TITLE in format [Entity Name] | [Country] Urban Legend\n2. bestHook: The strongest hook line\n3. hooks: 5 hooks as {type, hook} objects\n4. hookVariations: 5 hook rewrites\n5. angleVariations: 3 alternative angles as {type, hook}\n6. script: FULL SCRIPT (line by line, following 7 steps, pure voiceover text)\n7. textOverlays: 5 text overlays with timing as {text, timing}\n8. imagePrompts: 5 image prompts with full style suffix each\n9. thumbnails: 2 thumbnail ideas with banner note\n10. audioDirective: Audio directive text\n11. animationNotes: Animation notes text\n12. editingPlan: scenes with visual, onScreenText, mood\n13. youtube: title, description, tags\n14. tiktok: caption, hashtags\n15. music: 3 music suggestions as {type, source, why}\n16. seriesPotential: series potential text\n17. viralAnalysis: score, categories, strengths, weaknesses\n\nReturn only valid JSON. No explanation. No markdown.";
}
