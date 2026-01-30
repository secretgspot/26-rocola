import { db } from '$lib/server/db/index.js';
import { queue, songs, queuePlays } from '$lib/server/db/schema.js';
import { broadcast, getPlaybackState } from '$lib/server/ws.js';
import { eq, sql, gt, and } from 'drizzle-orm';

/**
 * Get total number of songs played to use as a global turn counter.
 * @returns {Promise<number>}
 */
export async function getGlobalTurn() {
	const res = await db.select({ count: sql`count(*)` }).from(queue_plays_count_helper());
	return Number(res[0]?.count || 0);
}

// Helper for count query
function queue_plays_count_helper() {
	return queuePlays;
}

/**
 * Get the current queue, sorted by fair-share priority.
 * Uses SQL Joins for efficiency.
 */
export async function getQueue() {
	const currentTurn = await getGlobalTurn();

	// Fetch queue joined with songs
	const results = await db.select({
		queue: queue,
		song: songs
	})
	.from(queue)
	.innerJoin(songs, eq(queue.songId, songs.id))
	.where(
		and(
			gt(queue.playsRemainingToday, 0),
			eq(songs.isAvailable, 1)
		)
	)
	.orderBy(queue.baseRank);
	
	let rows = results.map(r => ({ ...r.queue, song: r.song }));

	// Tiers and Gaps
	const TIER_CONFIG = {
		platinum: { priority: 3, gap: 2 },
		gold: { priority: 2, gap: 3 },
		silver: { priority: 1, gap: 5 },
		free: { priority: 0, gap: 0 }
	};

	// Sort by fair-share logic
	rows.sort((a, b) => {
		const configA = TIER_CONFIG[a.tier] || TIER_CONFIG.free;
		const configB = TIER_CONFIG[b.tier] || TIER_CONFIG.free;

		const nextEligibleA = (a.lastPlayedTurn || 0) + configA.gap;
		const nextEligibleB = (b.lastPlayedTurn || 0) + configB.gap;

		const effectiveTurnA = Math.max(currentTurn, nextEligibleA);
		const effectiveTurnB = Math.max(currentTurn, nextEligibleB);

		// 1. Primary: Effective Turn
		if (effectiveTurnA !== effectiveTurnB) {
			return effectiveTurnA - effectiveTurnB;
		}

		// 2. Secondary: Tier Priority
		if (configA.priority !== configB.priority) {
			return configB.priority - configA.priority;
		}

		// 3. Tertiary: Submission Time
		return a.baseRank - b.baseRank;
	});

	return rows;
}

/**
 * Add a song to the queue.
 * Optimized: specific lookup for videoId instead of fetching all songs.
 */
export async function addToQueue(songData, tier = 'free', ipAddress = 'anon') {
	const { videoId, title, thumbnail, channelTitle, metadata } = songData;

	// Targeted lookup for existing song
	const existingSongs = await db.select().from(songs).where(eq(songs.videoId, videoId)).limit(1);
	let song = existingSongs[0];

	if (song) {
		// Update metadata if provided
		if (title || thumbnail) {
			await db.update(songs).set({
				title: title || song.title,
				thumbnail: thumbnail || song.thumbnail,
				channelTitle: channelTitle || song.channelTitle,
				metadata: JSON.stringify(metadata || {})
			}).where(eq(songs.id, song.id));
			song = { ...song, ...songData };
		}
	} else {
		const id = crypto.randomUUID();
		const now = Math.floor(Date.now() / 1000);
		await db.insert(songs).values({
			id,
			videoId,
			title: title || 'Unknown Title',
			thumbnail: thumbnail || null,
			channelTitle: channelTitle || null,
			metadata: JSON.stringify(metadata || {}),
			submittedBy: ipAddress,
			createdAt: now,
			isAvailable: 1,
			totalPlays: 0
		});
		song = { id, videoId, title, thumbnail, channelTitle };
	}

	// Add to queue
	const qId = crypto.randomUUID();
	const baseRank = Date.now();
	const createdAt = Math.floor(Date.now() / 1000);
	
	let playsRemainingToday = 1;
	switch (tier) {
		case 'platinum': playsRemainingToday = 15; break;
		case 'gold': playsRemainingToday = 7; break;
		case 'silver': playsRemainingToday = 3; break;
		case 'free': default: playsRemainingToday = 1; break;
	}

	await db.insert(queue).values({
		id: qId,
		songId: song.id,
		tier,
		baseRank,
		rankBoost: 0, // rankBoost is currently handled by the gap logic in sorting
		playsRemainingToday,
		lastPlayedTurn: 0,
		promotionExpiresAt: null,
		createdAt,
		updatedAt: createdAt
	});

	// Broadcast updates
	const snapshot = await getQueue();
	broadcast('song_added', { id: qId, songId: song.id, tier, baseRank });
	broadcast('queue_changed', { queue: snapshot });

	if (snapshot.length === 1 && snapshot[0].id === qId) {
		broadcast('song_playing', { songId: song.id, queueId: qId, startedAt: Math.floor(Date.now() / 1000) });
	}

	return { id: qId, song };
}

/**
 * Advance the queue to the next song.
 */
export async function advanceQueue(fromQueueId = null) {
	const rows = await getQueue();

	if (rows.length === 0) {
		return { ok: false, error: 'No available songs' };
	}

	const current = rows[0];

	if (fromQueueId && current.id !== fromQueueId) {
		const playback = getPlaybackState();
		return {
			ok: true,
			message: 'Already advanced',
			next: { ...current.song, ...current, queueId: current.id, songId: current.songId, startedAt: playback.startedAt }
		};
	}

	const now = Math.floor(Date.now() / 1000);
	const currentTurn = await getGlobalTurn();
	const nextTurn = currentTurn + 1;

	await db.update(queue).set({ 
		playsRemainingToday: Math.max(0, current.playsRemainingToday - 1), 
		lastPlayedTurn: nextTurn,
		updatedAt: now 
	}).where(eq(queue.id, current.id));

	await db.update(songs).set({ totalPlays: (current.song.totalPlays || 0) + 1 }).where(eq(songs.id, current.song.id));

	await db.insert(queuePlays).values({
		id: crypto.randomUUID(),
		queueId: current.id,
		tier: current.tier,
		playedAt: now
	});

	broadcast('song_ended', { songId: current.songId, queueId: current.id, playedAt: now });
	
	const afterRows = await getQueue();
	broadcast('queue_changed', { queue: afterRows });

	if (afterRows.length > 0) {
		const next = afterRows[0];
		broadcast('song_playing', { songId: next.song.id, queueId: next.id, startedAt: now });
		return { 
			ok: true, 
			played: { queueId: current.id, songId: current.song.id }, 
			next: { ...next.song, ...next, queueId: next.id, songId: next.song.id, startedAt: now } 
		};
	} else {
		return { ok: true, message: 'Queue exhausted' };
	}
}
