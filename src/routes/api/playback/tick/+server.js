import { json } from '@sveltejs/kit';
import { and, eq, gt } from 'drizzle-orm';
import { isAdminRequest, checkRate } from '$lib/server/security.js';
import { isActiveController } from '$lib/server/controller.js';
import { getPlaybackState } from '$lib/server/services/playback.js';
import { advanceQueue } from '$lib/server/services/queue.js';
import { db } from '$lib/server/db/index.js';
import { queue, songs } from '$lib/server/db/schema.js';

export async function POST(event) {
	if (!isAdminRequest(event, { allowDev: false })) {
		return json({ ok: false, error: 'Admin required' }, { status: 403 });
	}
	if (!(await isActiveController(event))) {
		return json({ ok: false, error: 'Controller required' }, { status: 409 });
	}
	const limited = checkRate(event, 'playback-tick', 240, 60 * 1000, 'session');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	const playback = await getPlaybackState();
	if (!playback?.currentQueueId || !playback?.startedAtMs) {
		return json({ ok: true, action: 'noop', reason: 'idle' });
	}

	const rows = await db
		.select({ q: queue, s: songs })
		.from(queue)
		.innerJoin(songs, eq(queue.songId, songs.id))
		.where(
			and(
				eq(queue.id, playback.currentQueueId),
				eq(songs.isAvailable, 1),
				gt(queue.playsRemainingToday, 0)
			)
		)
		.limit(1);

	if (!rows[0]) {
		const advanced = await advanceQueue(playback.currentQueueId);
		return json({ ok: true, action: 'advance', reason: 'invalid_current', result: advanced });
	}

	const durationSec = Number(rows[0].s?.duration || 0);
	if (!durationSec || durationSec <= 0) {
		return json({ ok: true, action: 'noop', reason: 'duration_unknown' });
	}

	const elapsedMs = Date.now() - playback.startedAtMs;
	// Safety guard: never auto-consume a track in its first moments.
	// This prevents accidental early skips from transient timing mismatches.
	if (elapsedMs < 1800) {
		return json({ ok: true, action: 'noop', reason: 'startup_guard' });
	}
	if (elapsedMs >= durationSec * 1000 + 120) {
		const advanced = await advanceQueue(playback.currentQueueId);
		return json({ ok: true, action: 'advance', reason: 'elapsed', result: advanced });
	}

	return json({ ok: true, action: 'noop', reason: 'in_progress' });
}
