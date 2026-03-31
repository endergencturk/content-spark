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

    const { mode, topic, platform, contentType, style, scriptLength, goal, hookIntensity, imageFormat, outputStyle } = await req.json();

    const platformLabel = { tiktok: "TikTok", "youtube-shorts": "YouTube Shorts", "instagram-reels": "Instagram Reels" }[platform as string] || platform;
    const intensityLabel = ["Low", "Medium", "High"][hookIntensity as number] || "Medium";
    const detailLevel = outputStyle === "minimal" ? "Keep outputs concise and minimal." : "Provide rich, detailed outputs.";

    const styleGuide: Record<string, string> = {
      viral: "broad curiosity, universally engaging",
      dark: "mysterious, unsettling, shadow-filled",
      educational: "clear, authoritative, insight-driven",
      storytelling: "emotional, narrative arc, human connection",
      aggressive: "bold, confrontational, provocative",
    };

    const goalGuide: Record<string, string> = {
      viral: "maximize curiosity and shareability",
      followers: "relatable, identity-driven, community feel",
      sell: "subtle persuasion, desire-building, urgency",
      story: "narrative-driven, emotional journey",
    };

    const lengthGuide: Record<string, string> = {
      "15": "ultra-fast pacing, 4-6 lines max, instant punch",
      "30": "balanced pacing, 8-12 lines, build and payoff",
      "60": "detailed pacing, 15-20 lines, full story arc",
    };

    const baseRules = `You are a high-level viral content engine.

CRITICAL SCRIPT RULES:
- Script must be VOICEOVER format
- Each line = 1 short sentence
- Max 6-8 words per line
- Each line on its own line
- Dramatic pacing
- No paragraphs, no filler
- Ready for ElevenLabs / CapCut

HOOK RULES:
- No generic hooks
- No "3 tips", "here's how", "did you know"
- Must create curiosity, tension, or mystery
- Make it feel human, not AI-generated
- Hook intensity: ${intensityLabel}

IMAGE PROMPT RULES:
- Cinematic quality
- Aspect ratio: ${imageFormat}
- No text overlay
- No human faces
- Strong atmosphere and mood

ADAPTATION:
- Platform: ${platformLabel}
- Style: ${style} → ${styleGuide[style as string] || "engaging"}
- Content type: ${contentType}
- Goal: ${goal} → ${goalGuide[goal as string] || "engage audience"}
- Script length: ${scriptLength}s → ${lengthGuide[scriptLength as string] || "balanced"}
- ${detailLevel}

RETURN ONLY THE RESULT. No explanations. No analysis. No extra text.`;

    let systemPrompt: string;

    if (mode === "pro") {
      systemPrompt = `${baseRules}

RETURN ONLY valid JSON with this exact structure (no markdown fences, no explanation):
{
  "bestHook": "The single most powerful hook text across all topics",
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
  "videoIdea": "A short 1-2 sentence concept explaining the video angle and why it works",
  "editingPlan": [
    { "scene": 1, "visual": "description of visual", "audio": "what the voiceover says", "duration": "0:00-0:05" },
    { "scene": 2, "visual": "description", "audio": "voiceover", "duration": "0:05-0:15" },
    { "scene": 3, "visual": "description", "audio": "voiceover", "duration": "0:15-0:30" }
  ],
  "hookVariations": ["variation 1 of best hook", "variation 2 of best hook", "variation 3 of best hook"],
  "voiceStyle": "One of: Dark & Slow | Fast & Energetic | Calm & Authoritative | Whispery & Mysterious | Bold & Confrontational",
  "postingStrategy": {
    "bestTime": "e.g. Tuesday 7-9 PM EST",
    "platformTip": "A specific actionable tip for the chosen platform"
  },
  "script": "line1\\nline2\\nline3",
  "youtubeTitle": "title",
  "youtubeDescription": "description",
  "tiktokCaption": "caption with #hashtags",
  "imagePrompts": ["prompt1", "prompt2", "prompt3", "prompt4", "prompt5"]
}

SPECIFIC PRO RULES:
- "bestHook": Pick THE single best hook across all 5 topics. This is the #1 recommended hook.
- Generate exactly 5 viral topics related to the user's subject
- Each topic gets exactly 3 hooks: NORMAL, DISRUPTION, QUESTION
- Mark the single best hook per topic with "best": true
- "videoIdea": 1-2 sentence concept pitch. Why this angle works for the platform.
- "editingPlan": Exactly 3 scenes. Each has visual description, audio/voiceover line, and timestamp.
- "hookVariations": Rewrite the bestHook 3 different ways (different angle, different emotion, different structure)
- "voiceStyle": Suggest the ideal voice delivery style for this content
- "postingStrategy": Best posting time and one platform-specific tip
- Script: full voiceover, line-by-line, max 6-8 words per line
- 5 image prompts: cinematic, ${imageFormat} ratio, no text, no faces
- YouTube title: click-worthy, SEO-optimized
- YouTube description: engaging, with keywords
- TikTok caption: with trending hashtags`;
    } else {
      systemPrompt = `${baseRules}

RETURN ONLY valid JSON with this exact structure (no markdown fences, no explanation):
{
  "hooks": ["hook1", "hook2", "hook3"],
  "script": "line1\\nline2\\nline3",
  "caption": "caption text with #hashtags",
  "imagePrompts": ["prompt1", "prompt2", "prompt3"]
}

SPECIFIC RULES:
- 3 hooks that create tension or curiosity
- Script: voiceover format, line-by-line, max 6-8 words per line
- Caption: engaging with relevant hashtags
- 3 image prompts: cinematic, ${imageFormat} ratio, no text, no faces`;
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
