---
name: Workspace Shell
description: /app sidebar (Channel Profile + Streak/XP + Recent/Favs + ⌘K), Command Palette, Daily Challenge, mobile sheet drawer, keyboard shortcuts.
type: feature
---
- WorkspaceSidebar (260-280px desktop sticky, mobile Sheet via hamburger) houses: glass Channel Profile card, Streak+Level+XP card with achievement badges, Recent/Favorites tabbed list (8 items, "View all" opens HistoryDrawer), Quick Search ⌘K button, auth + settings footer.
- CommandPalette (cmdk + shadcn Dialog) groups: Actions (Generate ⌘↵, Random topic, Hook Lab, Trending), Mode (Free/Pro/Horror), Navigate (History ⌘H, Profile, Settings ⌘,), Recent Topics from Supabase.
- DailyChallenge card (deterministic by day index) sets style on accept; shown above input on Generate tab.
- useGamification hook: localStorage streak/XP/achievements/totals. Levels: 100 + (lvl-1)*50 XP. Badges: First Spark/Warming Up/On Fire/Viral Machine/Legend.
- Global shortcuts: ⌘K palette, ⌘Enter generate (CustomEvent cs:generate), ⌘H history, ⌘, settings.
- ChannelProfile big card only renders when profileForceOpen=true.
- CSS additions in src/index.css: .neon-edge, .glass-panel, .xp-bar, .animate-flame, .kbd-chip, .scrollbar-thin.
