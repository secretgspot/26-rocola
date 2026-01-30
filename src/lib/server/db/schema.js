import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// Songs table
export const songs = sqliteTable('songs', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
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
});

// Queue table
export const queue = sqliteTable('queue', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	songId: text('songId').notNull().references(() => songs.id),
	tier: text('tier').notNull(),
	baseRank: integer('baseRank').notNull(),
	rankBoost: integer('rankBoost').default(0),
	playsRemainingToday: integer('playsRemainingToday').notNull(),
	lastPlayedTurn: integer('lastPlayedTurn').default(0),
	promotionExpiresAt: integer('promotionExpiresAt'),
	createdAt: integer('createdAt').notNull(),
	updatedAt: integer('updatedAt').notNull(),
});

// Queue plays / analytics
export const queuePlays = sqliteTable('queue_plays', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	queueId: text('queueId').notNull().references(() => queue.id),
	tier: text('tier').notNull(),
	playedAt: integer('playedAt').notNull(),
	skippedAt: integer('skippedAt'),
	watchedDuration: integer('watchedDuration'),
});

// Daily play counts
export const dailyPlayCounts = sqliteTable('daily_play_counts', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	queueId: text('queueId').notNull().references(() => queue.id),
	tier: text('tier').notNull(),
	playDate: text('playDate').notNull(),
	playsToday: integer('playsToday').default(0),
	resetAt: integer('resetAt').notNull(),
});

// Free submissions log
export const freeSubmissions = sqliteTable('free_submissions', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	ipAddress: text('ipAddress').notNull(),
	songId: text('songId').references(() => songs.id),
	submissionDate: text('submissionDate').notNull(),
	createdAt: integer('createdAt').notNull(),
});

// Orders / payments
export const orders = sqliteTable('orders', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	lemonsqueezyOrderId: text('lemonsqueezyOrderId').notNull().unique(),
	queueId: text('queueId').notNull().references(() => queue.id),
	tier: text('tier').notNull(),
	amount: integer('amount').notNull(),
	currency: text('currency').default('USD'),
	status: text('status').notNull(),
	lemonsqueezyCheckoutUrl: text('lemonsqueezyCheckoutUrl'),
	ipAddress: text('ipAddress').notNull(),
	createdAt: integer('createdAt').notNull(),
	completedAt: integer('completedAt'),
});

// Sessions / anonymous users
export const sessions = sqliteTable('sessions', {
	id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
	ipAddress: text('ipAddress').notNull(),
	userAgent: text('userAgent'),
	lastActivityAt: integer('lastActivityAt').notNull(),
	createdAt: integer('createdAt').notNull(),
});
