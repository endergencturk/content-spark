---
name: Viral Labs (Title/Thumbnail A/B + Hook Mining)
description: Two new /app generate-tab panels powered by edge functions title-thumbnail-lab and hook-mining for ready-to-publish premium output.
type: feature
---
- TitleThumbnailLab → POST /title-thumbnail-lab. Sends topic/hook/platform/audience/imageStyle. Returns 5 variants {lever, title, thumbnail{visual,overlay,driver}, ctrScore 0-100, reason} plus winnerIndex+winnerWhy. Uses 5 distinct levers: Curiosity Gap / Specificity Bomb / Stakes Reveal / Contrast / Identity. Thumbnails locked to 9:16, no faces, ≤3-word overlay.
- HookMiningPanel → POST /hook-mining. Sends niche (selectedPreset)+topic+platform+audience. Returns 8 patterns sorted by heat (1-10) with {patternName, structure, whyWorking, exampleHook} and 3 avoid-patterns. "Use" button writes hook into bestHook of current generalResult/proResult.
- Both panels mounted in /app Generate tab below the Generate button in a 1/2-col grid (xl:grid-cols-2). Hidden in Horror mode.
- Both edge functions are auth-gated (Bearer token) and registered in supabase/config.toml with verify_jwt=false.
- generate-content prompt now also injects getCreatorDNA(hookStyle) — maps to MrBeast (aggressive), Johnny Harris (curiosity), MrBallen/Lemmino (dark), human storytellers (emotional) — plus a 10-rule viralRetentionMechanics block (0.5s stop, 3s promise, open-loop chain, info delay, pattern interrupts, stake escalation, specificity, loop close, comment trigger, no dead words). Injected into both Pro and Free branches.