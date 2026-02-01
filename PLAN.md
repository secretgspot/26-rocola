# Rocola Jukebox – Complete Project Plan

## Project Overview

A no-registration YouTube-based music queue where users get one free song slot per day and can pay via Lemon Squeezy for higher visibility and play frequency. Features futuristic, game-style UI with automatic queue progression, real-time sync, and graceful video error handling.

---

## Core Technology Stack

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Framework** | SvelteKit 2.x + Svelte 5 (Runes) | Modern, performant, built-in SSR |
| **Database** | SQLite + better-sqlite3 + Drizzle ORM | Local, no hosted dependencies, type-safe |
| **Video Source** | YouTube Data API v3 + iframe embed | Simple, no authentication required |
| **Payments** | Lemon Squeezy REST API | Minimal friction, webhook support |
| **Real-time** | WebSocket (Socket.io or native) | Queue sync across clients |
| **Sessions** | httpOnly Cookies + IP tracking | Anonymous user support, secure |
| **Deployment** | adapter-node | Full Node.js control |

---

## Project Structure

```
rocola/
├── src/
│   ├── app.d.ts
│   ├── hooks.server.ts          # Session, IP tracking, auth
│   ├── lib/
│   │   ├── server/
│   │   │   ├── database.ts      # Drizzle DB connection
│   │   │   ├── schema.ts        # Database schema definitions
│   │   │   ├── youtube.ts       # YouTube API client
│   │   │   ├── lemonsqueezy.ts  # Lemon Squeezy API client
│   │   │   └── queue.ts         # Queue logic (ranking, play counts)
│   │   ├── client/
│   │   │   ├── youtube-player.ts   # YouTube iframe control
│   │   │   ├── websocket.ts        # WebSocket client
│   │   │   └── stores.ts           # Svelte 5 runes stores
│   │   └── utils.ts
│   ├── routes/
│   │   ├── +page.svelte         # Homepage (main jukebox player)
│   │   ├── +layout.svelte
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── +server.ts   # Lemon Squeezy payment callback
│   │   ├── api/
│   │   │   ├── youtube/
│   │   │   │   └── validate/
│   │   │   │       └── +server.ts   # Validate YouTube links
│   │   │   ├── queue/
│   │   │   │   ├── +server.ts       # GET queue, POST add song
│   │   │   │   └── next/
│   │   │   │       └── +server.ts   # Advance to next song
│   │   │   ├── checkout/
│   │   │   │   └── +server.ts       # Create Lemon Squeezy checkout
│   │   │   └── webhooks/
│   │   │       └── lemonsqueezy/
│   │   │           └── +server.ts   # Payment webhook handler
│   │   └── account/
│   │       └── +page.svelte     # User dashboard (credits, history)
│   └── styles/
│       └── app.css              # OpenProps + custom game UI styles
├── data/
│   └── jukebox.db               # SQLite database
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env.local                   # YouTube API key, Lemon Squeezy secret, etc.
```

---

## Database Schema (Drizzle ORM)

### Songs Table

```typescript
export const songs = sqliteTable('songs', {
  id: text().primaryKey(), // UUID
  videoId: text().notNull().unique(),
  title: text().notNull(),
  thumbnail: text(),
  duration: integer(), // seconds
  channelTitle: text(),
  metadata: text(), // JSON stringified
  submittedBy: text().notNull(), // IP hash or session ID
  createdAt: integer().notNull(), // unix timestamp
  isAvailable: integer().default(1), // boolean flag
  totalPlays: integer().default(0),
});
```

### Queue Table

```typescript
export const queue = sqliteTable('queue', {
  id: text().primaryKey(), // UUID
  songId: text().notNull().references(() => songs.id),
  tier: text().notNull(), // 'free' | 'silver' | 'gold' | 'platinum'
  baseRank: integer().notNull(), // original submission order
  rankBoost: integer().default(0), // tier-based boost
  playsRemainingToday: integer().notNull(), // based on tier
  promotionExpiresAt: integer(), // unix timestamp | null
  createdAt: integer().notNull(),
  updatedAt: integer().notNull(),
});
```

### Queue Plays (Analytics)

