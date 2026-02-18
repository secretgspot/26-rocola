import { json } from '@sveltejs/kit';
import { getQueue } from '$lib/server/services/queue.js';
import { getPlaybackState, setPlaybackState } from '$lib/server/services/playback.js';
import { db } from '$lib/server/db/index.js';
import { withReadRetry } from '$lib/server/db/retry.js';
import { queue, songs } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';

export async function GET() {
	try {
		let playback = await withReadRetry(() => getPlaybackState());

		if (playback?.currentQueueId) {
			const rows = await withReadRetry(() =>
				db
					.select({ queue: queue, song: songs })
					.from(queue)
					.innerJoin(songs, eq(queue.songId, songs.id))
					.where(eq(queue.id, playback.currentQueueId))
					.limit(1)
			);

			if (rows[0]) {
				const top = rows[0].queue;
				const current = {
					...rows[0].song,
					...top,
					queueId: top.id,
					songId: rows[0].song.id,
					startedAt: playback.startedAt
				};
				return json({ ok: true, current, serverNowMs: Date.now() });
			}
		}

		const { queue: rows } = await withReadRetry(() => getQueue());
		if (!rows || rows.length === 0) {
			return json({ ok: true, current: null, serverNowMs: Date.now() });
		}

		const top = rows[0];

		// If no song is recorded as playing, or it's a different song than the top of queue
		// we "start" this one now. 
		// Note: this is a bit aggressive but ensures sync for the first person joining an idle system.
		if (!playback.currentQueueId || playback.currentQueueId !== top.id) {
			const now = Math.floor(Date.now() / 1000);
			await setPlaybackState({ 
				songId: top.song.id, 
				currentQueueId: top.id, 
				startedAt: now 
			});
			playback = await withReadRetry(() => getPlaybackState());
		}
		
		const current = { 
			...top.song, 
			...top, 
			queueId: top.id, 
			songId: top.song.id,
			startedAt: playback.startedAt
		};
		
		return json({ ok: true, current, serverNowMs: Date.now() });
	} catch (err) {
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}
