import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

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

Generate 5 viral content ideas optimized for short-form video.

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

Return exactly 5 ideas as JSON.`;

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
              },
              required: ["title", "why"],
            },
          },
        },
        required: ["ideas"],
      };

      const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
      const geminiBody = {
        contents: [{ parts: [{ text: discoveryPrompt }] }],
        generationConfig: {
          temperature: 0.9,
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
        maxOutputTokens: 8192,
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
    console.error("generate-content error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// ── Fetch with retry + Lovable AI fallback ──────────────────────────

async function fetchWithRetry(url: string, apiKey: string, body: any): Promise<Response | null> {
  let response: Response | null = null;
  const delays = [1500, 3000, 5000]; // 3 attempts, then fallback quickly

  for (let attempt = 0; attempt < delays.length; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
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
      const timeout = setTimeout(() => controller.abort(), 55000);
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
        // Wrap in a Gemini-compatible response shape
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
    case "curiosity": return `HOOK STYLE: CURIOSITY
- Open-loop phrasing
- "Nobody noticed...", "What if...", unanswered tension
- Create information gaps the viewer NEEDS to fill
- Delay the reveal as long as possible`;
    case "emotional": return `HOOK STYLE: EMOTIONAL
- Personal, relatable, human-centered framing
- Use "you" and "your" to connect
- Tap into shared human experiences
- Make the viewer feel seen or understood`;
    case "dark": return `HOOK STYLE: DARK
- Suspenseful, unsettling, slower tension
- Ominous word choices
- Build dread gradually
- Leave something unexplained`;
    default: return `HOOK STYLE: AGGRESSIVE
- Shocking opening, maximum impact
- Strongest possible first phrase
- Max 4 words in opening line
- Hit hard and fast, no buildup`;
  }
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
- Generate a voiceover script optimized for ElevenLabs TTS at speed 1.0.
- OUTPUT FORMAT (MANDATORY):
  - Pure voiceover text ONLY
  - NO bracketed cues like [pause], [cut], [zoom], [whisper] — these go ONLY in editingPlan
  - NO asterisks (*word*) — ElevenLabs reads them literally
  - NO stage directions of any kind
  - NO action notes or labels (Beat 1, Hook:, CTA:)
  - NO parenthetical instructions
  - Each line = one breath = max 6 words
  - One idea per line
  - NEVER write paragraphs — if the script is a paragraph, the output is INVALID
  - Use "..." for pauses and "—" for dramatic breaks
  - Add empty lines between sections for breathing space

- MANDATORY CHARACTER COUNT RULES - YOU MUST FOLLOW:
  - Count characters in script (letters + spaces + punctuation).
  - 15 seconds = write exactly 160-190 characters. Count them.
  - 30 seconds = write exactly 330-380 characters. Count them.
  - 60 seconds = write exactly 660-760 characters. Count them.
  - After writing the script:
    1. Count every character (including spaces and punctuation)
    2. If under minimum → add tension lines before ending
    3. If over maximum → remove lines from middle only
    4. Count again
    5. Only return script when character count is correct
  - This rule overrides everything else.
  - This is NON-NEGOTIABLE. Outside the range = INVALID output.
  - Never return script outside these ranges.

- STRUCTURE: Adapt to topic (see TOPIC-AWARE TONE ADAPTATION above)
- First line MUST stop scrolling
- Ending MUST create curiosity or impact (open loop or strong closer)
- If script is too short for the duration, expand with examples or transitions — but NEVER exceed the word limit

${lineCountGuidance}`;

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
SCROLL STOPPER / OPENING WORD RULE (CRITICAL):
- The FIRST SPOKEN WORD of the script must match TikTok hook rule
- First word must be a situation word (Vanished / Dead / Gone / Missing / Trapped / Found / etc.)
- If the script opens with He / She / They / A man → REWRITE
- The first line must stop scrolling instantly
- Bad: "London, 1888." / "This is Lars Mittank" / "Did you know..."
- Good: "Vanished." / "Gone." / "Dead. No body." / "Missing. No trace."`;

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
- If two hooks feel similar → rewrite one`;

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

  const imagePromptRules = `
IMAGE PROMPTS:
- Generate exactly 5 prompts.
- Each must include: scene description, lighting details, atmosphere, camera feel.
- Format: [scene], [lighting], [mood], cinematic, photorealistic, vertical 9:16, no text, no faces, no identifiable people, no portraits
- CRITICAL: Every prompt MUST end with "no faces, no identifiable people, no portraits"
- CRITICAL: At least 1 prompt MUST be unsettling, surreal, or visually impossible`;

  const thumbnailRules = `
THUMBNAIL IDEAS:
- Generate exactly 2 thumbnail ideas
- Each must include:
  - image: A thumbnail prompt, vertical 9:16, visually strong, platform-ready, high contrast, clickable, no faces, no identifiable people, no portraits
  - text: Overlay text, UPPERCASE, max 5 words, punchy and attention-grabbing
- CRITICAL: Every thumbnail image prompt MUST include "no faces, no identifiable people, no portraits"
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
✔ Script character count is WITHIN the hard limit range (15s=160-190, 30s=330-380, 60s=660-760 characters) — if outside range, trim from MIDDLE only (keep first 3 and last 3 lines), then re-check. NEVER return script above limit.
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

${scrollStopperRule}

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
- Avoid abstract-only writing — connect to concrete visuals

${imagePromptRules}

${thumbnailRules}

${seoRules}

${platforms_include_instagram(input.platforms)}

${musicRules}

${seriesRule}

${viralAnalysisRules}

${qualityEnforcement}

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

${scrollStopperRule}

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

${imagePromptRules}

${thumbnailRules}

${seoRules}

${musicRules}

${seriesRule}

${viralAnalysisRules}

${qualityEnforcement}

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
