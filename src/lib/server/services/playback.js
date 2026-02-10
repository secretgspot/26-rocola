import { db } from '$lib/server/db/index.js';
import { playbackState } from '$lib/server/db/schema.js';
import { broadcast } from '$lib/server/realtime.js';
import { eq } from 'drizzle-orm';

const PLAYBACK_ROW_ID = 'global';

/**
 * @returns {Promise<{currentQueueId: string | null, startedAt: number | null}>}
 */
export async function getPlaybackState() {
	const rows = await db
		.select()
		.from(playbackState)
		.where(eq(playbackState.id, PLAYBACK_ROW_ID))
		.limit(1);

	if (!rows[0]) {
		return { currentQueueId: null, startedAt: null };
	}

	return {
		currentQueueId: rows[0].currentQueueId ?? null,
		startedAt: rows[0].startedAt ?? null
	};
}

/**
 * @param {{currentQueueId: string | null, startedAt: number | null, songId?: string}} state
 */
export async function setPlaybackState(state) {
	const payload = {
		id: PLAYBACK_ROW_ID,
		currentQueueId: state.currentQueueId ?? null,
		startedAt: state.startedAt ?? null
	};

	await db
		.insert(playbackState)
		.values(payload)
		.onConflictDoUpdate({ target: playbackState.id, set: payload });

	if (state.currentQueueId && state.startedAt) {
		await broadcast('song_playing', {
			queueId: state.currentQueueId,
			songId: state.songId,
			startedAt: state.startedAt,
			song: state.song ?? null
		});
	}
}