```typescript
export const queuePlays = sqliteTable('queue_plays', {
  id: text().primaryKey(),
  queueId: text().notNull().references(() => queue.id),
  tier: text().notNull(),
  playedAt: integer().notNull(),
  skippedAt: integer(), // if user skipped
  watchedDuration: integer(), // seconds watched
});
```

### Daily Play Counts (Reset at UTC midnight)

```typescript
export const dailyPlayCounts = sqliteTable('daily_play_counts', {
  id: text().primaryKey(),
  queueId: text().notNull().references(() => queue.id),
  tier: text().notNull(),
  playDate: text().notNull(), // YYYY-MM-DD
  playsToday: integer().default(0),
  resetAt: integer().notNull(), // unix timestamp
});
```

### Free Submission Log (1 per IP per day)

```typescript
export const freeSubmissions = sqliteTable('free_submissions', {
  id: text().primaryKey(),
  ipAddress: text().notNull(),
  songId: text().references(() => songs.id),
  submissionDate: text().notNull(), // YYYY-MM-DD
  createdAt: integer().notNull(),
});
```

### Payments / Orders

```typescript
export const orders = sqliteTable('orders', {
  id: text().primaryKey(), // UUID
  lemonsqueezyOrderId: text().notNull().unique(),
  queueId: text().notNull().references(() => queue.id),
  tier: text().notNull(), // 'silver' | 'gold' | 'platinum'
  amount: integer().notNull(), // cents (e.g., 200 = $2.00)
  currency: text().default('USD'),
  status: text().notNull(), // 'pending' | 'completed' | 'failed'
  lemonsqueezyCheckoutUrl: text(),
  ipAddress: text().notNull(), // for analytics
  createdAt: integer().notNull(),
  completedAt: integer(), // when payment succeeded
});
```

### Session / Anonymous Users

```typescript
export const sessions = sqliteTable('sessions', {
  id: text().primaryKey(), // UUID from cookie
  ipAddress: text().notNull(),
  userAgent: text(),
  lastActivityAt: integer().notNull(),
  createdAt: integer().notNull(),
});
```

---

## Payment Tiers & Frequency Control

| Tier | Price | Daily Plays | Gap | Priority | Notes |
|------|-------|-------------|-----|----------|-------|
| **Free** | $0 | 1 play/day | N/A | 0 | Standard rotation |
| **Silver** | $2 | 3 plays/day | 5th turn | 1 | Plays once every 5 songs |
| **Gold** | $5 | 7 plays/day | 3rd turn | 2 | Plays once every 3 songs |
| **Platinum** | $10 | 15 plays/day | 2nd turn | 3 | Plays once every 2 songs |

---

## Homepage UI Flow

### Layout Structure

1. **Full-screen YouTube player** (center, ~70% height)
   - Displays current queue song
   - YouTube iframe with autoplay
   - Song title, duration overlay

2. **Queue list below player** (~30% height)
   - Shows next 5 songs with tier badges
   - Color-coded by tier (gray=free, blue=silver, yellow=gold, purple=platinum)
   - Song title, channel, cooldown status

3. **Floating plus icon** (bottom-right, semi-transparent)
   - Click to open add-to-queue overlay (INJECT_SEQUENCE)
   - Or auto-open on paste detection

### Add-to-Queue Overlay (INJECT_SEQUENCE)

- **Video metadata** — Thumbnail, title, channel, duration
- **Tier selection buttons** — FREE_LOAD, SILVER_BOOST, GOLD_STRIKE, ULTRA_VOID
- **Tier descriptions** — e.g., "15 plays • Every 2nd turn"
- **Action button** — "Submit" for free, "Pay $X" for premium
- **Paste detection** — Auto-prefill form when YouTube link pasted

---

## Queue Advancement & Playback Logic

### Song Lifecycle

1. **On page load** — Fetch highest-ranked eligible song from queue
2. **Load into iframe** — YouTube embed with `onYouTubeIframeAPIReady`
3. **Monitor state** — Listen to `onPlayerStateChange` event
4. **Song ends** (state: 0) — Mark as played, check remaining plays, update `lastPlayedTurn`
5. **Auto-advance** — Load next eligible song based on Gap logic
6. **Broadcast update** — WebSocket emits `queue_changed` to all clients

### Queue Ranking Formula (Gap Enforcement)

