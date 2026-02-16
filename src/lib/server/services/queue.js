import { db } from '$lib/server/db/index.js';
import { queue, songs, queuePlays, freeSubmissions } from '$lib/server/db/schema.js';
import { broadcast } from '$lib/server/realtime.js';
import { getPlaybackState, setPlaybackState } from '$lib/server/services/playback.js';
import { eq, sql, gt, and } from 'drizzle-orm';
import { TIER_CONFIG, getTierConfig } from '$lib/config.js';

const MAX_PREMIUM_STREAK = 1;
const QUEUE_CACHE_TTL_MS = 500;
const queueCache = new Map();

export function invalidateQueueCache() {
	queueCache.clear();
}

/**
 * Get total number of songs played to use as a global turn counter.
 * @returns {Promise<number>}
 */
/**
 * @param {any} [dbClient]
 */
export async function getGlobalTurn(dbClient = db) {
	try {
		const res = await dbClient.select({ count: sql`count(*)` }).from(queue_plays_count_helper());
		return Number(res[0]?.count || 0);
	} catch (err) {
		console.warn('[Queue] getGlobalTurn failed, defaulting to 0', err?.message || err);
		return 0;
	}
}

// Helper for count query
function queue_plays_count_helper() {
	return queuePlays;
}

/**
 * Get the current queue, sorted by fair-share priority.
 * Uses SQL Joins for efficiency.
 */
