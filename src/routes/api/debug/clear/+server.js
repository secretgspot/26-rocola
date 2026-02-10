import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { db } from '$lib/server/db/index.js';
import { queue, queuePlays, songs, playbackState } from '$lib/server/db/schema.js';
import { invalidateQueueCache } from '$lib/server/services/queue.js';

export async function POST({ locals }) {
	if (env.NODE_ENV !== 'development' && !locals?.isAdmin) {
		return json({ ok: false, error: 'Not allowed in production' }, { status: 403 });
	}

	try {
		await db.delete(queuePlays);
		await db.delete(queue);
		await db.delete(songs);
		await db.delete(playbackState);
		invalidateQueueCache();

		return json({ ok: true });
	} catch (err) {
		console.error('Clear seed error', err);
		return json({ ok: false, error: err?.message || String(err) }, { status: 500 });
	}
}