The system uses a **Global Turn Counter** and **Gap Enforcement** to ensure variety.

**Sorting Priority:**

1.  **Effective Turn** (ASC): `max(GlobalTurn, LastPlayedTurn + Gap)`
2.  **Tier Priority** (DESC): Platinum (3) > Gold (2) > Silver (1) > Free (0)
3.  **Base Rank** (ASC): Original submission timestamp

This ensures that even a Platinum song must wait for its "Gap" to pass before playing again, unless no other eligible songs are in the queue.

### Daily Reset (UTC Midnight)

- Cron job or scheduled function runs at 00:00 UTC
- Reset `playsRemainingToday` for all queue items to tier limit
- Update `dailyPlayCounts` table
- Archive old play logs

---

## Video Unavailability Handling

### Detection Methods

| Scenario | Detection | Action |
|----------|-----------|--------|
| **Video deleted** | YouTube API 404 or iframe load timeout | Skip to next; log error |
| **Video private** | YouTube API 403 or iframe blocked | Skip; toast: "Video unavailable" |
| **Age-restricted** | YouTube API 410 or playback blocked | Skip; toast: "Age-restricted" |
| **Regional blocked** | YouTube API region error | Skip; toast: "Not in your region" |
| **Iframe timeout** | No onPlayerReady after 5s | Skip; retry next queue item |

### Implementation Flow

1. **YouTube validation** — `/api/youtube/validate` checks video on submission
2. **Iframe error handler** — Catches load errors; marks video as unavailable
3. **Auto-skip** — WebSocket broadcasts `video_unavailable` event
4. **Toast notification** — Brief user message, then auto-advances
5. **DB flag** — Set `isAvailable = 0` to prevent future plays

---

## Payment Integration (Lemon Squeezy)

### Checkout Flow

1. **User selects tier** — Silver ($2), Gold ($5), or Platinum ($10)
2. **POST to `/api/checkout`** — Send song ID + tier
3. **Create checkout link** — Call Lemon Squeezy API to generate link
4. **Redirect to checkout** — Lemon Squeezy hosted page
5. **User completes payment** — Lemon Squeezy processes
6. **Webhook callback** — POST to `/api/webhooks/lemonsqueezy`
7. **Update queue** — Set promotion tier, rank boost, plays limit, expiry
8. **Broadcast to clients** — WebSocket emits queue update

### Webhook Verification

- Verify HMAC-SHA256 signature from `X-Signature` header
- Use `sha256(raw_body, LEMONSQUEEZY_WEBHOOK_SECRET)`
- Reject if signature doesn't match

### Events to Handle

- `order.completed` — Payment successful, grant tier to queue item
- `order.failed` — Payment failed, notify user (optional)
- `order.refunded` — Refund processed, downgrade tier back to free

---

## Session & Anonymous User Tracking

### Cookie Strategy (SvelteKit `hooks.server.ts`)

```typescript
event.cookies.set('session_id', sessionId, {
  path: '/',
  httpOnly: true,
  secure: !dev,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365 // 1 year
});
```

### Free Submission Enforcement

- Extract user IP: `event.getClientAddress()`
- Check `freeSubmissions` table for today's date + IP
- Allow 1 submission per IP per calendar day (UTC)
- Return 403 if limit exceeded

### Play Count Enforcement

- Check `dailyPlayCounts` per queue item per tier per date
- Allow playback only if `playsToday < tierLimit`
- Decrement on song end
- Reset at UTC midnight

### IP-based Rate Limiting

- Track plays in last 5 minutes
- Reject if > 5 plays in 5 min (abuse prevention)
- Log suspicious activity

---

## Real-time Queue Sync (WebSocket)

### Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `queue_changed` | Server → Clients | `{ queue: [...songs], currentSongId }` |
| `song_added` | Server → Clients | `{ song, position, tier }` |
| `song_playing` | Server → Clients | `{ songId, startedAt }` |
| `song_ended` | Server → Clients | `{ songId, endedAt, skipped }` |
| `video_unavailable` | Server → Clients | `{ songId, reason }` |
| `tier_exhausted` | Server → Clients | `{ songId, tier }` |
| `payment_complete` | Server → Clients | `{ songId, newTier, boost }` |

### Broadcasting

