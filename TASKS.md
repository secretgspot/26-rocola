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
    - [x] UI: Clarified Tier descriptions (Play counts + Gap logic) in INJECT_SEQUENCE dialog
    - [x] CSS: Refactored entire UI to use Open Props tokens for spacing, borders, and typography
    - [x] Queue: Implemented balanced rotation logic (Gap: 3/6/9) and Round Robin tiebreaking to prevent premium song clustering
- [x] Dev Experience
    - [x] UI: Added `[FORCE_NEXT]` and `[SEED]` buttons to header (Dev-only)
    - [x] API: Refactored `/api/debug/seed` to read from `docs/queue.txt` with 90/10 tier distribution
- [x] Payments (Phase 3)
    - [x] Stripe Embedded Checkout integration
    - [x] Secure singleton initialization with race-condition locking
    - [x] Metadata-first payment flow (song added only after success)
    - [x] Webhook handler for checkout.session.completed
    - [x] Success redirection and automatic queue promotion
    - [x] Custom industrial/monochrome Stripe UI styling

## Next Steps (Optimizations & Reworks)
- [x] Optimize Database Queries (SQL Joins)
- [x] Refactor WebSocket Initialization (Move out of `db/index.js`)
- [x] UI/UX: Add "Cooldown" status indicators to Queue items
- [x] Code Structure: Centralize Tier configuration (Price, Plays, Gap)
    - [x] UI/UX: Refactor video progress indicator to stay synced with server time even when paused
    - [x] UI/UX: Integrated real YouTube player metrics (BTR/BUF) and removed simulated LAT stats

## Post-Review Optimizations (SEO, Perf, UX)
- [x] SEO: Add base meta tags to `app.html` (Title, Description, OG)
- [x] SEO: Implement dynamic `<title>` updates for current song in `+layout.svelte`
- [x] SEO: Add JSON-LD Structured Data for currently playing video
- [x] Perf: Replace CDN Open Props with local import to reduce FCP latency
- [x] Perf: Refactor progress bar loop to use `requestAnimationFrame` for smoother UI
- [x] UX: Update layout height to `100dvh` in `+page.svelte` for mobile browser compatibility
- [x] A11y: Add `aria-labels` to skip buttons and `aria-hidden` to decorative elements
- [x] Svelte 5: Implement `<svelte:boundary>` around `VideoPlayer` for graceful error handling

## Neon + Realtime Migration (2026-02-10)
- [x] Migrate Drizzle schema + config from SQLite to Neon Postgres
- [x] Replace DB client with Neon serverless driver
- [x] Remove native WebSocket server; move to managed realtime provider
- [x] Persist playback state in DB (no `globalThis` state)
- [x] Make queue advancement transactional + concurrency-safe
- [x] Update env config for Neon and realtime provider keys
- [x] Verify realtime updates (song_playing, queue_changed, song_ended) across clients

## Performance & Admin UX (2026-02-10)
- [x] Speed up seed endpoint with concurrency + timeouts
- [x] Seed endpoint two-phase metadata fetch + inserts
- [x] Make realtime update payloads carry song data (reduce extra fetches)
- [x] Add admin clear/seed/skip controls with icon buttons
- [x] Improve admin unlock (konami code)
- [x] Add periodic current-song sync to reduce client drift
- [x] Add short-TTL queue cache + invalidation
- [x] Normalize `/api/queue/next` empty-queue response (ok: true, next: null)
- [x] Live-dot reflects realtime connection state (good/bad/pending)
- [x] Move theme toggle into header controls + persist in localStorage
- [x] Enforce free-tier duplicate rule (same song once/day per user; paid tiers bypass)
- [x] Add unit tests for queue duplicate-rule responses (409 on free duplicate, paid allowed)

## Docs Alignment (2026-02-10)
- [x] Update PLAN to current architecture + UI theme
- [x] Update PRD to current mechanics + fairness rules

## Future Phases
- [x] Phase 4: Polish & Security (Session management, IP tracking, Rate limiting)
    - [x] Track session, IP, and user-agent in server locals
    - [x] Add centralized server security module for admin checks + throttling
    - [x] Add rate limiting to queue add, queue next, validate, checkout, realtime token
    - [x] Add rate limiting to admin unlock and debug seed/clear endpoints
    - [x] Keep admin controls gated by admin cookie in production, allow dev override locally

## Current UI/QA Subtasks (2026-02-16)
- [x] Remove panel backgrounds and force black body background
- [x] Remove `SEQUENCE_QUEUE` label and replace with translucent top queue overlay
- [x] Add premium tier "entice" effects in `INJECT_SEQUENCE`
- [x] Silver pulse glow (subtle), Gold pulse glow (brighter), Ultra/Void pulse glow (strongest serene cyan)
- [x] Predict user usage conditions and encode as tests
- [x] Verify with `npm run check` and unit test suite

## Usage Conditions Covered by Tests
- [x] User adds free song first time today -> accepted
- [x] User adds same free song again today -> rejected with `409`
- [x] User adds same song with paid tier -> accepted
- [x] User rapidly triggers queue-next endpoint -> rate limit returns `429`
