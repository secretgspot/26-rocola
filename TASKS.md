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
- [x] Refactor global keyboard shortcuts into testable helper module
- [x] Add unit tests for shortcut behavior (`H`, `N`, Konami progression)
- [x] Improve integration test workflow with optional auto-start (`INTEGRATION_START_SERVER=1`)
- [x] Verify test suite: `npm run check`, unit tests, integration tests
- [x] Add client sync observability stats (drift p50/p95, micro/hard sync counts, transition latency)
- [x] Surface sync observability in help landing live metrics strip
- [x] README cleanup and script/test workflow refresh

## Authority + Transition Hardening (2026-02-18)
- [x] Replace in-memory controller lease with DB-backed lease table (`controller_lease`)
- [x] Add controller claim endpoint and client heartbeat (`/api/admin/controller`)
- [x] Show `CTRL` badge only on active controller client
- [x] Enforce controller-only access for playback control endpoints (`/api/queue/next`, `/api/queue/unavailable`)
- [x] Add server-authoritative playback tick endpoint (`/api/playback/tick`)
- [x] Poll playback tick from active controller on fixed cadence
- [x] Add stale-event protection using playback event sequence (`eventSeq`, client-side stale ignore)
- [x] Add transient playback error policy (retry up to 3 for non-restriction errors)
- [x] Mark restriction-blocked songs unavailable and force playback unstick
- [x] Extend songs schema for playback error observability (`errorCount`, `lastErrorCode`, `lastErrorAt`)
- [x] Push schema updates to Neon (`npm run db:push`)
- [x] Verify with `npm run check`, unit tests, integration tests
- [x] Add non-controller blocked-playback resilience:
    - [x] Keep HUD/progress alive during local embed-blocked playback
    - [x] Force hard reload on transition after local playback block (unstick stale iframe errors)
    - [x] Add footer note: local embed blocked while timeline remains live
    - [x] Make `/api/queue/current` recovery writes controller-only (read endpoint no longer mutates playback for passive clients)
    - [x] Add client convergence guard that force-loads target video if iframe/videoId diverges from live store state
    - [x] Add pre-end handoff to suppress YouTube end-screen recommendations
    - [x] Tune pre-end threshold to `1.1s` before end for cleaner transitions
    - [x] Prevent double-skip after blocked-video auto-skip by avoiding `queue/next` consume path on `unavailable -> skip`
    - [x] Reduce early-playback stutter by relaxing warmup drift-correction thresholds
    - [x] Guard pre-end handoff against short/unknown-duration tracks to prevent sub-second auto-skip
    - [x] Gate auto-advance to only fire when player's active `video_id` matches current queue video
    - [x] Add minimum track-age guard before any auto-advance trigger can consume next
    - [x] Refactor sync thresholds into unified `SYNC_CFG` and relax warmup corrections to reduce startup stutter
    - [x] Add convergence warmup gate so mismatch recovery cannot force-reload during first ~2.6s of a new track
    - [x] Remove client-side duration-based auto-advance consumption (server-authoritative transitions only)
    - [x] Increase controller playback tick cadence to `320ms` and tighten server elapsed threshold to `+120ms` for smoother handoff
    - [x] Expand startup warmup window and drift thresholds to cut first-seconds seek jitter
    - [x] Add ended-state guard in player (`state=0` ignored unless near actual duration end)
    - [x] Add startup auto-advance guard in `/api/playback/tick` (no consume in first `1800ms`)
    - [x] Remove optimistic `queue/next` consume on unknown playback-error outcomes
    - [x] Fix backend multi-skip race in `advanceQueue` by reading playback state after advisory lock acquisition
    - [x] Disable seek-on-play and remove aggressive hard-sync loop to reduce startup stutter
    - [x] Make periodic drift correction conservative (post-6s only, hard seek only on large drift)
    - [x] Route end transitions through controller-only `/api/queue/next` (from `onendedsignal`) for immediate handoff
    - [x] Replace strict duration-based ended guard with startup-age + near-end guard to handle metadata mismatch without long end-screens
    - [x] Add conservative startup error handling in player (local retries before server-side unavailable/skip on non-restriction errors)
    - [x] Harden ended-event guard further (ignore non-near-end ended pulses during first 8s to prevent random early consumes)
    - [x] Route `onended` through server tick validation (no direct client consume on ended pulse)
    - [x] Change non-restriction playback errors to temporary skip (advance queue) instead of permanent song blacklisting
    - [x] Add dedicated controller-only ended endpoint (`/api/playback/ended`) to advance immediately at true end without duration-metadata lag
    - [x] Add per-queue ended dedupe in player to prevent duplicate consume attempts from repeated ended events
    - [x] Delay paused-state auto-resume correction for first 5s to reduce startup stutter/thrash
    - [x] Add startup error gate using observed playback progress before any server-side unavailable/skip action
    - [x] Add near-end handoff trigger from player time (controller-only) to reduce YouTube end-screen linger
    - [x] Add structured playback debug log system (`/api/debug/playback-log`) with in-memory ring buffer, read/write/clear endpoints
    - [x] Instrument server transition paths (`queue/next`, `playback/tick`, `playback/ended`, `queue/unavailable`) with structured event logs
    - [x] Instrument client/controller playback signals (ended, tick-advance, player errors/retries) into debug log stream
    - [x] Persist debug log stream to local file `docs/debug/playback-log.ndjson` for post-run forensic analysis
    - [x] Add idempotency guard in `advanceQueue` using `queue_plays` + playback start time to block duplicate consumes from concurrent end/tick signals
    - [x] Bind ended-signal queue/video IDs to actively loaded player track (not reactive page state) to prevent stale-end consuming newly started song
    - [x] Add server `playback/ended` guards for video mismatch and early-ended timing against active track duration
    - [x] Prevent overlapping controller tick requests and temporarily suppress tick polling after ended signal handoff
    - [x] Use actively loaded queue/video IDs for near-end handoff payloads (not reactive store IDs)
    - [x] Prevent stale-playback pointer from consuming next song in `advanceQueue` when current playback queue ID is no longer in eligible rows
    - [x] Make `playback/tick` invalid-current path non-consuming (no secondary advance on stale pointer)