export async function getQueue(options = {}) {
	const {
		pinCurrent = true,
		effectiveBaseTurnOverride = null,
		initialPremiumStreak = 0,
		dbClient = db
	} = options;
	const cacheKey = JSON.stringify({
		pinCurrent,
		effectiveBaseTurnOverride,
		initialPremiumStreak
	});
	const cached = queueCache.get(cacheKey);
	if (cached && Date.now() - cached.ts < QUEUE_CACHE_TTL_MS) {
		return cached.value;
	}

	const currentTurn = await getGlobalTurn(dbClient);
	const playback = await getPlaybackState();
	const currentQueueId = playback?.currentQueueId;

	// Fetch queue joined with songs
	const results = await dbClient.select({
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

	// If a song is currently playing, we want to show the queue as it WILL be
	// when that song finishes (Turn N+1). This ensures B vs C comparisons
	// match what advanceQueue will decide.
	const effectiveBaseTurn =
		effectiveBaseTurnOverride !== null
			? effectiveBaseTurnOverride
			: currentQueueId
				? currentTurn + 1
				: currentTurn;

	const ordered = buildFairOrder({
		rows,
		effectiveBaseTurn,
		currentQueueId,
		pinCurrent,
		initialPremiumStreak
	});

	const value = { queue: ordered, currentTurn };
	queueCache.set(cacheKey, { ts: Date.now(), value });
	return value;
}

function buildFairOrder({
	rows,
	effectiveBaseTurn,
	currentQueueId,
	pinCurrent,
	initialPremiumStreak
}) {
	const pool = rows.map((r) => ({ ...r, _lastPlayedSim: r.lastPlayedTurn || 0 }));
	const result = [];
	let premiumStreak = initialPremiumStreak || 0;
	let turn = effectiveBaseTurn;

	if (pinCurrent && currentQueueId) {
		const idx = pool.findIndex((r) => r.id === currentQueueId);
		if (idx !== -1) {
			const current = pool.splice(idx, 1)[0];
			result.push(current);
			premiumStreak = current.tier !== 'free' ? 1 : 0;
		}
	}

	while (pool.length > 0) {
		const next = selectNext(pool, turn, premiumStreak);
		if (!next) break;
		next._lastPlayedSim = turn;
		result.push(next);
		if (next.tier !== 'free') premiumStreak += 1;
		else premiumStreak = 0;
		turn += 1;
		pool.splice(pool.indexOf(next), 1);
	}

	return result;
}

function selectNext(pool, turn, premiumStreak) {
	let minEffective = Number.POSITIVE_INFINITY;
	for (const item of pool) {
		const config = getTierConfig(item.tier);
		const nextEligible = (item._lastPlayedSim || 0) + config.gap;
		const effectiveTurn = Math.max(turn, nextEligible);
		item._effectiveTurn = effectiveTurn;
		if (effectiveTurn < minEffective) minEffective = effectiveTurn;
	}

	const candidates = pool.filter((r) => r._effectiveTurn === minEffective);
	if (candidates.length === 0) return null;

	if (premiumStreak >= MAX_PREMIUM_STREAK) {
		const freeAny = pool.filter((r) => r.tier === 'free');
		if (freeAny.length > 0) {
			// Force at least one free between premium plays
			return [...freeAny].sort((a, b) => {
				if (a._effectiveTurn !== b._effectiveTurn) return a._effectiveTurn - b._effectiveTurn;
				return (a._lastPlayedSim || 0) - (b._lastPlayedSim || 0);
			})[0];
		}
	}

	return pickByPriority(candidates);
}

function pickByPriority(candidates) {
	return [...candidates].sort((a, b) => {
		const configA = getTierConfig(a.tier);
		const configB = getTierConfig(b.tier);

		if (configA.priority !== configB.priority) {
			return configB.priority - configA.priority;
		}

		if ((a._lastPlayedSim || 0) !== (b._lastPlayedSim || 0)) {
			return (a._lastPlayedSim || 0) - (b._lastPlayedSim || 0);
		}

		return a.baseRank - b.baseRank;
	})[0];
}

function pickByRotation(candidates) {
	return [...candidates].sort((a, b) => {
		if ((a._lastPlayedSim || 0) !== (b._lastPlayedSim || 0)) {
			return (a._lastPlayedSim || 0) - (b._lastPlayedSim || 0);
		}
		return a.baseRank - b.baseRank;
	})[0];
}

/**
 * Helper to parse ISO 8601 duration (PT#M#S) to seconds.
 */
function parseDuration(duration) {
	if (!duration) return 0;
	if (typeof duration === 'number') return duration;
	const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
	if (!match) return 0;
	const hours = (parseInt(match[1]) || 0);
	const minutes = (parseInt(match[2]) || 0);
	const seconds = (parseInt(match[3]) || 0);
	return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Add a song to the queue.
 * Optimized: specific lookup for videoId instead of fetching all songs.
 */
export async function addToQueue(songData, tier = 'free', ipAddress = 'anon') {
	const { videoId, title, thumbnail, channelTitle, metadata } = songData;
	const duration = parseDuration(songData.duration || metadata?.duration);
	const normalizedTier = String(tier || 'free').toLowerCase();
	const todayUtc = new Date().toISOString().slice(0, 10);

	// Targeted lookup for existing song
	const existingSongs = await db.select().from(songs).where(eq(songs.videoId, videoId)).limit(1);
	/** @type {any} */
	let song = existingSongs[0];

	if (song) {
		// Update metadata if provided
		if (title || thumbnail || duration > 0) {
			const updateData = {
				metadata: JSON.stringify(metadata || {})
			};
			if (title) updateData.title = title;
			if (thumbnail) updateData.thumbnail = thumbnail;
			if (channelTitle) updateData.channelTitle = channelTitle;
			if (duration > 0) updateData.duration = duration;

			await db.update(songs).set(updateData).where(eq(songs.id, song.id));
			song = { ...song, ...songData, duration: duration > 0 ? duration : song.duration };
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
			duration,
			submittedBy: ipAddress,
			createdAt: now,
			isAvailable: 1,
			totalPlays: 0
		});
		song = { id, videoId, title, thumbnail, channelTitle, duration };
	}

	// Add to queue
	if (normalizedTier === 'free') {
		const priorFreeSubmissions = await db
			.select({ id: freeSubmissions.id })
			.from(freeSubmissions)
			.where(
				and(
					eq(freeSubmissions.ipAddress, ipAddress),
					eq(freeSubmissions.songId, song.id),
					eq(freeSubmissions.submissionDate, todayUtc)
				)
			)
			.limit(1);

		if (priorFreeSubmissions.length > 0) {
			const err = new Error(
				'Free tier allows the same song once per day. Use a paid tier to repeat it today.'
			);
			// @ts-ignore - custom application error code
			err.code = 'FREE_TIER_DAILY_DUPLICATE';
			throw err;
		}
	}

	const qId = crypto.randomUUID();
	const baseRank = Date.now();
	const createdAt = Math.floor(Date.now() / 1000);
	
	const tierConfig = getTierConfig(normalizedTier);
	const playsRemainingToday = tierConfig.dailyPlays;
	const currentTurn = await getGlobalTurn();
	
	// Initialize lastPlayedTurn such that it's eligible "now" 
	// but at the back of the rotation for its tier.
	const initialLastPlayed = currentTurn - tierConfig.gap;

	await db.insert(queue).values({
		id: qId,
		songId: song.id,
		tier: normalizedTier,
		baseRank,
		rankBoost: 0,
		playsRemainingToday,
		lastPlayedTurn: initialLastPlayed,
		promotionExpiresAt: null,
		createdAt,
		updatedAt: createdAt
	});

	// Broadcast updates
	const { queue: snapshot } = await getQueue();
	await broadcast('song_added', { id: qId, songId: song.id, tier: normalizedTier, baseRank });
	await broadcast('queue_changed', { queue: snapshot, currentTurn });
	invalidateQueueCache();

	if (normalizedTier === 'free') {
		await db.insert(freeSubmissions).values({
			id: crypto.randomUUID(),
			ipAddress,
			songId: song.id,
			submissionDate: todayUtc,
			createdAt
		});
	}

	if (snapshot.length === 1 && snapshot[0].id === qId) {
		await setPlaybackState({
			currentQueueId: qId,
			songId: song.id,
			startedAt: Math.floor(Date.now() / 1000),
			song: { ...song, queueId: qId, songId: song.id, startedAt: Math.floor(Date.now() / 1000) }
		});
	}

	return { id: qId, song };
}

/**
 * Advance the queue to the next song.
 */
export async function advanceQueue(fromQueueId = null) {
	const playback = await getPlaybackState();
	const playingId = playback?.currentQueueId || null;

	const result = await db.transaction(async (tx) => {
		await tx.execute(sql`select pg_advisory_lock(912734)`);
		try {
			const { queue: rows } = await getQueue({ pinCurrent: true, dbClient: tx });

			if (rows.length === 0) {
				return { ok: false, error: 'No available songs' };
			}

			let current = rows[0];
			if (playingId) {
				const found = rows.find((r) => r.id === playingId);
				if (found) current = found;
			}

			if (fromQueueId && playingId && fromQueueId !== playingId) {
				return {
					ok: true,
					message: 'Already advanced',
					next: { ...current.song, ...current, queueId: current.id, songId: current.songId, startedAt: playback.startedAt }
				};
			}

			const now = Math.floor(Date.now() / 1000);
			const prevTurn = await getGlobalTurn(/** @type {any} */ (tx));
			const nextTurn = prevTurn + 1;

			await tx.update(queue).set({ 
				playsRemainingToday: Math.max(0, current.playsRemainingToday - 1), 
				lastPlayedTurn: nextTurn,
				updatedAt: now 
			}).where(eq(queue.id, current.id));

			await tx.update(songs).set({ totalPlays: (current.song.totalPlays || 0) + 1 }).where(eq(songs.id, current.song.id));

			await tx.insert(queuePlays).values({
				id: crypto.randomUUID(),
				queueId: current.id,
				tier: current.tier,
				playedAt: now
			});

			const { queue: afterRows, currentTurn } = await getQueue({
				pinCurrent: false,
				effectiveBaseTurnOverride: nextTurn,
				initialPremiumStreak: current.tier !== 'free' ? 1 : 0,
				dbClient: tx
			});

			return { ok: true, current, afterRows, currentTurn, nextTurn, now };
		} finally {
			await tx.execute(sql`select pg_advisory_unlock(912734)`);
		}
	});

	if (!result.ok) {
		return result;
	}

	if (result.message === 'Already advanced') {
		return result;
	}

	const { current, afterRows, currentTurn, nextTurn, now } = result;

	await broadcast('song_ended', { songId: current.songId, queueId: current.id, playedAt: now });
	await broadcast('queue_changed', { queue: afterRows, currentTurn });
	invalidateQueueCache();

	if (afterRows.length > 0) {
		const next = selectNextAfterCurrent(afterRows, nextTurn, current);
		await setPlaybackState({
			currentQueueId: next.id,
			songId: next.song.id,
			startedAt: now,
			song: { ...next.song, ...next, queueId: next.id, songId: next.song.id, startedAt: now }
		});
		return { 
			ok: true, 
			played: { queueId: current.id, songId: current.song.id }, 
			next: { ...next.song, ...next, queueId: next.id, songId: next.song.id, startedAt: now } 
		};
	} else {
		await setPlaybackState({ currentQueueId: null, startedAt: null });
		return { ok: true, message: 'Queue exhausted' };
	}
}

function selectNextAfterCurrent(rows, turn, current) {
	const pool = rows.filter((r) => r.id !== current.id);
	if (pool.length === 0) return rows[0];

	const hadPremium = current.tier !== 'free';
	for (const item of pool) {
		const config = getTierConfig(item.tier);
		const nextEligible = (item.lastPlayedTurn || 0) + config.gap;
		item._effectiveTurn = Math.max(turn, nextEligible);
	}

	if (hadPremium) {
		const freeAny = pool.filter((r) => r.tier === 'free');
		if (freeAny.length > 0) {
			return [...freeAny].sort((a, b) => {
				if (a._effectiveTurn !== b._effectiveTurn) return a._effectiveTurn - b._effectiveTurn;
				return (a.lastPlayedTurn || 0) - (b.lastPlayedTurn || 0);
			})[0];
		}
	}

	return [...pool].sort((a, b) => {
		if (a._effectiveTurn !== b._effectiveTurn) return a._effectiveTurn - b._effectiveTurn;
		const configA = getTierConfig(a.tier);
		const configB = getTierConfig(b.tier);
		if (configA.priority !== configB.priority) return configB.priority - configA.priority;
		if ((a.lastPlayedTurn || 0) !== (b.lastPlayedTurn || 0)) {
			return (a.lastPlayedTurn || 0) - (b.lastPlayedTurn || 0);
		}
		return a.baseRank - b.baseRank;
	})[0];
}
