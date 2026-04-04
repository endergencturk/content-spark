export type Locale = "en" | "tr";

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // App
    "app.badge": "AI Content Engine",
    "app.title": "AI Content Engine",
    "app.subtitle": "Generate viral hooks, scripts & captions in seconds.",

    // Mode toggle
    "mode.free": "Free",
    "mode.pro": "Pro",
    "mode.general": "General",

    // Input labels
    "input.topic": "Topic",
    "input.topic.placeholder": "e.g. fitness tips, AI tools, crypto...",
    "selector.platform": "Platform",
    "selector.platform.multi": "Select multiple platforms",
    "selector.content": "Content Type",
    "selector.style": "Style",
    "selector.length": "Length",
    "selector.goal": "Goal",
    "selector.format": "Format",
    "selector.hookIntensity": "Hook Intensity",
    "selector.imagePrompts": "Image Prompts",
    "selector.imagePrompts.fixed": "(fixed: 3)",
    "selector.imagePrompts.slider": "Slider unlocked with Pro (1–10)",
    "selector.depth": "Depth",
    "selector.depth.concise": "Concise",
    "selector.depth.standard": "Standard",
    "selector.depth.detailed": "Detailed",
    "selector.customDesc": "Describe your video",
    "selector.customDesc.optional": "(optional)",
    "selector.customDesc.placeholder": "e.g. I want to sell my course, target 18-25 year olds, use dark humor...",
    "selector.customDesc.locked": "Describe your video (Pro only)",

    // Hook intensity
    "hook.low": "Low",
    "hook.medium": "Medium",
    "hook.high": "High",

    // Buttons
    "btn.generate": "Generate Content",
    "btn.generatePro": "Generate Full Pipeline",
    "btn.generating": "Generating…",
    "btn.regenerate": "Regenerate",
    "btn.copyAll": "Copy All",
    "btn.copied": "Copied!",
    "btn.copy": "Copy",
    "btn.upgradeContinue": "Upgrade to continue",
    "btn.noCredits": "No credits left",
    "usage.switchPro": "Switch to Pro tab for unlimited generations.",

    // Results
    "result.hooks": "Hooks",
    "result.script": "Script",
    "result.caption": "Caption",
    "result.imagePrompts": "Image Prompts",
    "result.music": "Music Suggestions",
    "result.music.type": "Type",
    "result.music.source": "Source",
    "result.music.why": "Why it works",
    "result.seriesPotential": "Series Potential",
    "result.topics": "Viral Topics & Hooks",
    "result.discovery": "Viral Content Ideas",
    "result.discovery.why": "Why it can go viral",
    "btn.discover": "Discover Ideas",
    "btn.discovering": "Finding ideas…",
    "loading.discovery": "Finding viral ideas…",
    "empty.discovery": "Leave topic empty and hit Discover to get viral content ideas.",
    "result.voiceover": "Voiceover-ready script",
    "result.youtube": "YouTube Shorts",
    "result.tiktok": "TikTok Caption",
    "result.instagram": "Instagram Reels",
    "result.title": "Title",
    "result.tags": "Tags",
    "result.description": "Description",
    "result.bestHook": "Best Hook",
    "result.hookVariations": "Hook Variations",
    "result.editingPlan": "Editing Plan",
    "result.voiceStyle": "Voice Style",
    "result.postingStrategy": "Posting Strategy",
    "result.bestTime": "Best Time",
    "result.platformTip": "Platform Tip",
    "result.fullPack": "Full Content Pack",
    "result.viralAnalysis": "Viral Analysis",
    "result.viewPack": "View Full Content Pack",
    "result.hidePack": "Hide",
    "result.proAvailable": "Available with Pro",

    // Script beats
    "script.hook": "Hook",
    "script.beat1": "Beat 1",
    "script.beat2": "Beat 2",
    "script.beat3": "Beat 3",
    "script.cta": "CTA",

    // Empty state
    "empty.text": "Enter a topic and hit generate to create your content.",

    // Loading
    "loading.pro": "Building your content pipeline…",
    "loading.general": "Creating your content…",
    "loading.time": "Usually takes 5–10 seconds",

    // Copy toast
    "toast.copied": "Copied — ready to post 🚀",
    "toast.error.busy": "AI is temporarily busy — please try again in a few seconds.",
    "toast.error.generic": "Generation failed. Please try again.",
    "toast.payments.disabled": "Payments are temporarily disabled in preview mode.",

    // Usage banner
    "usage.noCredits": "No credits left",
    "usage.creditsAvailable": "{count} free generation{s} available",
    "usage.upgradeMsg": "Upgrade to Pro for unlimited generations and premium outputs.",
    "usage.nextCredit": "Next free credit in {time}",
    "usage.refillInfo": "Credits refill every 2 hours",
    "usage.upgradeBtn": "Upgrade for unlimited",
    "usage.remaining": "{count} free generation{s} available",
    "usage.nextRefill": "Next credit in {time}",

    // Pro preview banner
    "proPreview.title": "Previewing Pro mode",
    "proPreview.subtitle": "Explore all Pro features — upgrade to generate content.",

    // Upgrade dialog
    "upgrade.title": "Pro Preview Mode",
    "upgrade.title.payments": "Unlock Pro",
    "upgrade.desc": "You're exploring the Pro experience.\nUnlock Pro to generate advanced hooks, voiceover-ready scripts, editing plans, and platform-specific content.",
    "upgrade.desc.payments": "Upgrade to create content that actually performs.",
    "upgrade.btn": "Unlock Pro",
    "upgrade.btn.payments": "Upgrade Now",
    "upgrade.note": "Preview mode — Pro generation is currently locked",
    "upgrade.note.payments": "Creators using Pro get 3× better results",
    "upgrade.feature.styles": "Advanced viral styles (emotional, suspense, controversy)",
    "upgrade.feature.hooks": "10 high-converting hook variations",
    "upgrade.feature.editing": "Voiceover-ready structured scripts",
    "upgrade.feature.scripts": "Scene-by-scene editing plans",
    "upgrade.feature.images": "Up to 10 cinematic image prompts",
    "upgrade.feature.unlimited": "Unlimited generations",

    // Upsell banner
    "upsell.btn": "Upgrade to Pro",
    "upsell.hooks": "Get 10 higher-converting hooks with Pro — scroll-stopping variations that increase retention",
    "upsell.script": "Make this script voiceover-ready with structured beats and pro editing plan",
    "upsell.bottom": "Creators using Pro get 3× more engagement",
    "upsell.bottomBtn": "Upgrade to stand out",

    // Blurred preview
    "blurred.unlock": "Unlock full",
    "blurred.hookVariations": "Hook variations that increase retention",
    "blurred.editingPlan": "Scene-by-scene editing plan",
    "blurred.voiceStyle": "Voice style recommendation",
    "blurred.postingStrategy": "Posting strategy & timing",

    // Settings
    "settings.title": "Settings",
    "settings.theme": "Theme",
    "settings.theme.light": "Light",
    "settings.theme.dark": "Dark",
    "settings.language": "Language",
    "settings.outputStyle": "Output Style",
    "settings.outputStyle.minimal": "Minimal",
    "settings.outputStyle.detailed": "Detailed",
    "settings.defaultPlatform": "Default Platform",
    "settings.defaultLength": "Default Script Length",
    "settings.hookStyle": "Hook Style",
    "settings.hookStyle.safe": "Safe",
    "settings.hookStyle.balanced": "Balanced",
    "settings.hookStyle.aggressive": "Aggressive",

    // Upgrade triggers (contextual messages)
    "trigger.proGenerate": "Unlock Pro to generate advanced hooks, voiceover-ready scripts, editing plans, and platform-specific content.",
    "trigger.dailyLimit": "You've reached your daily free limit. Upgrade to Pro for unlimited generations and premium outputs.",
    "trigger.imageSlider": "Unlock custom image prompt count (1–10) with Pro.",
    "trigger.detailed": "Unlock Detailed depth for maximum output quality.",
    "trigger.customDesc": "Describe your exact video intent with Pro — get AI-tailored output.",
    "trigger.highIntensity": "Unlock High intensity hooks with Pro.",

    // History
    "history.title": "History",
    "history.loading": "Loading history…",
    "history.empty": "No generations yet. Create your first content!",
    "history.reuse": "Reuse Topic",
    "history.proUnlock": "Upgrade to Pro for unlimited history",
    "history.saved": "Saved to history ✓",
    "history.viewHistory": "View History",
    "history.all": "All",

    // Favorites
    "favorites.title": "Favorites",
    "favorites.empty": "No favorites yet. Star a generation to save it!",
    "favorites.added": "Added to favorites ⭐",
    "favorites.removed": "Removed from favorites",
    "favorites.limit": "Free users can save up to 3 favorites. Upgrade to Pro for unlimited!",

    // Copy full pack
    "btn.copyFullPack": "Copy Full Pack",
    "btn.copyTags": "Copy Tags",
    "btn.copyHashtags": "Copy Hashtags",

    // Topic suggestions
    "topics.suggestions": "Trending Topics",
    "topics.surprise": "Surprise Me",
    "topics.more": "More suggestions available with Pro",

    // Niche presets
    "preset.title": "Quick Start",

    // Target Audience
    "selector.targetAudience": "Target Audience",
    "audience.global": "Global",
    "audience.usa": "USA",
    "audience.europe": "Europe",
    "audience.latam": "Latin America",
    "audience.turkey": "Turkey",

    // Hook Style
    "selector.hookStyle": "Hook Style",
    "hookStyle.aggressive": "Aggressive",
    "hookStyle.curiosity": "Curiosity",
    "hookStyle.emotional": "Emotional",
    "hookStyle.dark": "Dark",

    // Thumbnail output
    "result.thumbnails": "Thumbnail Ideas",
    "result.thumbnail.image": "Image",
    "result.thumbnail.text": "Text",

    // Posting time output
    "result.postingTime": "Best Posting Time",
    "result.postingTime.primary": "Primary Time",
    "result.postingTime.backup": "Backup Time",
    "result.postingTime.reason": "Reason",

    // Hook types
    "hookType.fear": "Fear",
    "hookType.curiosity": "Curiosity",
    "hookType.wtf": "WTF",
    "hookType.conspiracy": "Conspiracy",
    "hookType.emotional": "Emotional",
    "hookType.mystery": "Mystery",

    // Angle variations
    "result.angleVariations": "Angle Variations",

    // Download
    "btn.downloadTxt": "Download TXT",
    "toast.downloaded": "Downloaded — content pack saved 📁",

    // Viral categories
    "viral.hookStrength": "Hook Strength",
    "viral.curiosityGap": "Curiosity Gap",
    "viral.emotionalTrigger": "Emotional Trigger",
    "viral.clarity": "Clarity",
    "viral.rewatchPotential": "Rewatch Potential",
    "viral.commentPotential": "Comment Potential",
    "viral.platformFit": "Platform Fit",
    "viral.strengths": "Strengths",
    "viral.weaknesses": "Weaknesses",
  },
  tr: {
    // App
    "app.badge": "AI İçerik Motoru",
    "app.title": "AI İçerik Motoru",
    "app.subtitle": "Saniyeler içinde viral hook, senaryo ve altyazı oluştur.",

    // Mode toggle
    "mode.free": "Ücretsiz",
    "mode.pro": "Pro",
    "mode.general": "Genel",

    // Input labels
    "input.topic": "Konu",
    "input.topic.placeholder": "ör. fitness ipuçları, AI araçları, kripto...",
    "selector.platform": "Platform",
    "selector.platform.multi": "Birden fazla platform seçin",
    "selector.content": "İçerik Türü",
    "selector.style": "Stil",
    "selector.length": "Süre",
    "selector.goal": "Hedef",
    "selector.format": "Format",
    "selector.hookIntensity": "Hook Yoğunluğu",
    "selector.imagePrompts": "Görsel Promptları",
    "selector.imagePrompts.fixed": "(sabit: 3)",
    "selector.imagePrompts.slider": "Pro ile kaydırıcı açılır (1–10)",
    "selector.depth": "Derinlik",
    "selector.depth.concise": "Kısa",
    "selector.depth.standard": "Standart",
    "selector.depth.detailed": "Detaylı",
    "selector.customDesc": "Videonuzu tanımlayın",
    "selector.customDesc.optional": "(isteğe bağlı)",
    "selector.customDesc.placeholder": "ör. Kursumu satmak istiyorum, 18-25 yaş arası hedefliyorum, kara mizah kullanın...",
    "selector.customDesc.locked": "Videonuzu tanımlayın (Sadece Pro)",

    // Hook intensity
    "hook.low": "Düşük",
    "hook.medium": "Orta",
    "hook.high": "Yüksek",

    // Buttons
    "btn.generate": "İçerik Oluştur",
    "btn.generatePro": "Tam Pipeline Oluştur",
    "btn.generating": "Oluşturuluyor…",
    "btn.regenerate": "Yeniden Oluştur",
    "btn.copyAll": "Tümünü Kopyala",
    "btn.copied": "Kopyalandı!",
    "btn.copy": "Kopyala",
    "btn.upgradeContinue": "Devam etmek için yükseltin",
    "btn.noCredits": "Kredi kalmadı",
    "usage.switchPro": "Sınırsız oluşturma için Pro sekmesine geçin.",

    // Results
    "result.hooks": "Hook'lar",
    "result.script": "Senaryo",
    "result.caption": "Altyazı",
    "result.imagePrompts": "Görsel Promptları",
    "result.music": "Müzik Önerileri",
    "result.music.type": "Tür",
    "result.music.source": "Kaynak",
    "result.music.why": "Neden uygun",
    "result.seriesPotential": "Seri Potansiyeli",
    "result.topics": "Viral Konular & Hook'lar",
    "result.discovery": "Viral İçerik Fikirleri",
    "result.discovery.why": "Neden viral olabilir",
    "btn.discover": "Fikir Keşfet",
    "btn.discovering": "Fikirler aranıyor…",
    "loading.discovery": "Viral fikirler bulunuyor…",
    "empty.discovery": "Konuyu boş bırakıp Keşfet'e basarak viral içerik fikirleri alın.",
    "result.voiceover": "Seslendirmeye hazır senaryo",
    "result.youtube": "YouTube Shorts",
    "result.tiktok": "TikTok Altyazısı",
    "result.instagram": "Instagram Reels",
    "result.title": "Başlık",
    "result.tags": "Etiketler",
    "result.description": "Açıklama",
    "result.bestHook": "En İyi Hook",
    "result.hookVariations": "Hook Varyasyonları",
    "result.editingPlan": "Kurgu Planı",
    "result.voiceStyle": "Ses Stili",
    "result.postingStrategy": "Paylaşım Stratejisi",
    "result.bestTime": "En İyi Zaman",
    "result.platformTip": "Platform İpucu",
    "result.fullPack": "Tam İçerik Paketi",
    "result.viralAnalysis": "Viral Analizi",
    "result.viewPack": "Tam İçerik Paketini Gör",
    "result.hidePack": "Gizle",
    "result.proAvailable": "Pro ile kullanılabilir",

    // Script beats
    "script.hook": "Hook",
    "script.beat1": "Bölüm 1",
    "script.beat2": "Bölüm 2",
    "script.beat3": "Bölüm 3",
    "script.cta": "CTA",

    // Empty state
    "empty.text": "Bir konu girin ve içerik oluşturmak için butona basın.",

    // Loading
    "loading.pro": "İçerik pipeline'ınız hazırlanıyor…",
    "loading.general": "İçeriğiniz oluşturuluyor…",
    "loading.time": "Genellikle 5–10 saniye sürer",

    // Copy toast
    "toast.copied": "Kopyalandı — paylaşıma hazır 🚀",
    "toast.error.busy": "AI şu anda meşgul — birkaç saniye sonra tekrar deneyin.",
    "toast.error.generic": "Oluşturma başarısız. Lütfen tekrar deneyin.",
    "toast.payments.disabled": "Önizleme modunda ödemeler geçici olarak devre dışı.",

    // Usage banner
    "usage.noCredits": "Kredi kalmadı",
    "usage.creditsAvailable": "{count} ücretsiz oluşturma hakkı",
    "usage.upgradeMsg": "Sınırsız oluşturma ve premium çıktılar için Pro'ya yükseltin.",
    "usage.nextCredit": "Sonraki ücretsiz kredi: {time}",
    "usage.refillInfo": "Krediler her 2 saatte yenilenir",
    "usage.upgradeBtn": "Sınırsız için yükselt",
    "usage.remaining": "{count} ücretsiz oluşturma hakkı",
    "usage.nextRefill": "Sonraki kredi: {time}",

    // Pro preview banner
    "proPreview.title": "Pro modu önizlemesi",
    "proPreview.subtitle": "Tüm Pro özellikleri keşfedin — içerik oluşturmak için yükseltin.",

    // Upgrade dialog
    "upgrade.title": "Pro Önizleme Modu",
    "upgrade.title.payments": "Pro'yu Aç",
    "upgrade.desc": "Pro deneyimini keşfediyorsunuz.\nGelişmiş hook'lar, seslendirmeye hazır senaryolar, kurgu planları ve platforma özel içerik oluşturmak için Pro'ya yükseltin.",
    "upgrade.desc.payments": "Gerçekten performans gösteren içerik oluşturmak için yükseltin.",
    "upgrade.btn": "Pro'yu Aç",
    "upgrade.btn.payments": "Şimdi Yükselt",
    "upgrade.note": "Önizleme modu — Pro oluşturma şu anda kilitli",
    "upgrade.note.payments": "Pro kullanan içerik üreticileri 3 kat daha iyi sonuç alıyor",
    "upgrade.feature.styles": "Gelişmiş viral stiller (duygusal, gerilim, tartışma)",
    "upgrade.feature.hooks": "10 yüksek dönüşümlü hook varyasyonu",
    "upgrade.feature.editing": "Seslendirmeye hazır yapılandırılmış senaryolar",
    "upgrade.feature.scripts": "Sahne sahne kurgu planları",
    "upgrade.feature.images": "10'a kadar sinematik görsel prompt'u",
    "upgrade.feature.unlimited": "Sınırsız oluşturma",

    // Upsell banner
    "upsell.btn": "Pro'ya Yükselt",
    "upsell.hooks": "Pro ile 10 yüksek performanslı hook alın — kaydırmayı durduran varyasyonlar",
    "upsell.script": "Bu senaryoyu yapılandırılmış bölümler ve pro kurgu planı ile seslendirmeye hazır hale getirin",
    "upsell.bottom": "Pro kullanan içerik üreticileri 3 kat daha fazla etkileşim alıyor",
    "upsell.bottomBtn": "Öne çıkmak için yükselt",

    // Blurred preview
    "blurred.unlock": "Tam",
    "blurred.hookVariations": "Tutma oranını artıran hook varyasyonları",
    "blurred.editingPlan": "Sahne sahne kurgu planı",
    "blurred.voiceStyle": "Ses stili önerisi",
    "blurred.postingStrategy": "Paylaşım stratejisi ve zamanlama",

    // Settings
    "settings.title": "Ayarlar",
    "settings.theme": "Tema",
    "settings.theme.light": "Açık",
    "settings.theme.dark": "Koyu",
    "settings.language": "Dil",
    "settings.outputStyle": "Çıktı Stili",
    "settings.outputStyle.minimal": "Minimal",
    "settings.outputStyle.detailed": "Detaylı",
    "settings.defaultPlatform": "Varsayılan Platform",
    "settings.defaultLength": "Varsayılan Senaryo Süresi",
    "settings.hookStyle": "Hook Stili",
    "settings.hookStyle.safe": "Güvenli",
    "settings.hookStyle.balanced": "Dengeli",
    "settings.hookStyle.aggressive": "Agresif",

    // Upgrade triggers
    "trigger.proGenerate": "Gelişmiş hook'lar, seslendirmeye hazır senaryolar, kurgu planları ve platforma özel içerik oluşturmak için Pro'ya yükseltin.",
    "trigger.dailyLimit": "Günlük ücretsiz limitinize ulaştınız. Sınırsız oluşturma için Pro'ya yükseltin.",
    "trigger.imageSlider": "Pro ile özel görsel prompt sayısı (1–10) açın.",
    "trigger.detailed": "Maksimum çıktı kalitesi için Detaylı derinliği açın.",
    "trigger.customDesc": "Pro ile videonuzun amacını tam olarak tanımlayın — AI'dan özel çıktı alın.",
    "trigger.highIntensity": "Pro ile Yüksek yoğunluklu hook'ları açın.",

    // History
    "history.title": "Geçmiş",
    "history.loading": "Geçmiş yükleniyor…",
    "history.empty": "Henüz oluşturma yok. İlk içeriğinizi oluşturun!",
    "history.reuse": "Konuyu Tekrar Kullan",
    "history.proUnlock": "Sınırsız geçmiş için Pro'ya yükseltin",
    "history.saved": "Geçmişe kaydedildi ✓",
    "history.viewHistory": "Geçmişi Gör",
    "history.all": "Tümü",

    // Favorites
    "favorites.title": "Favoriler",
    "favorites.empty": "Henüz favori yok. Kaydetmek için bir oluşturmaya yıldız verin!",
    "favorites.added": "Favorilere eklendi ⭐",
    "favorites.removed": "Favorilerden kaldırıldı",
    "favorites.limit": "Ücretsiz kullanıcılar 3 favori kaydedebilir. Sınırsız için Pro'ya yükseltin!",

    // Copy full pack
    "btn.copyFullPack": "Tam Paketi Kopyala",
    "btn.copyTags": "Etiketleri Kopyala",
    "btn.copyHashtags": "Hashtag'leri Kopyala",

    // Topic suggestions
    "topics.suggestions": "Trend Konular",
    "topics.surprise": "Beni Şaşırt",
    "topics.more": "Pro ile daha fazla öneri",

    // Niche presets
    "preset.title": "Hızlı Başlangıç",

    // Target Audience
    "selector.targetAudience": "Hedef Kitle",
    "audience.global": "Global",
    "audience.usa": "ABD",
    "audience.europe": "Avrupa",
    "audience.latam": "Latin Amerika",
    "audience.turkey": "Türkiye",

    // Hook Style
    "selector.hookStyle": "Hook Stili",
    "hookStyle.aggressive": "Agresif",
    "hookStyle.curiosity": "Merak",
    "hookStyle.emotional": "Duygusal",
    "hookStyle.dark": "Karanlık",

    // Thumbnail output
    "result.thumbnails": "Thumbnail Fikirleri",
    "result.thumbnail.image": "Görsel",
    "result.thumbnail.text": "Metin",

    // Posting time output
    "result.postingTime": "En İyi Paylaşım Zamanı",
    "result.postingTime.primary": "Birincil Zaman",
    "result.postingTime.backup": "Yedek Zaman",
    "result.postingTime.reason": "Sebep",

    // Hook types
    "hookType.fear": "Korku",
    "hookType.curiosity": "Merak",
    "hookType.wtf": "WTF",
    "hookType.conspiracy": "Komplo",
    "hookType.emotional": "Duygusal",
    "hookType.mystery": "Gizem",

    // Angle variations
    "result.angleVariations": "Açı Varyasyonları",

    // Download
    "btn.downloadTxt": "TXT İndir",
    "toast.downloaded": "İndirildi — içerik paketi kaydedildi 📁",

    // Viral categories
    "viral.hookStrength": "Hook Gücü",
    "viral.curiosityGap": "Merak Boşluğu",
    "viral.emotionalTrigger": "Duygusal Tetikleyici",
    "viral.clarity": "Netlik",
    "viral.rewatchPotential": "Tekrar İzleme Potansiyeli",
    "viral.commentPotential": "Yorum Potansiyeli",
    "viral.platformFit": "Platform Uyumu",
    "viral.strengths": "Güçlü Yönler",
    "viral.weaknesses": "Zayıf Yönler",
  },
};

export function t(key: string, locale: Locale): string {
  return translations[locale]?.[key] ?? translations.en[key] ?? key;
}
