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
    } = body;

    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "Topic is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize platforms
    const selectedPlatforms: string[] =
      platforms && Array.isArray(platforms) && platforms.length > 0
        ? platforms
        : platform
        ? [platform]
        : ["tiktok"];

    const imgCount = imagePromptCount || (mode === "pro" ? 4 : 2);
    const depth = outputDepth || "standard";

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
    });

    const schema = mode === "pro" ? buildProSchema(selectedPlatforms, imgCount) : buildFreeSchema();

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
    let lastError: any = null;

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
          lastError = errBody;
          response = null;
          await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          continue;
        }

        // Non-transient error, don't retry
        console.error("Gemini API error:", errBody);
        throw new Error(errBody || "Gemini request failed");
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") {
          lastError = e;
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
      caption: { type: "STRING" },
      imagePrompts: { type: "ARRAY", items: { type: "STRING" } },
    },
    required: ["hooks", "script", "caption", "imagePrompts"],
  };
}

function buildProSchema(platforms: string[], imgCount: number) {
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
    "bestHook",
    "hookVariations",
    "script",
    "editingPlan",
    "voiceStyle",
    "postingStrategy",
    "imagePrompts",
  ];

  // Dynamic platform outputs
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

    return `You are an elite short-form content strategist and creator coach.

Create a PRO content production package:
- Topic: ${input.topic}
- Platforms: ${platformList}
- Content type: ${input.contentType}
- Style: ${input.style}
- Script length: ${input.scriptLength} seconds
- Goal: ${input.goal}
- Hook intensity: ${hookLevel}
- Image format: ${input.imageFormat}
- Output depth: ${input.depth}

GENERATE:
1. bestHook: The single strongest scroll-stopping hook
2. hookVariations: 3 rewrites of the best hook (different angles)
3. script: A structured voiceover script with these exact sections:
   - hook: opening line (max 8 words)
   - beat1: first key point (2-3 short lines, each max 8 words, separated by newlines)
   - beat2: second key point (2-3 short lines)
   - beat3: third key point or twist (2-3 short lines)
   - cta: closing call to action (max 8 words)
   Each line must be short, dramatic, punchable. Ready for voiceover.
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
- Goal: ${input.goal}
- Hook intensity: ${hookLevel}
- Image format: ${input.imageFormat}

Return:
- 3 hooks (curiosity-driven, no generic phrases)
- 1 voiceover script (each sentence on new line, max 8 words per line, dramatic pacing)
- 1 caption with hashtags
- 2 cinematic image prompts (no text, no faces, ${input.imageFormat} format)

RULES:
- No filler, no explanations
- Hooks must stop the scroll
- Return only valid JSON`;
}
