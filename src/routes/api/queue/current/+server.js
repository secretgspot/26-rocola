import { json } from '@sveltejs/kit';
import { getQueue } from '$lib/server/services/queue.js';
import { getPlaybackState, setPlaybackState } from '$lib/server/services/playback.js';
import { db } from '$lib/server/db/index.js';
import { withReadRetry } from '$lib/server/db/retry.js';
import { queue, songs } from '$lib/server/db/schema.js';
import { and, eq, gt } from 'drizzle-orm';
import { isActiveController } from '$lib/server/controller.js';

export async function GET(event) {
	try {
		let playback = await withReadRetry(() => getPlaybackState());

		if (playback?.currentQueueId) {
			const rows = await withReadRetry(() =>
				db
					.select({ queue: queue, song: songs })
					.from(queue)
					.innerJoin(songs, eq(queue.songId, songs.id))
					.where(
						and(
							eq(queue.id, playback.currentQueueId),
							eq(songs.isAvailable, 1),
							gt(queue.playsRemainingToday, 0)
						)
					)
					.limit(1)
			);

			if (rows[0]) {
				const top = rows[0].queue;
				const current = {
					...rows[0].song,
					...top,
					queueId: top.id,
					songId: rows[0].song.id,
					startedAt: playback.startedAt,
					startedAtMs: playback.startedAtMs
				};
				return json({ ok: true, current, serverNowMs: Date.now() });
			}
		}

		const { queue: rows } = await withReadRetry(() => getQueue());
		if (!rows || rows.length === 0) {
			return json({ ok: true, current: null, serverNowMs: Date.now() });
		}

		const top = rows[0];

		// Recovery write is controller-only to avoid split-brain transitions from passive clients.
		const canRecoverPlayback = await isActiveController(event);
		if (canRecoverPlayback && (!playback.currentQueueId || playback.currentQueueId !== top.id)) {
			const nowMs = Date.now();
			await setPlaybackState({ 
				songId: top.song.id, 
				currentQueueId: top.id, 
				startedAtMs: nowMs
			});
			playback = await withReadRetry(() => getPlaybackState());
		}
		
		const current = { 
			...top.song, 
			...top, 
			queueId: top.id, 
			songId: top.song.id,
			startedAt: playback.currentQueueId === top.id ? playback.startedAt : null,
			startedAtMs: playback.currentQueueId === top.id ? playback.startedAtMs : null
		};
		
		return json({ ok: true, current, serverNowMs: Date.now() });
	} catch (err) {
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}
