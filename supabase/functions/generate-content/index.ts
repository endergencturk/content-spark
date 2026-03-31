import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const { mode, topic, platform, contentType, style, scriptLength, goal, hookIntensity, imageFormat } = await req.json();

    const platformLabel = { tiktok: "TikTok", "youtube-shorts": "YouTube Shorts", "instagram-reels": "Instagram Reels" }[platform] || platform;
    const intensityLabel = ["Low", "Medium", "High"][hookIntensity] || "Medium";

    let systemPrompt: string;

    if (mode === "pro") {
      systemPrompt = `You are a world-class viral content strategist. You create content that stops the scroll and drives massive engagement.

RETURN ONLY valid JSON with this exact structure (no markdown, no explanation, no extra text):
{
  "topics": [
    {
      "title": "topic title",
      "hooks": [
        { "type": "NORMAL", "text": "hook text", "best": false },
        { "type": "DISRUPTION", "text": "hook text", "best": true },
        { "type": "QUESTION", "text": "hook text", "best": false }
      ]
    }
  ],
  "script": "line1\\nline2\\nline3",
  "youtubeTitle": "title",
  "youtubeDescription": "description",
  "tiktokCaption": "caption with #hashtags",
  "imagePrompts": ["prompt1", "prompt2", "prompt3", "prompt4", "prompt5"]
}

RULES:
- Generate exactly 5 viral topics related to the user's subject
- Each topic gets 3 hooks: NORMAL, DISRUPTION, QUESTION
- Mark the single best hook per topic with "best": true
- Hooks must create tension, curiosity, or disruption. NO generic hooks. NO "3 tips". NO "here's how".
- Hook intensity: ${intensityLabel}
- Script must be voiceover format: each sentence on new line, max 6-8 words per line, dramatic pacing, ready for ElevenLabs
- Script length: ${scriptLength} seconds
- Platform: ${platformLabel} — adapt tone accordingly
- Content type: ${contentType}
- Style: ${style}
- Goal: ${goal}
- Image prompts: cinematic, ${imageFormat} ratio, no text overlay, no human faces, strong atmosphere
- YouTube title should be click-worthy and SEO-optimized
- TikTok caption should include relevant trending hashtags`;
    } else {
      systemPrompt = `You are a viral content creator. Generate engaging content that stops the scroll.

RETURN ONLY valid JSON with this exact structure (no markdown, no explanation, no extra text):
{
  "hooks": ["hook1", "hook2", "hook3"],
  "script": "line1\\nline2\\nline3",
  "caption": "caption text with #hashtags",
  "imagePrompts": ["prompt1", "prompt2", "prompt3"]
}

RULES:
- 3 hooks that create tension or curiosity. NO generic hooks. NO "3 tips". NO "here's how".
- Hook intensity: ${intensityLabel}
- Script: voiceover format, each sentence on new line, max 6-8 words per line, dramatic pacing
- Script length: ${scriptLength} seconds
- Platform: ${platformLabel}
- Content type: ${contentType}
- Style: ${style}
- Goal: ${goal}
- Image prompts: cinematic, ${imageFormat} ratio, no text, no faces, strong atmosphere
- Caption: engaging with relevant hashtags`;
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Generate ${mode === "pro" ? "a full content pipeline" : "content"} about: ${topic}` },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    // Parse JSON from the response, stripping markdown fences if present
    let parsed;
    try {
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
      }
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-content error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
