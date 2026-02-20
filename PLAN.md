# Rocola Plan (Current Architecture)

## Scope

Rocola is a server-authoritative shared playback station:

- One global queue.
- One global current track.
- Real-time fanout to all viewers.
- Queue progresses even with zero connected clients.

## Runtime Ownership

| Domain | Owner | Notes |
|---|---|---|
| Queue ordering, fairness, replay gaps | Server (`queue` + `playback` services) | Clients never decide queue order. |
| Playback progression (auto-next) | Server (`stationTick` + playback endpoints) | Cron + API tick keep station moving without viewers. |
| Realtime broadcast | Server (Ably publish) | Clients are subscribers first; admin is command issuer. |
| Current playback pointer | DB (`playback_state`) | Single source of truth for `currentQueueId`, `startedAtMs`. |
| Controller authority (admin actions) | DB (`controller_lease`) | Only active controller may skip/clear/seed/admin operations. |
| UI state and rendering | Client | Derived from server truth + realtime events. |
| Toasts, local animations, theme | Client-local | Non-authoritative UX layer only. |

## Data Flow

1. Client initializes realtime + queue/current fetch.
2. Client renders current server truth (`/api/queue/current`, `/api/queue`).
3. Server emits `song_playing`, `queue_changed`, `song_ended`, `star_burst`.
4. Clients update view state; they do not independently advance station in production.
5. Server cron (`/api/station/tick`) advances playback when needed.

## Current Code Organization

```
src/
  lib/
    client/
      realtime.js              # Ably subscribe/publish client wiring
      stores.svelte.js         # client state cache + hydration + toasts
      shortcuts.js             # keyboard decision logic
      admin-runtime.js         # controller heartbeat, admin health poll, admin/playback command API wrappers
      page-runtime.js          # page-level UI runtime (shortcuts binding, queue reveal, viewport watcher)
      station-page-state.svelte.js # page state/composition hook for +page.svelte
    components/
      Icon.svelte              # shared SVG icon contract
      StationHeader.svelte     # header/admin controls presentation
      QueuePanel.svelte        # queue shell + visibility presentation
      HelpOverlay.svelte       # help modal shell presentation
      Queue.svelte             # presentational queue list (props in)
      QueueItem.svelte         # presentational row (props in)
      VideoPlayer.svelte       # YouTube player + sync behavior
      AddToQueue.svelte        # add/star UI + checkout trigger
      LandingPage.svelte       # help/marketing panel (metrics props in)
      NowPlayingOverlay.svelte # footer metadata + progress presentation
      StarBurstOverlay.svelte  # reaction animation presentation
      Toast.svelte             # toast presentation
    server/
      db/
        schema.js
        index.js
      services/
        queue.js               # selection + fairness rules
        playback.js            # transitions + publishing
        playback-reconcile.js  # stale pointer recovery
        station.js             # autonomous station tick
        status.js              # health/status aggregation
      security.js              # auth/rate limiting helpers
  routes/
    +page.svelte               # station composition/orchestration
    status/+page.svelte        # public status dashboard
    api/
      queue/*                  # queue CRUD + current + next + unavailable
      playback/*               # ended/tick controls
      station/tick             # cron entrypoint
      realtime/*               # token + star
      admin/*                  # enable/controller/health
      debug/*                  # seed/clear/playback-log
```

## Component Contract Direction (Refactor Rule)

Target pattern for all reusable UI:

- `props in`: primitive values + small POJOs only.
- `events out`: callbacks or event handlers only.
- no direct DB, route, or realtime dependency inside presentational components.
- app-specific orchestration stays in route-level container (`+page.svelte`) or `lib/server/services/*`.

Already moved to contract-first:

- `Queue.svelte` now accepts `items`, `currentTurn`, `emptyMessage`.
- `QueueItem.svelte` now accepts `item`, `currentTurn`.
- `LandingPage.svelte` now accepts `metrics` + explicit admin-health props.

## Immediate Refactor Backlog

1. Split `+page.svelte` into feature containers (`StationHeader`, `QueuePanel`, `HelpOverlayContainer`).
2. Move admin command handlers (skip/seed/clear/controller heartbeat) into client service module.
3. Reduce `VideoPlayer.svelte` store coupling by passing `currentSong`, `clockOffsetSec`, and callback hooks only.
4. Define shared JSDoc contracts for `Song`, `QueueItemView`, `LandingMetrics`.
5. Keep integration tests aligned with server-authoritative station semantics.

## Operational Checks

- `npm run check` must stay clean.
- `npm run test:unit` must cover queue fairness + playback transition guards.
- `npm run test:e2e` must keep controller exclusivity and restricted-video convergence green.
- `/status` should reflect real runtime metrics (not mocked values).
