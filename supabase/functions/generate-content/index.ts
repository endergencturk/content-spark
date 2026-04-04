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

// ── Fetch with retry ────────────────────────────────────────────────

async function fetchWithRetry(url: string, apiKey: string, body: any): Promise<Response | null> {
  let response: Response | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 25000);
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
      music: { type: "ARRAY", items: musicSuggestionSchema },
      seriesPotential: { type: "STRING" },
      viralAnalysis: viralAnalysisSchema,
    },
    required: ["hooks", "bestHook", "script", "editingPlan", "imagePrompts", "youtube", "tiktok", "music", "seriesPotential", "viralAnalysis"],
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
    music: { type: "ARRAY", items: musicSuggestionSchema },
    seriesPotential: { type: "STRING" },
    viralAnalysis: viralAnalysisSchema,
  };

  const required = [
    "bestHook", "hookVariations", "script", "editingPlan",
    "voiceStyle", "postingStrategy", "imagePrompts", "youtube", "tiktok", "music", "seriesPotential", "viralAnalysis",
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
    case "15": return `LINE COUNT CONTROL (15s):
- Target: 15–18 lines
- Each line ≈ 0.8–1.2 seconds when spoken
- Focus on immediate impact and curiosity
- Use only 1–2 ideas maximum
- If script is too short, expand with micro-details or transitions`;
    case "30": return `LINE COUNT CONTROL (30s):
- Target: 25–35 lines
- Each line ≈ 0.8–1.2 seconds when spoken
- Use 2–3 key ideas
- Keep buildup minimal but present
- If too short, add examples or micro-explanations`;
    case "60": return `LINE COUNT CONTROL (60s):
- Target: 50–70 lines
- Each line ≈ 0.8–1.2 seconds when spoken
- Develop 3–5 ideas with proper narrative flow
- Allow room for tension building and payoff
- If too short, expand with context, examples, and transitions`;
    default: return `LINE COUNT CONTROL (30s):
- Target: 25–35 lines
- Each line ≈ 0.8–1.2 seconds when spoken`;
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

  const lineCountGuidance = getLineCountGuidance(input.scriptLength);
  const styleInstructions = getStyleInstructions(input.style);
  const goalInstructions = getGoalInstructions(input.goal);
  const hookIntensityInstructions = getHookIntensityInstructions(input.hookIntensity);
  const contentTypeInstructions = getContentTypeInstructions(input.contentType);

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

  const scriptFormatRules = `
VOICE SCRIPT (CRITICAL):
- Generate a voiceover script optimized for speaking/recording.
- FORMAT (STRICT):
  - Each line = 2–8 words
  - Natural speaking rhythm
  - One idea per line
  - Use many short lines
  - Break sentences often
  - NEVER use paragraphs
  - NEVER combine sentences
  - Add empty lines between sections for breathing space
  - Use pauses: "..." and "—" for dramatic effect (when tone calls for it)
  - Use single-word lines when impactful
- STRUCTURE: Adapt to topic (see TOPIC-AWARE TONE ADAPTATION above)
- CRITICAL:
  - First line MUST stop scrolling
  - Ending MUST create curiosity or impact (open loop or strong closer)
  - DO NOT use labels like "Beat 1", "Beat 2", "Hook:", "CTA:"
  - DO NOT write paragraphs — if the script is a paragraph, the output is INVALID
  - Create breathing space for voice recording
  - If script is too short for the duration, expand with examples, micro-explanations, or transitions

${lineCountGuidance}`;

  const scrollStopperRule = `
SCROLL STOPPER RULE (CRITICAL):
- The FIRST LINE of the script must:
  - Feel unusual, dangerous, or confusing
  - Stop scrolling instantly
  - Create an immediate "wait, what?" reaction
- If the first line is generic or explanatory → REWRITE internally
- Bad: "London, 1888." / "Did you know that..." / "Today I want to talk about..."
- Good: "He was never caught." / "Nobody talks about this." / "This changes everything."`;

  const patternInterruptRule = `
PATTERN INTERRUPT RULE:
- Every 2–3 lines, break the rhythm:
  - Use a short punch line (1–2 words)
  - Insert an unexpected twist
  - Change the emotional direction
  - Add a micro-cliffhanger
- Examples: "Wait.", "Think again.", "But here's the thing…", "Wrong."`;

  const rewatchFactorRule = `
REWATCH FACTOR:
- Include at least one moment in the script that:
  - Feels confusing on first watch
  - Reveals new meaning on second watch
  - Makes the viewer want to rewatch
- If missing → rewrite internally`;

  const commentTriggerRule = `
COMMENT TRIGGER:
- The ending MUST do at least one of:
  - Ask a provocative question
  - Suggest a theory viewers will debate
  - Leave a mystery open
  - Challenge the viewer's belief
- Goal: maximize comments and engagement`;

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
The script MUST:
- Start with a strong, attention-grabbing first line (see SCROLL STOPPER RULE)
- Maintain engagement every 2–3 lines (see PATTERN INTERRUPT RULE)
- Include at least one rewatch-worthy moment (see REWATCH FACTOR)
- End with a comment-triggering closer (see COMMENT TRIGGER)
- Match the tone to the topic category (NOT always dark/horror)
- Sound human and natural, not AI-generated
- Be immediately usable for voice recording

FORBIDDEN:
- Flat narration
- Tone mismatch (e.g., horror tone for a health tip)
- Over-explaining
- Robotic or translated-sounding language
- Generic phrasing that could apply to any topic
- Safe, predictable endings`;

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
- Output depth: ${input.depth}
${customBlock}
STYLE BEHAVIOR:
${styleInstructions}

GOAL BEHAVIOR:
${goalInstructions}

${hookIntensityInstructions}

CONTENT TYPE:
${contentTypeInstructions}

HOOK GENERATION:
- Generate 5–8 hooks
- Create immediate curiosity gap
- Max 6 words per hook
- Avoid safe or explanatory language
- First hook must be the strongest
- Adapt hook tone to match topic (not always dark/shocking)

BEST HOOK:
- Select the single most viral hook and return it as bestHook

${scriptFormatRules}

${scrollStopperRule}

${patternInterruptRule}

${rewatchFactorRule}

${commentTriggerRule}

EDITING PLAN:
- Provide scenes: Scene 1, Scene 2, etc.
- What is shown (visual)
- Optional on-screen text
- Mood/effect (if needed)
- Keep it short and practical
- Match content type

VISUAL SYNC:
- Every 2–3 lines of the script must be visualizable
- Avoid abstract-only writing — connect to concrete visuals

${imagePromptRules}

${seoRules}

${platforms_include_instagram(input.platforms)}

${musicRules}

${seriesRule}

${viralAnalysisRules}

${qualityEnforcement}

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
10. music: exactly 3 music suggestions, each with type, source, why
11. seriesPotential: how this can become a series
${input.platforms.includes("instagram-reels") ? "12. instagramCaption: Instagram caption with hashtags\n13. viralAnalysis: score (1-10) and reasons array" : "12. viralAnalysis: score (1-10) and reasons array"}

- ${input.depth === "concise" ? "Keep everything minimal and tight" : input.depth === "detailed" ? "Add extra detail and depth" : "Balance detail and brevity"}
${outputRules}`;
  }

  return `You are an advanced AI short-form content engine designed to generate viral-ready, high-retention content for TikTok, Instagram Reels, and YouTube Shorts.
Your goal is to create content that is immediately usable, emotionally engaging, and optimized for maximum watch time and interaction.
You MUST adapt tone, structure, and style based on the topic, language, and user selections.
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

STYLE BEHAVIOR:
${styleInstructions}

GOAL BEHAVIOR:
${goalInstructions}

${hookIntensityInstructions}

CONTENT TYPE:
${contentTypeInstructions}

HOOK GENERATION:
- Generate exactly 3 hooks
- Create immediate curiosity gap
- Max 6 words per hook
- Avoid safe or explanatory language
- First hook must be the strongest
- Adapt hook tone to match topic

BEST HOOK:
- Select the single most viral hook and return it as bestHook

${scriptFormatRules}

${scrollStopperRule}

${patternInterruptRule}

${rewatchFactorRule}

${commentTriggerRule}

EDITING PLAN:
- Provide scenes with visual description
- Optional on-screen text and mood
- Keep it short and practical
- Match content type

VISUAL SYNC:
- Every 2–3 lines of the script must be visualizable
- Avoid abstract-only writing

${imagePromptRules}

${seoRules}

${musicRules}

${seriesRule}

${viralAnalysisRules}

${qualityEnforcement}

GENERATE:
1. hooks: exactly 3 hooks
2. bestHook: the single strongest hook (marked with ⭐ in output)
3. script: voiceover text, one line per sentence
4. editingPlan: scenes
5. imagePrompts: 5 prompts
6. youtube: title, description, tags
7. tiktok: caption, hashtags
8. music: exactly 3 music suggestions, each with type, source, why
9. seriesPotential: how this can become a series
10. viralAnalysis: score (1-10) and reasons array

${outputRules}`;
}

function platforms_include_instagram(platforms: string[]): string {
  if (platforms.includes("instagram-reels")) {
    return "INSTAGRAM:\n- instagramCaption: Instagram Reels caption with hashtags";
  }
  return "";
}