- On any queue change, emit to ALL connected clients
- Ensures queue list updates in real-time for all users
- Player automatically advances on client when song ends

---

## UI Design Direction (Futuristic, Game-Style)

### Color Palette & Styling

- **Background** — Dark (near-black #0a0e27)
- **Accent colors** — Neon cyan (#00d9ff), neon pink (#ff006e), neon purple (#8338ec)
- **Tier badges** — Free (gray), Silver (cyan), Gold (yellow), Platinum (purple)
- **Glowing effects** — Text-shadow, box-shadow with neon colors
- **Typography** — Arcade-style fonts (e.g., 'Press Start 2P', 'Orbitron')

### Component Examples

- **Plus icon** — Glowing circle, scales on hover
- **Tier buttons** — Glassmorphism cards with neon borders
- **Queue list** — Rank badges with glow, smooth transitions
- **Toast notifications** — Slide-in from bottom-right, auto-dismiss
- **Loading states** — Pulsing glow animation

### Responsive Design

- **Desktop** — Full UI as described
- **Mobile** — Stacked layout, larger touch targets

---

## Implementation Steps (Phases)

### Phase 1: Foundation

1. Initialize SvelteKit + Svelte 5 project
2. Set up SQLite + Drizzle ORM + schema
3. Create YouTube API validation route
4. Build homepage layout with YouTube iframe
5. Implement paste detection + overlay form

### Phase 2: Queue Management

1. Build queue ranking engine
2. Implement daily play count tracking
3. Set up WebSocket for real-time sync
4. Create queue display component
5. Implement song auto-advance logic

### Phase 3: Payments

1. Integrate Lemon Squeezy API
2. Create checkout flow
3. Implement webhook handler + signature verification
4. Update queue on payment success
5. Test end-to-end payment flow

### Phase 4: Polish & Deployment

1. Build game-style UI / futuristic styling
2. Add error handling (video unavailability, timeout)
3. Implement rate limiting + abuse prevention
4. Set up database backup strategy
5. Deploy to production (Node.js hosting)

---

## Environment Variables (.env.local)

```
YOUTUBE_API_KEY=your_youtube_data_api_key
LEMONSQUEEZY_API_KEY=your_lemon_squeezy_api_key
LEMONSQUEEZY_WEBHOOK_SECRET=your_webhook_secret
LEMONSQUEEZY_STORE_ID=your_store_id
DATABASE_URL=file:./data/jukebox.db
WS_URL=http://localhost:5173
NODE_ENV=development
```

---

## Dependencies (package.json)

```json
{
  "dependencies": {
    "svelte": "^5.x",
    "sveltekit": "^2.x",
    "drizzle-orm": "^0.x",
    "better-sqlite3": "^9.x",
    "socket.io": "^4.x",
    "axios": "^1.x"
  },
  "devDependencies": {
    "@sveltejs/adapter-node": "^2.x",
    "open-props": "^1.x",
    "typescript": "^5.x",
    "drizzle-kit": "^0.x"
  }
}
```

---

## Success Criteria

- [ ] Users can paste YouTube links and see metadata prefilled
- [ ] One free song per IP per day enforced server-side
- [ ] Tier-based play limits enforced (1/3/7/15 plays/day)
- [ ] Real-time queue updates across all clients via WebSocket
- [ ] Lemon Squeezy payments integrate and grant tiers immediately
- [ ] Videos unavailable gracefully skip to next song
- [ ] Queue auto-advances after each song ends
- [ ] Futuristic UI with neon colors and game-style design
- [ ] No registration required—works anonymously
- [ ] Minimal transaction friction (direct Lemon Squeezy checkout)

---

## Notes & Future Enhancements

- **Admin dashboard** — View queue statistics, top songs, payment history
- **User accounts** (optional) — If monetization scales, add optional accounts for preference tracking
- **YouTube playlist support** — Allow users to submit entire playlists
- **Spotify integration** — Can be added later if needed
- **Mobile app** — Native iOS/Android wrapper using Capacitor
- **Analytics** — Track which songs are most popular, peak queue times
- **Recommendation engine** — Suggest songs based on what's currently playing

---

**Last Updated:** January 28, 2026
**Version:** 1.0 (Planning Complete)
