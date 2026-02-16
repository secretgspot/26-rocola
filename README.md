# Rocola (Minimal Jukebox)

A tiny SvelteKit + Drizzle + SQLite jukebox demo used for local development and experimentation. Focused features:

- Queue management (add, advance, per-day plays limit)
- YouTube-backed player (iframe wrapper)
- Real-time sync via WebSocket broadcasts
- Dev-friendly seeding and debug utilities

---

## Quick start ⚡

0. codex resume 019c4612-092d-7712-9ed8-6f15d67ae8cd

1. Install dependencies and run dev server

```powershell
npm install
npm run dev
# or (if you use bun)
bun install
bun run dev -- --open
```

1. Open <http://localhost:5173>

2. (Payments) Start the Stripe Webhook listener in a separate terminal:

```powershell
npm run stripe:listen
```

1. Use the **[SEED]** and **[FORCE_NEXT]** buttons in the header (visible only in dev mode) to pre-populate the queue and skip songs.

---

## Developer-Only Features 🛠️

The following features are available only when `NODE_ENV === 'development'` (or when running `npm run dev`):

- **[SEED] Button**: Reads `docs/queue.txt`, fetches metadata, and populates the queue with a 90% Free / 10% Premium distribution.
- **[FORCE_NEXT] Button**: Immediately advances the queue to the next song, bypassing the current playback.
- **API Endpoint**: `POST /api/debug/seed` — The backend logic for the SEED button.

---

## Environment & important settings 🔧

- DATABASE_URL — path to the SQLite DB file used by the server (required for integration tests and some scripts). Example on Windows PowerShell:
  - $env:DATABASE_URL = "v:\\Dropbox\\PROJECTS\\_WEB\\_DEV\\26-rocola\\local.db"
- NODE_ENV — the seed endpoint and certain behavior are guarded to run only when `NODE_ENV === 'development'`.
- YOUTUBE_API_KEY — optional, used by the YouTube validation endpoint if available.

---

## Dev utilities & scripts 🧰

- `scripts/seed_queue.mjs` — offline seed script to insert songs & queue rows.
- `scripts/check_db.mjs` — prints DB table samples and diagnostics.
- `scripts/ws_client2.mjs` — simple WS client useful for debugging broadcasts.

---

## Tests (small integration test) ✅

A pragmatic integration test is available to validate queue behavior:

- Script: `scripts/test_queue_integration.mjs`
- Runs: `npm run test:integration` (added to `package.json`)

What it asserts:

- POST `/api/debug/seed` returns OK and seeds items
- GET `/api/queue/current` returns the current song
- GET `/api/queue` does *not* include the current song (upcoming list excludes current)
- If we set `playsRemainingToday = 0` on an upcoming queue item directly in the DB, `/api/queue` should exclude that item

How to run the integration test:

1. Start the dev server (so API endpoints are reachable at localhost:5173)
2. Ensure `DATABASE_URL` is set in your environment (path to sqlite file)
3. Run:

```powershell
npm run test:integration
```

Note: This test is lightweight and expects a running server and direct DB access (dev scenario).

---

## Key files & where to look 🗺️

- Server & DB
  - `src/lib/server/db/schema.js` — Drizzle schema
  - `src/lib/server/db/index.js` — DB connection
  - `src/routes/api/queue/*` — GET/POST queue, `current`, `next`
  - `src/routes/api/debug/seed/+server.js` — dev seeding endpoint
- Client
  - `src/lib/client/stores.js` — Svelte stores, realtime init, filtering logic
  - `src/lib/client/websocket.js` — WS helper
- UI
  - `src/lib/components/` — `Queue.svelte`, `QueueItem.svelte`, `AddToQueue.svelte`, `VideoPlayer.svelte`, `PlayerControls.svelte`, `Toast.svelte`
- Scripts
  - `scripts/seed_queue.mjs`, `scripts/check_db.mjs`, `scripts/test_queue_integration.mjs`

---

## Current state & notes for future work 📝

- ✅ Core features implemented: queue, advance, per-day play limits, real-time sync, basic UI with toasts and player integration.
- ✅ Dev seed endpoint and seed script are available and tested to set a predictable state.
- ✅ Client filters upcoming queue to exclude the currently playing song and entries with zero `playsRemainingToday`.

Pending / recommended next steps:

- Add proper automated test runner (Vitest) and convert integration script into a tracked test with setup/teardown.
- Add end-to-end tests for WS broadcasts (song_playing, queue_changed).
- Add admin confirmation for destructive dev endpoints and more robust auth for production.

---

## How to operate (short checklist) 🔁

- Start dev server: `npm run dev`
- Seed queue during dev: open app -> click **Seed queue (dev)** in the Add UI
- Advance current song (client): press **Next** in the Player controls
- Run integration test: set `DATABASE_URL`, start server, `npm run test:integration`

---

## Notes for future AI agents 🤖

- Look at `src/lib/client/stores.js` for the logic that filters the queue and syncs with server broadcasts.
- The dev seed endpoint (`/api/debug/seed`) is the fastest way to achieve a deterministic queue state in development.
- Tests currently are lightweight; prefer adding Vitest-based unit/integration tests before attempting production changes.

---

If you'd like, I can convert the integration script into a Vitest test and add a small CI workflow to run it on PRs. ✅
