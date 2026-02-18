import { db } from '$lib/server/db/index.js';
import { playbackState } from '$lib/server/db/schema.js';
import { broadcast } from '$lib/server/realtime.js';
import { eq } from 'drizzle-orm';

const PLAYBACK_ROW_ID = 'global';

/**
 * @returns {Promise<{currentQueueId: string | null, startedAt: number | null, startedAtMs: number | null, eventSeq: number}>}
 */
export async function getPlaybackState() {
	let rows = [];
	try {
		rows = await db
			.select()
			.from(playbackState)
			.where(eq(playbackState.id, PLAYBACK_ROW_ID))
			.limit(1);
	} catch (err) {
		console.warn('[Playback] getPlaybackState failed, defaulting to null', err?.message || err);
		return { currentQueueId: null, startedAt: null, startedAtMs: null, eventSeq: 0 };
	}

	if (!rows[0]) {
		return { currentQueueId: null, startedAt: null, startedAtMs: null, eventSeq: 0 };
	}
	const startedAtSec = rows[0].startedAt ?? null;
	const startedAtMs =
		rows[0].startedAtMs ?? (typeof startedAtSec === 'number' ? startedAtSec * 1000 : null);

	return {
		currentQueueId: rows[0].currentQueueId ?? null,
		startedAt: startedAtSec,
		startedAtMs,
		eventSeq: Number(rows[0].eventSeq || 0)
	};
}

/**
 * @param {{currentQueueId: string | null, startedAt?: number | null, startedAtMs?: number | null, songId?: string, song?: any}} state
 */
export async function setPlaybackState(state) {
	const current = await getPlaybackState();
	const nextSeq = current.eventSeq + 1;
	const normalizedStartedAtMs =
		typeof state.startedAtMs === 'number'
			? state.startedAtMs
			: typeof state.startedAt === 'number'
				? state.startedAt * 1000
				: null;
	const payload = {
		id: PLAYBACK_ROW_ID,
		currentQueueId: state.currentQueueId ?? null,
		startedAt:
			typeof normalizedStartedAtMs === 'number' ? Math.floor(normalizedStartedAtMs / 1000) : null,
		startedAtMs: normalizedStartedAtMs,
		eventSeq: nextSeq
	};

	try {
		await db
			.insert(playbackState)
			.values(payload)
			.onConflictDoUpdate({ target: playbackState.id, set: payload });
	} catch (err) {
		console.warn('[Playback] setPlaybackState failed, skipping persist', err?.message || err);
		return;
	}

	if (state.currentQueueId && normalizedStartedAtMs) {
		await broadcast('song_playing', {
			queueId: state.currentQueueId,
			songId: state.songId,
			startedAt: payload.startedAt,
			startedAtMs: normalizedStartedAtMs,
			seq: nextSeq,
			song: state.song ?? null,
			serverNowMs: Date.now()
		});
	}
}
