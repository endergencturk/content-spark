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
    } = body;

    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const selectedPlatforms: string[] =
      platforms && Array.isArray(platforms) && platforms.length > 0
        ? platforms
        : platform
        ? [platform]
        : ["tiktok"];

    const lang = language === "tr" ? "Turkish" : "English";
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
    });

    const schema = mode === "pro"
      ? buildProSchema(selectedPlatforms, hookCount)
      : buildFreeSchema();

    const geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
    const geminiBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: mode === "pro" ? 0.8 : 0.7,
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    };

    let response: Response | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 25000);
        response = await fetch(geminiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-goog-api-key": GEMINI_API_KEY,
          },
          body: JSON.stringify(geminiBody),
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (response.ok) break;

        const errBody = await response.text();
        if (/high demand|overloaded|unavailable|503|429/i.test(errBody)) {
          console.warn(`Gemini attempt ${attempt + 1} failed (transient): ${response.status}`);
          response = null;
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        console.error("Gemini API error:", errBody);
        throw new Error(errBody || "Gemini request failed");
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }
        throw e;
      }
    }

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

// ── Schema builders ─────────────────────────────────────────────────

function buildFreeSchema() {
  return {
    type: "OBJECT",
    properties: {
      hooks: { type: "ARRAY", items: { type: "STRING" } },
      bestHook: { type: "STRING" },
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
      viralAnalysis: viralAnalysisSchema,
    },
    required: ["hooks", "bestHook", "script", "editingPlan", "imagePrompts", "youtube", "tiktok", "viralAnalysis"],
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
    hookVariations: { type: "ARRAY", items: { type: "STRING" } },
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
    viralAnalysis: viralAnalysisSchema,
  };

  const required = [
    "bestHook", "hookVariations", "script", "editingPlan",
    "voiceStyle", "postingStrategy", "imagePrompts", "youtube", "tiktok", "viralAnalysis",
  ];

  if (platforms.includes("instagram-reels")) {
    props.instagramCaption = { type: "STRING" };
    required.push("instagramCaption");
  }

  return { type: "OBJECT", properties: props, required };
}

// ── Prompt builder ──────────────────────────────────────────────────

function getScriptCharacterLimit(scriptLength: string): string {
  switch (scriptLength) {
    case "15": return "STRICT CHARACTER LIMIT: 150–220 characters max. If exceeded, output is INVALID.";
    case "30": return "STRICT CHARACTER LIMIT: 250–350 characters max. If exceeded, output is INVALID.";
    case "60": return "STRICT CHARACTER LIMIT: 500–700 characters max. If exceeded, output is INVALID.";
    default: return "STRICT CHARACTER LIMIT: 250–350 characters max. If exceeded, output is INVALID.";
  }
}

function getContentDensityGuidance(scriptLength: string): string {
  switch (scriptLength) {
    case "15": return `CONTENT DENSITY (15s):
- Use only 1–2 ideas maximum
- Focus on the single most impactful moment
- Do NOT try to cover the full story
- Leave the viewer wanting more`;
    case "30": return `CONTENT DENSITY (30s):
- Use 2–3 key ideas
- Focus on the most compelling parts
- Keep buildup minimal
- End with a strong open loop`;
    case "60": return `CONTENT DENSITY (60s):
- Add context, buildup, and escalation layers
- Develop 3–5 ideas with proper narrative flow
- Allow room for tension building and payoff
- Create a complete story arc`;
    default: return "";
  }
}

