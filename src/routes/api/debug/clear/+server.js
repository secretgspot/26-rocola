import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import {
	queue,
	queuePlays,
	songs,
	playbackState,
	orders,
	dailyPlayCounts,
	freeSubmissions,
	controllerLease,
	stationRuntime
} from '$lib/server/db/schema.js';
import { invalidateQueueCache } from '$lib/server/services/queue.js';
import { checkRate, isAdminRequest } from '$lib/server/security.js';

export async function POST(event) {
	if (!isAdminRequest(event)) {
		return json({ ok: false, error: 'Not allowed in production' }, { status: 403 });
	}
	const limited = checkRate(event, 'debug-clear', 6, 60 * 1000, 'ip');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	try {
		// Delete in FK-safe order.
		await db.delete(queuePlays);
		await db.delete(dailyPlayCounts);
		await db.delete(orders);
		await db.delete(freeSubmissions);
		await db.delete(queue);
		await db.delete(songs);
		await db.delete(playbackState);
		await db.delete(controllerLease);
		await db.delete(stationRuntime);
		invalidateQueueCache();

		return json({ ok: true });
	} catch (err) {
		console.error('Clear seed error', err);
		return json({ ok: false, error: err?.message || String(err) }, { status: 500 });
	}
}
