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

    const imgCount = mode === "pro" ? (imagePromptCount || 3) : 3;
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
      imageFormat,
      imgCount,
      depth,
      hookCount,
      customDescription,
    });

    const schema = mode === "pro"
      ? buildProSchema(selectedPlatforms, imgCount, hookCount)
      : buildFreeSchema(hookCount);

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

function buildFreeSchema(hookCount: number) {
  return {
    type: "OBJECT",
    properties: {
      hooks: { type: "ARRAY", items: { type: "STRING" } },
      script: { type: "STRING" },
      caption: { type: "STRING" },
      imagePrompts: { type: "ARRAY", items: { type: "STRING" } },
    },
    required: ["hooks", "script", "caption", "imagePrompts"],
  };
}

function buildProSchema(platforms: string[], imgCount: number, hookCount: number) {
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
      audio: { type: "STRING" },
      duration: { type: "STRING" },
    },
    required: ["scene", "visual", "audio", "duration"],
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
  };

  const required = [
    "bestHook", "hookVariations", "script", "editingPlan",
    "voiceStyle", "postingStrategy", "imagePrompts",
  ];

  if (platforms.includes("tiktok")) {
    props.tiktokCaption = { type: "STRING" };
    required.push("tiktokCaption");
  }
  if (platforms.includes("youtube-shorts")) {
    props.youtubeTitle = { type: "STRING" };
    props.youtubeDescription = { type: "STRING" };
    required.push("youtubeTitle", "youtubeDescription");
  }
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

function buildPrompt(input: {
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
}) {
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

  if (input.mode === "pro") {
    const platformInstructions = input.platforms
      .map((p) => {
        if (p === "tiktok") return "- tiktokCaption: engaging TikTok caption with hashtags";
        if (p === "youtube-shorts")
          return "- youtubeTitle: clickable YouTube Shorts title\n- youtubeDescription: SEO-optimized YouTube description";
        if (p === "instagram-reels")
          return "- instagramCaption: Instagram Reels caption with hashtags";
        return "";
      })
      .filter(Boolean)
      .join("\n");

    const customBlock = input.customDescription
      ? `\nCUSTOM USER INSTRUCTIONS (prioritize these over presets):\n${input.customDescription}\n`
      : "";

    return `You are an elite short-form content strategist and creator coach.

Create a PRO content production package:
- Topic: ${input.topic}
- Platforms: ${platformList}
- Content type: ${input.contentType}
- Style: ${input.style}
- Script length: ${input.scriptLength} seconds
- Script word count: ${scriptGuidance}
- Goal: ${input.goal}
- Hook intensity: ${hookLevel}
- Image format: ${input.imageFormat}
- Output depth: ${input.depth}
${customBlock}
STYLE BEHAVIOR:
${styleInstructions}

PLATFORM ADAPTATION:
- TikTok: fast, aggressive, scroll-stopping hooks
- YouTube Shorts: structured, strong title + clarity
- Instagram Reels: smoother pacing, aesthetic storytelling

GENERATE:
1. bestHook: The single strongest scroll-stopping hook
2. hookVariations: ${input.hookCount} rewrites of the best hook (different angles, styles, emotional triggers)
3. script: A structured voiceover script with these exact sections:
   - hook: opening line (max 8 words)
   - beat1: first key point (2-3 short lines)
   - beat2: second key point (2-3 short lines)
   - beat3: third key point or twist (2-3 short lines)
   - cta: closing call to action (max 8 words)
   Script must be voiceover-ready with natural pauses and strong flow.
   Total word count: ${scriptGuidance}
4. editingPlan: 3 scenes with visual, audio, and duration
5. voiceStyle: recommended voice style (e.g. "Dark & slow", "Fast & energetic")
6. postingStrategy: bestTime and platformTip
7. imagePrompts: exactly ${input.imgCount} cinematic prompts (no text, no faces, ${input.imageFormat} format, strong atmosphere)

PLATFORM OUTPUTS (only for selected platforms):
${platformInstructions}

RULES:
- No generic phrases or "3 tips" hooks
- Hooks must create curiosity, tension, or mystery
- Script lines max 8 words each
- ${input.depth === "concise" ? "Keep everything minimal and tight" : input.depth === "detailed" ? "Add extra detail and depth" : "Balance detail and brevity"}
- Return only valid JSON`;
  }

  return `You are a short-form content expert.

Create a content package:
- Topic: ${input.topic}
- Platform: ${platformList}
- Content type: ${input.contentType}
- Style: ${input.style}
- Script length: ${input.scriptLength} seconds
- Script word count: ${scriptGuidance}
- Goal: ${input.goal}
- Hook intensity: ${hookLevel}
- Image format: ${input.imageFormat}

STYLE BEHAVIOR:
${styleInstructions}

Return:
- ${input.hookCount} hooks (curiosity-driven, no generic phrases)
- 1 voiceover script (each sentence on new line, max 8 words per line, dramatic pacing, total: ${scriptGuidance})
- 1 caption with hashtags
- 3 cinematic image prompts (no text, no faces, ${input.imageFormat} format)

RULES:
- No filler, no explanations
- Hooks must stop the scroll
- Return only valid JSON`;
}
