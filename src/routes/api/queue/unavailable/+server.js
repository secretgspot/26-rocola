import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { queue, songs } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { checkRate } from '$lib/server/security.js';
import { invalidateQueueCache, getGlobalTurn, advanceQueue } from '$lib/server/services/queue.js';
import { broadcast } from '$lib/server/realtime.js';
import { getPlaybackState, setPlaybackState } from '$lib/server/services/playback.js';
import { isActiveController } from '$lib/server/controller.js';
import { addPlaybackLog } from '$lib/server/debug/playback-log.js';

export async function POST(event) {
	if (!(await isActiveController(event))) {
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
		const songRows = await db
			.select({ errorCount: songs.errorCount, isAvailable: songs.isAvailable })
			.from(songs)
			.where(eq(songs.id, songId))
			.limit(1);
		const currentErrorCount = Number(songRows[0]?.errorCount || 0);

		// Transient errors are retried a few times before forcing a temporary skip.
		// Only hard restriction codes permanently mark a song unavailable.
		if (reason === 'youtube_playback_error' && errorCode !== null && !restrictionCodes.has(errorCode)) {
			const nextCount = currentErrorCount + 1;
			await db
				.update(songs)
				.set({
					errorCount: nextCount,
					lastErrorCode: errorCode,
					lastErrorAt: Math.floor(Date.now() / 1000)
				})
				.where(eq(songs.id, songId));

			if (nextCount < 3) {
				addPlaybackLog({
					source: 'server',
					event: 'unavailable_retry',
					reason: 'transient_error',
					queueId,
					errorCode,
					sessionId: event.locals?.sessionId || null,
					clientIp: event.locals?.clientIp || null,
					controller: true,
					data: { retriesLeft: 3 - nextCount, nextCount }
				});
				return json({ ok: true, action: 'retry', retriesLeft: 3 - nextCount });
			}

			// Skip this occurrence without permanently blacklisting the song.
			// This avoids transient YouTube/player errors permanently removing valid tracks.
			await advanceQueue(queueId);
			addPlaybackLog({
				source: 'server',
				event: 'unavailable_skip',
				reason: 'transient_threshold',
				queueId,
				errorCode,
				sessionId: event.locals?.sessionId || null,
				clientIp: event.locals?.clientIp || null,
				controller: true
			});
			return json({ ok: true, action: 'skip' });
		}

		await db.update(songs).set({
			isAvailable: 0,
			errorCount: currentErrorCount + 1,
			lastErrorCode: errorCode,
			lastErrorAt: Math.floor(Date.now() / 1000)
		}).where(eq(songs.id, songId));
		// If this was the active item, clear playback so next poll can promote a playable track.
		await setPlaybackState({ currentQueueId: null, startedAtMs: null });
		invalidateQueueCache();
		await broadcast('queue_changed', { currentTurn: await getGlobalTurn() });
		addPlaybackLog({
			source: 'server',
			event: 'unavailable_marked',
			reason: 'restriction_or_manual',
			queueId,
			errorCode,
			sessionId: event.locals?.sessionId || null,
			clientIp: event.locals?.clientIp || null,
			controller: true
		});

		return json({ ok: true, action: 'skip' });
	} catch (err) {
		console.error('[queue/unavailable] failed', err);
		addPlaybackLog({
			source: 'server',
			event: 'unavailable_error',
			reason: 'exception',
			sessionId: event.locals?.sessionId || null,
			clientIp: event.locals?.clientIp || null,
			controller: true,
			data: { message: err?.message || String(err) }
		});
		return json({ ok: false, error: 'mark_unavailable_failed' }, { status: 500 });
	}
}
