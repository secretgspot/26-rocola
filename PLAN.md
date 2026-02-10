# Rocola Jukebox – Updated Project Plan

## Project Overview

A no‑registration YouTube-based music queue where users get one free song slot per day and can pay for higher visibility and play frequency. Minimal monochrome HUD UI, automatic queue progression, realtime sync, and graceful video error handling.

---

## Core Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Framework** | SvelteKit 2.x + Svelte 5 (Runes) | Modern, performant, built-in SSR |
| **Database** | Neon Serverless Postgres + Drizzle ORM | Serverless Postgres, Vercel-friendly, type-safe |
| **Video Source** | YouTube Data API v3 + iframe embed | Simple, no authentication required |
| **Payments** | Stripe Checkout & Webhooks | Standard, robust, easy integration |
| **Real-time** | Ably Pub/Sub | Low-latency realtime across clients |
| **Sessions** | httpOnly Cookies + IP tracking | Anonymous user support, secure |
| **Deployment** | adapter-vercel | Serverless deployment |

---

## Project Structure (current)

```
rocola/
├── src/
│   ├── app.d.ts
│   ├── app.html
│   ├── hooks.server.ts
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db/
│   │   │   │   ├── index.js
│   │   │   │   └── schema.js
│   │   │   ├── realtime.js
│   │   │   ├── stripe.js
│   │   │   └── services/
│   │   │       ├── playback.js
│   │   │       └── queue.js
│   │   ├── client/
│   │   │   ├── realtime.js
│   │   │   ├── stores.svelte.js
│   │   │   └── youtube-player.js
│   │   └── components/
│   │       ├── AddToQueue.svelte
│   │       ├── Queue.svelte
│   │       ├── QueueItem.svelte
│   │       ├── VideoPlayer.svelte
│   │       └── Toast.svelte
│   ├── routes/
│   │   ├── +layout.svelte
│   │   ├── +layout.server.js
│   │   ├── +page.svelte
│   │   └── api/
│   │       ├── admin/enable/+server.js
│   │       ├── checkout/+server.js
│   │       ├── checkout/return/+server.js
│   │       ├── debug/seed/+server.js
│   │       ├── debug/clear/+server.js
│   │       ├── queue/+server.js
│   │       ├── queue/current/+server.js
│   │       ├── queue/next/+server.js
│   │       ├── realtime/token/+server.js
│   │       ├── webhooks/stripe/+server.js
│   │       └── youtube/validate/+server.js
│   └── styles/
├── svelte.config.js
├── drizzle.config.js
└── .env
```

---

## UI Design Direction (Minimal Monochrome HUD)

- **Background** — pure black, minimal gradient
- **Palette** — monochrome HUD with subtle tier accents
- **Typography** — Open Props monospace
- **Interactions** — minimal, subtle hover feedback
- **Density** — clean spacing, no excessive boxes or frames

---

## Deployment

- Vercel serverless
- Neon Postgres
- Ably realtime

---

## Future Phases

- Polish & Security (rate limiting, abuse prevention)
- Admin observability (queue stats, operations)
