import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { queue, songs } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { checkRate } from '$lib/server/security.js';
import { invalidateQueueCache, getGlobalTurn } from '$lib/server/services/queue.js';
import { broadcast } from '$lib/server/realtime.js';
import { getPlaybackState, setPlaybackState } from '$lib/server/services/playback.js';
import { isActiveController } from '$lib/server/controller.js';

export async function POST(event) {
	if (!isActiveController(event)) {
		return json({ ok: false, error: 'Controller required' }, { status: 409 });
	}

	const limited = checkRate(event, 'queue-unavailable', 20, 60 * 1000, 'ip+session');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	try {
		const body = await event.request.json().catch(() => ({}));
		const queueId = typeof body?.queueId === 'string' ? body.queueId : null;
		let songId = typeof body?.songId === 'string' ? body.songId : null;
		const reason = String(body?.reason || '');
		const errorCode = typeof body?.errorCode === 'number' ? body.errorCode : null;
		const restrictionCodes = new Set([100, 101, 150]);
		if (reason === 'youtube_playback_error' && errorCode !== null && !restrictionCodes.has(errorCode)) {
			return json({ ok: true, ignored: true });
		}

		if (!songId && queueId) {
			const q = await db.select({ songId: queue.songId }).from(queue).where(eq(queue.id, queueId)).limit(1);
			songId = q[0]?.songId || null;
		}

		if (!songId) return json({ ok: false, error: 'songId_or_queueId_required' }, { status: 400 });
		const playback = await getPlaybackState();
		// Only allow marking the actively playing queue item unavailable.
		if (!queueId || queueId !== playback?.currentQueueId) {
			return json({ ok: false, error: 'queue_mismatch' }, { status: 409 });
		}

		await db.update(songs).set({ isAvailable: 0 }).where(eq(songs.id, songId));
		// If this was the active item, clear playback so next poll can promote a playable track.
		await setPlaybackState({ currentQueueId: null, startedAtMs: null });
		invalidateQueueCache();
		await broadcast('queue_changed', { currentTurn: await getGlobalTurn() });

		return json({ ok: true });
	} catch (err) {
		console.error('[queue/unavailable] failed', err);
		return json({ ok: false, error: 'mark_unavailable_failed' }, { status: 500 });
	}
}
