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

## UI Refactor Sweep (2026-02-16)
- [x] Split playback overlay from page into dedicated `NowPlayingOverlay.svelte`
- [x] Keep `VideoPlayer.svelte` focused on YouTube embed only (iframe host)
- [x] Replace viewport media breakpoints in `+page.svelte` with container queries
- [x] Replace mobile breakpoint in `AddToQueue.svelte` with container query
- [x] Add CSS cascade layers (`@layer`) for page and add-modal styling
- [x] Flatten page structure to primary components (`header`, `main.video-layer`, `aside.queue-zone`, `footer` overlay component)
- [x] Remove `overlay-layout` wrapper and queue-header spacer wrapper
- [x] Move progress bar into dedicated `ProgressBar.svelte` and render inside metadata footer component

## Screenshot Match Pass (Pending Approval)
- [x] Create reusable icon system:
    - [x] Build `Icon.svelte` with props (`name`, `size`, `color`, `strokeWidth`, `className`)
    - [x] Add icon registry from `docs/reference/*.svg` (`skip`, `seed`, `clear`, `add`, `clients`, `queue`, `dark`, `light`)
    - [x] Ensure all icons use `currentColor` for fill/stroke mapping
- [x] Header alignment to screenshot:
    - [x] Left cluster: live-dot + `ROCOLA`
    - [x] Right cluster: admin icons, theme icon, clients icon + count, queue icon + count
    - [x] Match spacing, heights, and top gradient fade from screenshot
- [x] Desktop layout match:
    - [x] Keep video full canvas background
    - [x] Keep queue as right-side floating panel with expected size/position and blur treatment
    - [x] Position Add button between video center and queue edge
- [x] Mobile portrait (425x888) layout match:
    - [x] Header/footer remain overlay layers
    - [x] Video top half and queue lower half behavior
    - [x] Add button centered above footer (on-screen, not clipped)
    - [x] Footer text/stats visibility pass for title + metadata
- [x] Landscape mobile parity:
    - [x] Use desktop-like layout behavior in landscape as requested
- [x] Verification:
    - [x] `npm run check`
    - [x] quick responsive pass for 425x888 portrait + landscape

## Mobile Recovery Pass (2026-02-17)
- [x] Re-assert portrait mobile structure:
    - [x] Header/Footer stay overlay layers
    - [x] Video fixed to top 50dvh
    - [x] Queue fixed below video, full width, no side gap
- [x] Re-assert landscape mobile parity with desktop:
    - [x] Right-side floating queue panel with desktop-like insets
    - [x] Queue sizing and scroll behavior consistent with desktop
- [x] FAB placement correction:
    - [x] `fab-center` remains centered only for empty queue mode
    - [x] `fab-near-queue` stays right-side and lower above footer on portrait
- [x] Verification and close:
    - [x] `npm run check` passes
- [x] Post-fix regression:
    - [x] Fix CSS cascade-layer precedence so portrait overrides beat queue base rules
 - [x] Light theme icon contrast fix:
    - [x] Normalize SVG fill/stroke to `currentColor` for all icon assets
    - [x] Ensure header controls use theme text color in light mode
    - [x] Ensure FAB icon contrasts with FAB background in light mode

## Playback Stability Pass (2026-02-18)
- [x] End-of-track duplicate transition prevention
    - [x] Add one-shot guard for `onnext` per queue item in `VideoPlayer`
    - [x] Keep duration-based advance as fallback only (`duration + 1.5s`) and gate it
- [x] Drift/seek stability tuning
    - [x] Relax drift correction threshold/frequency to reduce micro-seek stutter
    - [x] Throttle forced resume attempts to avoid play/seek loops
- [x] Realtime transition smoothing
    - [x] Stop nulling `currentSong` immediately on `song_ended` client event
    - [x] Use scheduled refresh on transition events to avoid burst reloads
- [x] Queue advance backend sequencing
    - [x] Compute post-play queue in-memory inside transaction (remove extra queue query)
    - [x] Broadcast `queue_changed` after setting next playback state for non-empty queue

## Realtime Star Reactions (2026-02-18)
- [x] Add `STAR` action button next to `ADD`
- [x] Broadcast star reactions to all clients via `/api/realtime/star`
- [x] Render star burst overlay on all connected clients
- [x] Update effect to one-star-per-click with upward launch from button origin
- [x] Hide `STAR` button when there is no active playback
- [x] Increase first-frame star size to match button-scale appearance

## Dev Stability Hardening (2026-02-18)
- [x] Reuse a global Neon `Pool` across Vite HMR reloads
- [x] Add `pool.on('error')` handler to avoid dev server crash on idle socket termination
- [x] Add `withReadRetry` helper for transient Neon disconnects
- [x] Apply read retry to `GET /api/queue` and `GET /api/queue/current`
- [x] Verify with `npm run check`

## Realtime Sync Tightening (2026-02-18)
- [x] Tighten drift budget to ~250ms during active playback
- [x] Add capped micro-seek corrections for smoother resync (`<= 350ms` seek steps)
- [x] Add periodic hard sync (full seek) when drift exceeds 1.2s
- [x] Add transition lock keyed by `(queueId, startedAt)` to avoid duplicate/missed transition handling
- [x] Keep progress bar aligned to actual player time while sync remains server-driven
- [x] Verify with `npm run check`

## Help Landing Refactor (2026-02-18)
- [x] Redesign help landing to reduce visual noise and remove stacked background shadings
- [x] Establish clear reading flow: hero -> live strip -> story -> pricing -> FAQ
- [x] Improve typography hierarchy and scanability with Open Props font families
- [x] Keep layout wide-scroll friendly for popup container while remaining responsive
- [x] Verify with `npm run check`

## UI/Interaction Follow-ups (2026-02-18)
- [x] Add `n/N` keyboard shortcut for skip in dev/admin mode
- [x] Prevent queue hover/touch reveal when help popup is open
- [x] Rework help popup shell to full-viewport game-menu style
- [x] Fix help popup mobile clipping and top alignment
- [x] Add tooltips to `ADD` and `STAR` action buttons
- [x] Simplify `ADD`/`STAR` button gradient background and border styling

## Playback + DB Hardening (2026-02-18)
- [x] Add ms-precision playback state (`playback_state.startedAtMs`) with backward compatibility
- [x] Use `startedAtMs` in song payloads and client sync math (fallback to second timestamps)
- [x] Add DB indexes for queue/filtering/history/session/free-submission hot paths
- [x] Push Drizzle schema changes to Neon (`npm run db:push`)
- [x] Add unit tests for playback precision + star route behavior
