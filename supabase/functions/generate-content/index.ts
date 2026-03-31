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

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY not found");
    }

    const {
      mode,
      topic,
      platform,
      contentType,
      style,
      scriptLength,
      goal,
      hookIntensity,
      imageFormat,
      outputStyle,
    } = await req.json();

    if (!topic || typeof topic !== "string") {
      return new Response(
        JSON.stringify({ error: "Topic is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const prompt = buildPrompt({
      mode,
      topic,
      platform,
      contentType,
      style,
      scriptLength,
      goal,
      hookIntensity,
      imageFormat,
      outputStyle,
    });

    const schema =
      mode === "pro"
        ? {
            type: "OBJECT",
            properties: {
              bestHook: { type: "STRING" },
              topics: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    title: { type: "STRING" },
                    hooks: {
                      type: "ARRAY",
                      items: {
                        type: "OBJECT",
                        properties: {
                          type: { type: "STRING" },
                          text: { type: "STRING" },
                          best: { type: "BOOLEAN" },
                        },
                        required: ["type", "text", "best"],
                      },
                    },
                  },
                  required: ["title", "hooks"],
                },
              },
              videoIdea: { type: "STRING" },
              editingPlan: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    scene: { type: "NUMBER" },
                    visual: { type: "STRING" },
                    audio: { type: "STRING" },
                    duration: { type: "STRING" },
                  },
                  required: ["scene", "visual", "audio", "duration"],
                },
              },
              hookVariations: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
              voiceStyle: { type: "STRING" },
              postingStrategy: {
                type: "OBJECT",
                properties: {
                  bestTime: { type: "STRING" },
                  platformTip: { type: "STRING" },
                },
                required: ["bestTime", "platformTip"],
              },
              script: { type: "STRING" },
              youtubeTitle: { type: "STRING" },
              youtubeDescription: { type: "STRING" },
              tiktokCaption: { type: "STRING" },
              imagePrompts: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
            },
            required: [
              "bestHook",
              "topics",
              "videoIdea",
              "editingPlan",
              "hookVariations",
              "voiceStyle",
              "postingStrategy",
              "script",
              "youtubeTitle",
              "youtubeDescription",
              "tiktokCaption",
              "imagePrompts",
            ],
          }
        : {
            type: "OBJECT",
            properties: {
              hooks: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
              script: { type: "STRING" },
              caption: { type: "STRING" },
              imagePrompts: {
                type: "ARRAY",
                items: { type: "STRING" },
              },
            },
            required: ["hooks", "script", "caption", "imagePrompts"],
          };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-goog-api-key": GEMINI_API_KEY,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: mode === "pro" ? 0.8 : 0.7,
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeout);

    const result = await response.json();

    if (!response.ok) {
      console.error("Gemini API error:", result);
      throw new Error(result?.error?.message || "Gemini request failed");
    }

    const text = result?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini returned empty response");
    }

    const parsed = JSON.parse(text);

    return new Response(JSON.stringify(parsed), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("generate-content error:", error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

function buildPrompt(input: {
  mode: string;
  topic: string;
  platform: string;
  contentType: string;
  style: string;
  scriptLength: string;
  goal: string;
  hookIntensity: number;
  imageFormat: string;
  outputStyle: string;
}) {
  const hookLevel =
    input.hookIntensity === 0
      ? "safe"
      : input.hookIntensity === 1
      ? "balanced"
      : "aggressive";

  if (input.mode === "pro") {
    return `
You are an elite short-form content strategist.

Create a full PRO content package for this input:
- Topic: ${input.topic}
- Platform: ${input.platform}
- Content type: ${input.contentType}
- Style: ${input.style}
- Script length: ${input.scriptLength} seconds
- Goal: ${input.goal}
- Hook intensity: ${hookLevel}
- Image format: ${input.imageFormat}
- Output style: ${input.outputStyle}

Rules:
- Make everything clear, practical, and highly engaging.
- Write in clean copy-ready language.
- Hooks must feel strong and scroll-stopping.
- Script should match the platform and length.
- Image prompts should be cinematic and useful.
- Return only valid JSON matching the required schema.
`;
  }

  return `
You are a short-form content expert.

Create a GENERAL content package for this input:
- Topic: ${input.topic}
- Platform: ${input.platform}
- Content type: ${input.contentType}
- Style: ${input.style}
- Script length: ${input.scriptLength} seconds
- Goal: ${input.goal}
- Hook intensity: ${hookLevel}
- Image format: ${input.imageFormat}
- Output style: ${input.outputStyle}

Return:
- 3 hooks
- 1 script
- 1 caption
- 3 image prompts

Rules:
- Keep everything concise, strong, and copy-ready.
- Return only valid JSON matching the required schema.
`;
}