## Next Planned Hardening
- [x] Add dedicated unit tests for controller lease race/takeover scenarios
- [x] Add integration coverage for controller failover (active tab closed -> standby acquires)
- [x] Add admin health widget in UI using `/api/admin/health/realtime`
    - [x] Place admin health stats in help landing metrics strip (admin/dev only), not header
- [ ] Add Playwright E2E for controller exclusivity and restricted-video convergence

## Autonomous Station Mode (Always-On Playback)
- [x] Phase A: Introduce server scheduler ownership
    - [x] Add `station_runtime` table for scheduler heartbeat/lease and last tick time
    - [x] Add `stationTick()` server service that advances playback based on DB clock only
    - [x] Make `stationTick()` idempotent and safe under concurrent invocations (advisory lock)
- [ ] Phase B: Add execution path independent of viewers
    - [x] Add `/api/station/tick` internal endpoint protected by secret + rate guard
    - [ ] Add Vercel Cron to call `/api/station/tick` every 15-30s
    - [x] Ensure catch-up logic advances multiple songs if downtime gap elapsed
- [ ] Phase C: Realtime broadcast from server ticker
    - [ ] Server publishes `song_playing`, `queue_changed`, `song_ended` from autonomous tick path
    - [ ] Clients become passive listeners for normal operation (no client-required progress driving)
- [ ] Phase D: Client/controller simplification
    - [ ] Keep admin `skip/seed/clear` as explicit actions
    - [ ] Remove dependency on controller polling for automatic transitions
    - [ ] Retain controller lease only for admin command authority
- [ ] Phase E: Validation + observability
    - [ ] Unit tests for `stationTick()` timing transitions and catch-up
    - [x] Integration test: no clients connected -> queue still advances over time
    - [x] Add station lag/last tick metrics to health endpoint + help admin stats
    - [ ] Add runbook for cron failure, Neon outage, and replay recovery

## Installability (2026-02-19)
- [x] Add web app manifest (`static/manifest.webmanifest`)
- [x] Include manifest screenshots in new format (desktop + mobile `form_factor`)
- [x] Add static PWA assets (`static/icons/icon.svg`, screenshot files)
- [x] Add service worker (`src/service-worker.js`) for installability/offline shell caching
- [x] Wire manifest + mobile web app meta tags in `src/app.html`
- [x] Update README with screenshot section and install instructions
- [x] Generate PNG app icons (`192`, `512`, maskable variants) and wire manifest to PNG entries
- [x] Add screenshot capture automation script (`npm run pwa:screenshots`) for seeded desktop/mobile shots
- [x] Add icon generation automation script (`npm run pwa:icons`)
- [x] Add preflight env/config sanity script (`npm run preflight:check`)
- [x] Run Playwright E2E suite and fix stale tests to match controller-lease behavior
- [x] Run Lighthouse audits and persist JSON reports to `docs/debug/`
