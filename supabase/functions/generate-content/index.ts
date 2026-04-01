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
    const imgCount = 5;
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
      imgCount,
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

// ── Schema builders ─────────────────────────────────────────────────

function buildFreeSchema() {
  return {
    type: "OBJECT",
    properties: {
      hooks: { type: "ARRAY", items: { type: "STRING" } },
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
    },
    required: ["hooks", "script", "editingPlan", "imagePrompts", "youtube", "tiktok"],
  };
}

function buildProSchema(platforms: string[], hookCount: number) {
  const scriptSection = {
    type: "OBJECT",
    properties: {
      hook: { type: "STRING" },
      beat1: { type: "STRING" },
      beat2: { type: "STRING" },
      beat3: { type: "STRING" },
      cta: { type: "STRING" },
    },
    required: ["hook", "beat1", "beat2", "beat3", "cta"],
  };

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
    script: scriptSection,
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
  };

  const required = [
    "bestHook", "hookVariations", "script", "editingPlan",
    "voiceStyle", "postingStrategy", "imagePrompts", "youtube", "tiktok",
  ];

  if (platforms.includes("instagram-reels")) {
    props.instagramCaption = { type: "STRING" };
    required.push("instagramCaption");
  }

  return { type: "OBJECT", properties: props, required };
}

// ── Prompt builder ──────────────────────────────────────────────────

function getScriptLengthGuidance(scriptLength: string): string {
  switch (scriptLength) {
    case "15": return "40–60 words. Very short sentences. Punchy and fast.";
    case "30": return "80–120 words. Short sentences, quick pacing.";
    case "60": return "150–220 words. Medium-length, clear narrative.";
    case "90": return "250–350 words. Longer narrative with depth.";
    default: return "80–120 words.";
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
  imgCount: number;
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

  const scriptGuidance = getScriptLengthGuidance(input.scriptLength);
  const styleInstructions = getStyleInstructions(input.style);

  const globalRules = `
GLOBAL RULES:
- Output must strictly follow ${input.language} language.
- Optimize for short-form vertical video.
- Every line must add new information.
- No filler, no explanations, no long paragraphs.
- Use virality principles: curiosity gaps, open loops, emotional triggers, pattern interrupts.
- Maintain fast pacing and high retention.`;

  const imagePromptRules = `
IMAGE PROMPTS:
- Generate exactly ${input.imgCount} prompts.
- Format: [scene description], [atmosphere], vertical 9:16, photorealistic, no text, no faces`;

  const seoRules = `
SEO PACK:
YOUTUBE:
- Title: curiosity-driven + SEO optimized + include #shorts
- Description: 2 short sentences using keywords
- Tags: relevant searchable keywords

TIKTOK:
- Caption: short, curiosity-driven, more aggressive tone
- Hashtags: 5–8 relevant hashtags`;

  const outputRules = `
IMPORTANT:
- Do not explain anything
- Do not add extra commentary
- Output only the structured result
- Make everything instantly usable for content creation
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
- Script length: ${input.scriptLength} seconds
- Script word count: ${scriptGuidance}
- Goal: ${input.goal}
- Hook intensity: ${hookLevel}
- Output depth: ${input.depth}
${customBlock}
STYLE BEHAVIOR:
${styleInstructions}

HOOK GENERATION:
- Generate 5–10 hooks (use stronger psychological triggers: fear, urgency, surprise, curiosity)
- Max 6–8 words per hook
- Punchy and non-generic
- Each must create curiosity instantly

VOICE SCRIPT (CRITICAL):
- Generate a voice-over script optimized for ElevenLabs
- Each line max 6–8 words
- One idea per line
- No paragraphs
- Use spacing between blocks for pacing
- Structure: Hook → Context → Escalation → Twist → Open loop
- High-retention storytelling, immersive and dynamic
- Continuous tension building
- Add micro-cliffhangers every 2–3 lines
- Total word count: ${scriptGuidance}

EDITING PLAN:
- Provide scenes: Scene 1, Scene 2, etc.
- What is shown (visual)
- Optional on-screen text
- Mood/effect (if needed)
- Keep it short and practical

${imagePromptRules}

${seoRules}

${platforms_include_instagram(input.platforms)}

GENERATE:
1. bestHook: The single strongest scroll-stopping hook
2. hookVariations: ${input.hookCount} rewrites (different angles, styles, emotional triggers)
3. script: Structured voiceover with hook, beat1, beat2, beat3, cta sections
4. editingPlan: scenes with visual, onScreenText, mood
5. voiceStyle: recommended voice style
6. postingStrategy: bestTime and platformTip
7. imagePrompts: exactly ${input.imgCount} cinematic prompts
8. youtube: title, description, tags
9. tiktok: caption, hashtags
${input.platforms.includes("instagram-reels") ? "10. instagramCaption: Instagram caption with hashtags" : ""}

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
- Script length: ${input.scriptLength} seconds
- Script word count: ${scriptGuidance}
- Goal: ${input.goal}
- Hook intensity: ${hookLevel}

STYLE BEHAVIOR:
${styleInstructions}

HOOK GENERATION:
- Generate exactly 3 hooks
- Max 6–8 words per hook
- Punchy and non-generic
- Each must create curiosity instantly

VOICE SCRIPT (CRITICAL):
- Generate a voice-over script optimized for ElevenLabs
- Each line max 6–8 words
- One idea per line
- No paragraphs
- Structure: Hook → Context → Escalation → Twist → Open loop
- High-retention storytelling
- Add micro-cliffhangers every 2–3 lines
- Total: ${scriptGuidance}

EDITING PLAN:
- Provide scenes with visual description
- Optional on-screen text and mood
- Keep it short and practical

${imagePromptRules}

${seoRules}

${outputRules}`;
}

function platforms_include_instagram(platforms: string[]): string {
  if (platforms.includes("instagram-reels")) {
    return "INSTAGRAM:\n- instagramCaption: Instagram Reels caption with hashtags";
  }
  return "";
}
