import { db } from '$lib/server/db/index.js';
import { queue, songs, queuePlays } from '$lib/server/db/schema.js';
import { broadcast, getPlaybackState } from '$lib/server/ws.js';
import { eq, sql } from 'drizzle-orm';

/**
 * Get total number of songs played to use as a global turn counter.
 * @returns {Promise<number>}
 */
export async function getGlobalTurn() {
	const res = await db.select({ count: sql`count(*)` }).from(queuePlays);
	return Number(res[0]?.count || 0);
}

/**
 * Get the current queue, sorted by fair-share priority.
 * 
 * New Sort Logic (Gap Enforcement):
 * 1. Calculate EffectiveTurn = max(GlobalTurn, lastPlayedTurn + Gap)
 * 2. Sort by EffectiveTurn ASC
 * 3. Sort by Tier Priority DESC (Platinum > Gold > Silver > Free)
 * 4. Sort by baseRank ASC (Submission Time)
 * 
 * Gaps:
 * - Platinum: 2 (Can play every 2nd turn)
 * - Gold: 3 (Can play every 3rd turn)
 * - Silver: 5 (Can play every 5th turn)
 * - Free: 0 (Usually only plays once, so gap doesn't matter)
 * 
 * @returns {Promise<Array>} The sorted queue with song details
 */
export async function getQueue() {
	const currentTurn = await getGlobalTurn();

	// Fetch queue and songs separately and combine in JS
	const qRows = await db.select().from(queue).orderBy(queue.baseRank).limit(100);
	const sRows = await db.select().from(songs);
	const sMap = new Map(sRows.map((s) => [s.id, s]));
	
	let rows = qRows.map((q) => ({ ...q, song: sMap.get(q.songId) || null }));
	
	// Filter playable upcoming rows
	rows = rows.filter((r) => r.playsRemainingToday > 0 && r.song && r.song.isAvailable === 1);

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

		// 1. Primary: Effective Turn (who is ready to play soonest)
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
 * @param {object} songData - { videoId, title, thumbnail, channelTitle, metadata }
 * @param {string} tier - 'free' | 'silver' | 'gold' | 'platinum'
 * @param {string} ipAddress - User IP for logging (optional for now)
 */
export async function addToQueue(songData, tier = 'free', ipAddress = 'anon') {
	const { videoId, title, thumbnail, channelTitle, metadata } = songData;

	// Check if song exists or create it
	const allSongs = await db.select().from(songs).limit(1000); 
	let existing = allSongs.find((s) => s.videoId === videoId);
	let song;

	if (existing) {
		song = existing;
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
	
	// Determine daily plays based on tier
	let playsRemainingToday = 1;
	let rankBoost = 0;
	switch (tier) {
		case 'platinum': playsRemainingToday = 15; rankBoost = 20; break;
		case 'gold': playsRemainingToday = 7; rankBoost = 10; break;
		case 'silver': playsRemainingToday = 3; rankBoost = 5; break;
		case 'free': default: playsRemainingToday = 1; rankBoost = 0; break;
	}

	await db.insert(queue).values({
		id: qId,
		songId: song.id,
		tier,
		baseRank,
		rankBoost,
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

	// Check if it should start playing (if queue was empty)
	if (snapshot.length === 1 && snapshot[0].id === qId) {
		broadcast('song_playing', { songId: song.id, queueId: qId, startedAt: Math.floor(Date.now() / 1000) });
	}

	return { id: qId, song };
}

/**
 * Advance the queue to the next song.
 * @param {string|null} fromQueueId - Optional ID of the song currently playing/ending
 */
export async function advanceQueue(fromQueueId = null) {
	const rows = await getQueue();

	if (rows.length === 0) {
		return { ok: false, error: 'No available songs' };
	}

	const current = rows[0];

	// Guard: if client specified a song to skip from, but it's already advanced
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

	// Decrement plays and update lastPlayedTurn
	const newPlays = Math.max(0, current.playsRemainingToday - 1);
	await db.update(queue).set({ 
		playsRemainingToday: newPlays, 
		lastPlayedTurn: nextTurn,
		updatedAt: now 
	}).where(eq(queue.id, current.id));

	// Update total plays
	const totalPlays = (current.song.totalPlays || 0) + 1;
	await db.update(songs).set({ totalPlays }).where(eq(songs.id, current.song.id));

	// Log play
	await db.insert(queuePlays).values({
		id: crypto.randomUUID(),
		queueId: current.id,
		tier: current.tier,
		playedAt: now
	});

	// Broadcast
	broadcast('song_ended', { songId: current.songId, queueId: current.id, playedAt: now });
	
	// Get fresh queue
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