function getStyleInstructions(style: string): string {
  switch (style) {
    case "high-retention": return "Use fast pacing, pattern interrupts, and open loops. Keep the viewer hooked every 3 seconds.";
    case "curiosity": return "Create information gaps. Delay key reveals. Make the viewer NEED to keep watching.";
    case "emotional": return "Use emotional triggers and deeply relatable language. Make them feel something.";
    case "suspense": return "Build tension, ambiguity, and intrigue. Use cliffhanger-style pacing.";
    case "controversial": return "Use bold, opinionated statements. Challenge conventional thinking. Be polarizing but not offensive.";
    case "viral": return "Scroll-stopping energy. Trending hooks. Pattern-interrupt openers.";
    case "educational": return "Clear, structured, valuable. Teach something useful fast.";
    case "story": return "Narrative arc. Relatable situation. Emotional payoff.";
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
}

function buildPrompt(input: PromptInput) {
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

  const charLimit = getScriptCharacterLimit(input.scriptLength);
  const densityGuidance = getContentDensityGuidance(input.scriptLength);
  const styleInstructions = getStyleInstructions(input.style);

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
- Content must feel like: "I need to watch this", "What happens next?", "This is not normal".`;

  const scriptFormatRules = `
VOICE SCRIPT (CRITICAL):
- Generate a voiceover script optimized for ElevenLabs.
- ${charLimit}
- FORMAT (STRICT):
  - Each line = 2–6 words ONLY
  - One idea per line
  - Use many short lines
  - Break sentences often
  - NEVER use paragraphs
  - NEVER combine sentences
  - Add empty lines between sections for breathing space
  - Use pauses: "..." and "—" for dramatic effect
  - Use single-word lines when impactful (e.g., "Gone.", "Silence.", "Nothing.")
- STYLE:
  - Dark
  - Suspenseful
  - Psychological
  - Immersive
  - Use interruption patterns: "But then...", "Or so you think.", "Something is wrong."
- STRUCTURE: Hook → Build tension → Disturbance → Twist → Open ending
- CRITICAL:
  - First line MUST stop scrolling (shocking / unexpected)
  - Ending MUST create curiosity (never fully resolve — leave an open loop)
  - Count characters before returning — if over the limit, shorten the script
  - Create breathing space for voice recording
- DO NOT use labels like "Beat 1", "Beat 2", "Hook:", "CTA:"
- DO NOT write paragraphs — if the script is a paragraph, the output is INVALID

${densityGuidance}`;

  const imagePromptRules = `
IMAGE PROMPTS:
- Generate exactly 5 prompts.
- Each must include: scene description, lighting details, atmosphere, camera feel.
- Format: [scene], [lighting], [atmosphere], cinematic, photorealistic, vertical 9:16, no text, no faces`;

  const seoRules = `
SEO PACK:
YOUTUBE:
- Title: must include curiosity gap + emotional trigger + strong wording + #shorts. Avoid generic titles.
- Description: 1–2 sentences, keyword-rich but natural
- Tags: high-relevance searchable keywords

TIKTOK:
- Caption: short, emotional, curiosity-driven
- Hashtags: 5–8 high-relevance tags`;

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

  const outputRules = `
IMPORTANT:
- Do not explain anything
- Do not add extra commentary
- Output only the structured result
- Make everything instantly usable for content creation
- Script must be directly readable for voice recording
- If script is written as paragraph, output is INVALID
- Return only valid JSON`;

  if (input.mode === "pro") {
    const customBlock = input.customDescription
      ? `\nCUSTOM USER INSTRUCTIONS (prioritize these over presets):\n${input.customDescription}\n`
      : "";

    return `You are an AI short-form content engine designed to generate viral-ready content for TikTok, Instagram Reels, and YouTube Shorts.
${globalRules}

Create a PRO content production package:
- Topic: ${input.topic}
- Language: ${input.language}
- Platforms: ${platformList}
- Content type: ${input.contentType}
- Style: ${input.style}
- Duration: ${input.scriptLength} seconds
- Goal: ${input.goal}
- Hook intensity: ${hookLevel}
- Output depth: ${input.depth}
${customBlock}
STYLE BEHAVIOR:
${styleInstructions}

HOOK GENERATION:
- Generate 5–8 hooks (use stronger psychological triggers: fear, urgency, surprise, curiosity)
- Max 6 words per hook
- Extremely punchy and aggressive
- Use curiosity + shock
- Avoid safe phrasing
- First hook must be the strongest

BEST HOOK:
- Select the single most viral hook and return it as bestHook

${scriptFormatRules}

EDITING PLAN:
- Provide scenes: Scene 1, Scene 2, etc.
- What is shown (visual)
- Optional on-screen text
- Mood/effect (if needed)
- Keep it short and practical

${imagePromptRules}

${seoRules}

${platforms_include_instagram(input.platforms)}

${viralAnalysisRules}

GENERATE:
1. bestHook: The single strongest scroll-stopping hook
2. hookVariations: ${input.hookCount} rewrites (different angles, styles, emotional triggers)
3. script: Plain voiceover text, one sentence per line, with empty lines for pacing. NO labels, NO structure markers.
4. editingPlan: scenes with visual, onScreenText, mood
5. voiceStyle: recommended voice style
6. postingStrategy: bestTime and platformTip
7. imagePrompts: exactly 5 cinematic prompts
8. youtube: title, description, tags
9. tiktok: caption, hashtags
${input.platforms.includes("instagram-reels") ? "10. instagramCaption: Instagram caption with hashtags\n11. viralAnalysis: score (1-10) and reasons array" : "10. viralAnalysis: score (1-10) and reasons array"}

- ${input.depth === "concise" ? "Keep everything minimal and tight" : input.depth === "detailed" ? "Add extra detail and depth" : "Balance detail and brevity"}
${outputRules}`;
  }

  return `You are an AI short-form content engine designed to generate viral-ready content for TikTok, Instagram Reels, and YouTube Shorts.
${globalRules}

Create a content package:
- Topic: ${input.topic}
- Language: ${input.language}
- Platform: ${platformList}
- Content type: ${input.contentType}
- Style: ${input.style}
- Duration: ${input.scriptLength} seconds
- Goal: ${input.goal}
- Hook intensity: ${hookLevel}

STYLE BEHAVIOR:
${styleInstructions}

HOOK GENERATION:
- Generate exactly 3 hooks
- Max 6 words per hook
- Extremely punchy and aggressive
- Use curiosity + shock
- Avoid safe phrasing
- First hook must be the strongest

BEST HOOK:
- Select the single most viral hook and return it as bestHook

${scriptFormatRules}

EDITING PLAN:
- Provide scenes with visual description
- Optional on-screen text and mood
- Keep it short and practical

${imagePromptRules}

${seoRules}

${viralAnalysisRules}

GENERATE:
1. hooks: exactly 3 hooks
2. bestHook: the single strongest hook (marked with ⭐ in output)
3. script: voiceover text, one line per sentence
4. editingPlan: scenes
5. imagePrompts: 5 prompts
6. youtube: title, description, tags
7. tiktok: caption, hashtags
8. viralAnalysis: score (1-10) and reasons array

${outputRules}`;
}

function platforms_include_instagram(platforms: string[]): string {
  if (platforms.includes("instagram-reels")) {
    return "INSTAGRAM:\n- instagramCaption: Instagram Reels caption with hashtags";
  }
  return "";
}
