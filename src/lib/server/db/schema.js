import { bigint, index, integer, pgTable, text, uuid } from 'drizzle-orm/pg-core';

// Songs table
export const songs = pgTable('songs', {
	id: uuid('id').primaryKey(),
	videoId: text('videoId').notNull().unique(),
	title: text('title').notNull(),
	thumbnail: text('thumbnail'),
	duration: integer('duration'),
	channelTitle: text('channelTitle'),
	metadata: text('metadata'),
	submittedBy: text('submittedBy').notNull(),
	createdAt: integer('createdAt').notNull(),
	isAvailable: integer('isAvailable').default(1),
	totalPlays: integer('totalPlays').default(0),
	errorCount: integer('errorCount').default(0),
	lastErrorCode: integer('lastErrorCode'),
	lastErrorAt: integer('lastErrorAt'),
});

// Queue table
export const queue = pgTable('queue', {
	id: uuid('id').primaryKey(),
	songId: uuid('songId').notNull().references(() => songs.id),
	tier: text('tier').notNull(),
	baseRank: bigint('baseRank', { mode: 'number' }).notNull(),
	rankBoost: integer('rankBoost').default(0),
	playsRemainingToday: integer('playsRemainingToday').notNull(),
	lastPlayedTurn: integer('lastPlayedTurn').default(0),
	promotionExpiresAt: integer('promotionExpiresAt'),
	createdAt: integer('createdAt').notNull(),
	updatedAt: integer('updatedAt').notNull(),
}, (table) => ({
	queueOrderIdx: index('queue_order_idx').on(table.baseRank),
	queuePlayableIdx: index('queue_playable_idx').on(table.playsRemainingToday, table.lastPlayedTurn, table.tier),
	queueSongIdx: index('queue_song_idx').on(table.songId)
}));

// Queue plays / analytics
export const queuePlays = pgTable('queue_plays', {
	id: uuid('id').primaryKey(),
	queueId: uuid('queueId').notNull().references(() => queue.id),
	tier: text('tier').notNull(),
	playedAt: integer('playedAt').notNull(),
	skippedAt: integer('skippedAt'),
	watchedDuration: integer('watchedDuration'),
}, (table) => ({
	queuePlaysQueueIdx: index('queue_plays_queue_idx').on(table.queueId),
	queuePlaysPlayedAtIdx: index('queue_plays_played_at_idx').on(table.playedAt)
}));

// Daily play counts
export const dailyPlayCounts = pgTable('daily_play_counts', {
	id: uuid('id').primaryKey(),
	queueId: uuid('queueId').notNull().references(() => queue.id),
	tier: text('tier').notNull(),
	playDate: text('playDate').notNull(),
	playsToday: integer('playsToday').default(0),
	resetAt: integer('resetAt').notNull(),
});

// Free submissions log
export const freeSubmissions = pgTable('free_submissions', {
	id: uuid('id').primaryKey(),
	ipAddress: text('ipAddress').notNull(),
	songId: uuid('songId').references(() => songs.id),
	submissionDate: text('submissionDate').notNull(),
	createdAt: integer('createdAt').notNull(),
}, (table) => ({
	freeSubmissionLookupIdx: index('free_submission_lookup_idx').on(
		table.ipAddress,
		table.songId,
		table.submissionDate
	)
}));

// Orders / payments
export const orders = pgTable('orders', {
	id: uuid('id').primaryKey(),
	stripeSessionId: text('stripeSessionId').notNull().unique(),
	queueId: uuid('queue_id').references(() => queue.id),
	tier: text('tier').notNull(),
	amount: integer('amount').notNull(),
	currency: text('currency').default('USD'),
	status: text('status').notNull(),
	stripeCheckoutUrl: text('stripeCheckoutUrl'),
	metadata: text('metadata'), // Store stringified song metadata
	ipAddress: text('ip_address').notNull(),
	createdAt: integer('created_at').notNull(),
	completedAt: integer('completed_at')
});

// Sessions / anonymous users
export const sessions = pgTable('sessions', {
	id: uuid('id').primaryKey(),
	ipAddress: text('ipAddress').notNull(),
	userAgent: text('userAgent'),
	lastActivityAt: integer('lastActivityAt').notNull(),
	createdAt: integer('createdAt').notNull(),
}, (table) => ({
	sessionsLastActivityIdx: index('sessions_last_activity_idx').on(table.lastActivityAt),
	sessionsIpIdx: index('sessions_ip_idx').on(table.ipAddress)
}));

// Playback state (single-row table)
export const playbackState = pgTable('playback_state', {
	id: text('id').primaryKey(), // use a single row id: 'global'
	currentQueueId: uuid('currentQueueId'),
	startedAt: integer('startedAt'),
	startedAtMs: bigint('startedAtMs', { mode: 'number' }),
	eventSeq: bigint('eventSeq', { mode: 'number' }).default(0)
});

// Active admin controller lease (single-row table)
export const controllerLease = pgTable('controller_lease', {
	id: text('id').primaryKey(), // 'global'
	sessionId: text('sessionId'),
	expiresAtMs: bigint('expiresAtMs', { mode: 'number' }).notNull(),
	updatedAtMs: bigint('updatedAtMs', { mode: 'number' }).notNull()
});

// Autonomous station runtime heartbeat (single-row table)
export const stationRuntime = pgTable('station_runtime', {
	id: text('id').primaryKey(), // 'global'
	lastTickAtMs: bigint('lastTickAtMs', { mode: 'number' }).notNull(),
	lastRunStartedAtMs: bigint('lastRunStartedAtMs', { mode: 'number' }),
	lastRunFinishedAtMs: bigint('lastRunFinishedAtMs', { mode: 'number' }),
	lastAdvanceCount: integer('lastAdvanceCount').notNull().default(0),
	lastError: text('lastError'),
	updatedAtMs: bigint('updatedAtMs', { mode: 'number' }).notNull()
});
