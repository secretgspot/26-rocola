import { json } from '@sveltejs/kit';
import { isAdminRequest, checkRate } from '$lib/server/security.js';
import { isActiveController } from '$lib/server/controller.js';
import { getPlaybackState } from '$lib/server/services/playback.js';
import { advanceQueue } from '$lib/server/services/queue.js';
import { addPlaybackLog } from '$lib/server/debug/playback-log.js';
import { db } from '$lib/server/db/index.js';
import { queue, songs } from '$lib/server/db/schema.js';
import { and, eq } from 'drizzle-orm';

export async function POST(event) {
	if (!isAdminRequest(event, { allowDev: false })) {
		return json({ ok: false, error: 'Admin required' }, { status: 403 });
	}
	if (!(await isActiveController(event))) {
		return json({ ok: false, error: 'Controller required' }, { status: 409 });
	}

	const limited = checkRate(event, 'playback-ended', 90, 60 * 1000, 'session');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	const playback = await getPlaybackState();
	if (!playback?.currentQueueId || !playback?.startedAtMs) {
		return json({ ok: true, action: 'noop', reason: 'idle' });
	}

	// Ignore spurious early ended pulses.
	const elapsedMs = Date.now() - playback.startedAtMs;
	if (elapsedMs < 1800) {
		return json({ ok: true, action: 'noop', reason: 'startup_guard' });
	}

	const body = await event.request.json().catch(() => ({}));
	const queueId = typeof body?.queueId === 'string' ? body.queueId : null;
	const videoId = typeof body?.videoId === 'string' ? body.videoId : null;
	if (queueId && queueId !== playback.currentQueueId) {
		addPlaybackLog({
			source: 'server',
			event: 'ended_noop',
			reason: 'stale_ended',
			queueId,
			sessionId: event.locals?.sessionId || null,
			clientIp: event.locals?.clientIp || null,
			controller: true,
			data: { activeQueueId: playback.currentQueueId }
		});
		return json({ ok: true, action: 'noop', reason: 'stale_ended' });
	}
	const activeRows = await db
		.select({ duration: songs.duration, videoId: songs.videoId })
		.from(queue)
		.innerJoin(songs, eq(queue.songId, songs.id))
		.where(and(eq(queue.id, playback.currentQueueId)))
		.limit(1);
	const activeDuration = Number(activeRows[0]?.duration || 0);
	const activeVideoId = activeRows[0]?.videoId || null;
	if (videoId && activeVideoId && videoId !== activeVideoId) {
		addPlaybackLog({
			source: 'server',
			event: 'ended_noop',
			reason: 'video_mismatch',
			queueId: playback.currentQueueId,
			videoId,
			sessionId: event.locals?.sessionId || null,
			clientIp: event.locals?.clientIp || null,
			controller: true,
			data: { activeVideoId }
		});
		return json({ ok: true, action: 'noop', reason: 'video_mismatch' });
	}
	if (activeDuration > 0) {
		const minEndedMs = Math.max(1800, activeDuration * 1000 - 1200);
		if (elapsedMs < minEndedMs) {
			addPlaybackLog({
				source: 'server',
				event: 'ended_noop',
				reason: 'early_ended_guard',
				queueId: playback.currentQueueId,
				videoId: activeVideoId,
				durationSec: activeDuration,
				elapsedSec: elapsedMs / 1000,
				expectedSec: activeDuration,
				sessionId: event.locals?.sessionId || null,
				clientIp: event.locals?.clientIp || null,
				controller: true
			});
			return json({ ok: true, action: 'noop', reason: 'early_ended_guard' });
		}
	}

	const result = await advanceQueue(playback.currentQueueId);
	const resultAny = /** @type {any} */ (result);
	addPlaybackLog({
		source: 'server',
		event: 'ended_advance',
		reason: 'ended_signal',
		queueId: playback.currentQueueId,
		sessionId: event.locals?.sessionId || null,
		clientIp: event.locals?.clientIp || null,
		controller: true,
		data: {
			elapsedSec: elapsedMs / 1000,
			nextQueueId: resultAny?.next?.queueId || resultAny?.next?.id || null,
			reconciled: false
		}
	});
	return json({ ok: true, action: 'advance', result });
}
