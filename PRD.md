# Product Requirements Document (PRD)

## 1. Executive Summary

- **Problem**: High-tier songs can dominate playback and reduce variety.
- **Solution**: Fair queue with tier gaps and enforced free-track interleaving.
- **Operating model requirement**: Playback must continue server-side even when no clients are connected.
- **Success**:
  - Premium tracks never play back-to-back when free tracks exist.
  - Queue feels varied and fair across tiers.
  - Station continues advancing 24/7 without viewer/controller presence.

## 2. User Experience & Functionality

### Personas
- **Premium users**: Expect higher frequency, not spam.
- **Free users**: Expect their song to play within a reasonable cycle.
- **Listeners**: Want variety and consistency.

### User Stories
- As a listener, I want premium tracks spaced out so I don’t hear repeats back-to-back.
- As a premium user, I want priority but with interleaving to keep engagement high.

### Acceptance Criteria
- **Premium interleaving**: After any premium song, play at least one free song (if any free exist).
- **Tier gaps**:
  - Platinum gap: 3 turns
  - Gold gap: 6 turns
  - Silver gap: 9 turns
- **Deterministic**: No random shuffling; ranking is deterministic.

## 3. Technical Specifications

### Queue Mechanics
- **Global Turn Counter**: total songs played (count of `queue_plays`).
- **lastPlayedTurn**: stored on each queue row.
- **Eligibility**: `nextEligibleTurn = lastPlayedTurn + gap`.
- **Effective turn**: `max(currentTurn, nextEligibleTurn)`.
- **Interleaving rule**: if last played was premium and any free exists, choose free next.

### Playback State
- Persisted in DB (`playback_state`): `currentQueueId`, `startedAt`, `startedAtMs`.
- `startedAtMs` is the sync source of truth for tighter cross-client alignment.
- Clients sync via Ably events + periodic `GET /api/queue/current`.
- Automatic queue progression target is server-authoritative scheduler (cron/worker tick), not client heartbeat.

### Autonomous Station Tick
- Server-side `stationTick()` runs via schedule and explicit internal calls.
- Tick computes elapsed time from DB clock and advances queue as needed.
- Tick path is idempotent, lock-protected, and supports catch-up after downtime gaps.
- Tick publishes realtime events so clients remain passive viewers in production.
- Status:
  - Implemented service (`stationTick`) and endpoint (`POST /api/station/tick`).
  - Implemented runtime heartbeat state (`station_runtime`) and health/status exposure.
  - Implemented no-client progression behavior with server-authoritative transitions.

### Realtime
- **Ably Pub/Sub** events:
  - `song_playing`, `song_ended`, `queue_changed`, `song_added`.
- Clients subscribe only; server publishes.

### Admin
- Admin-only controls: **skip, seed, clear** (hidden from regular users).
- Admin mode enabled via secret code; dev mode always enabled.
- Dev/Admin keyboard shortcuts:
  - `N` = skip next
  - `H` = help menu toggle

## 4. Risks & Mitigations

- **Concurrency**: Use transactions + advisory locks during advance.
- **Desync**: Ably events + 1s sync to `/api/queue/current`.
- **Seed performance**: concurrent metadata fetch with timeouts.
- **No-client downtime**: mitigate with autonomous server tick and catch-up logic.
- **Scheduler outage**: expose health metrics (`lastTickAt`, lag) and alerting.

## 5. Non-Goals

- Full playlist shuffling or randomized queue ordering.
- User accounts for all users (anonymous flow remains primary).
