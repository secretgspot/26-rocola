# Rocola (Minimal Jukebox)

A SvelteKit + Svelte 5 jukebox with Neon Postgres, Ably realtime sync, Stripe checkout, fair queue rotation, and shared playback timeline.

## Core Features
- Fair queue management (free + premium tiers, gap enforcement)
- YouTube iframe playback with shared timeline sync (`startedAtMs`)
- Realtime events (queue changes, song transitions, star reactions)
- Admin/dev controls (seed, skip, clear)
- Help menu and keyboard shortcuts

## Quick Start
1. Install dependencies:
```powershell
npm install
```
2. Start dev server:
```powershell
npm run dev
```
3. Open `http://localhost:5173`

## Operator Shortcuts (Dev/Admin)
- `H` - toggle help menu
- `N` - skip to next song (dev/admin only)
- `Up Up Down Down Left Right Left Right A B` - enable admin mode

## Environment
- `DATABASE_URL` - Neon Postgres connection string
- `ABLY_SUPER_API_KEY` - Ably key for token issuance / publish path
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` - Stripe backend
- `YOUTUBE_API_KEY` - optional metadata enrichment
- `NODE_ENV` - dev/prod behavior gates

## Scripts
- `npm run dev` - start dev server
- `npm run check` - svelte check
- `npm run db:push` - apply Drizzle schema changes
- `npm run test` - vitest suite
- `npm run test:integration` - integration tests (expects running server)
- `npm run test:e2e` - playwright e2e (browser install required)

## Tests
- Unit tests cover queue routes/services, security, checkout completion, playback precision, star route, shortcuts.
- Integration tests cover queue/current payload behavior, queue-next response shape, and dev duplicate bypass behavior.

Integration test options:
- Default: start app separately, then run `npm run test:integration`
- Auto-start mode:
```powershell
$env:INTEGRATION_START_SERVER = "1"
npm run test:integration
```

## Notes
- In dev/admin mode, free-tier daily duplicate restriction is bypassed by design.
- Realtime playback synchronization now uses millisecond precision where available.
