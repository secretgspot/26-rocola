# Project Tasks

## Completed
- [x] Foundation (Phase 1)
    - [x] SvelteKit 2 + Svelte 5 initialization
    - [x] SQLite + Drizzle ORM setup
    - [x] YouTube Validation API + oEmbed fallback
    - [x] Homepage UI with "Add track" overlay
- [x] Queue Management (Phase 2)
    - [x] Fair Queue / Gap Enforcement logic
    - [x] Real-time sync via Native WebSockets
    - [x] Auto-advance and playback sync
    - [x] Queue display component
- [x] Bug Fixes / Minor Improvements
    - [x] Enabled premium tier selection in UI
    - [x] Fixed metadata fetching (black thumbnails/unknown titles)
    - [x] Fixed queue interruption bug where high-tier songs skipped current playback
    - [x] UI: Simplified header (ROCOLA) and added real-time WebSocket client counter
    - [x] Fix queue order inconsistency: displayed queue (N) vs selection logic (N+1)

## Next Steps (Optimizations & Reworks)
- [x] Optimize Database Queries (SQL Joins)
- [x] Refactor WebSocket Initialization (Move out of `db/index.js`)
- [x] UI/UX: Add "Cooldown" status indicators to Queue items
- [x] Code Structure: Centralize Tier configuration (Price, Plays, Gap)
    - [x] UI/UX: Refactor video progress indicator to stay synced with server time even when paused
    - [x] UI/UX: Integrated real YouTube player metrics (BTR/BUF) and removed simulated LAT stats

## Future Phases- [ ] Phase 3: Payments (Lemon Squeezy integration)
- [ ] Phase 4: Polish & Security (Session management, IP tracking, Rate limiting)
