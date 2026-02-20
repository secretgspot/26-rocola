import { json } from '@sveltejs/kit';
import { advanceQueue } from '$lib/server/services/queue.js';
import { checkRate, isAdminRequest } from '$lib/server/security.js';
import { isActiveController } from '$lib/server/controller.js';
import { addPlaybackLog } from '$lib/server/debug/playback-log.js';

/**
 * POST to advance the queue: mark the current song as played and return the next one
 * @returns {Promise<Response>}
 */
export async function POST(event) {
	const startedAt = Date.now();
	if (!isAdminRequest(event, { allowDev: false })) {
		return json({ ok: false, error: 'Admin required' }, { status: 403 });
	}
	if (!(await isActiveController(event))) {
		return json({ ok: false, error: 'Controller required' }, { status: 409 });
	}

	const limited = checkRate(event, 'queue-next', 60, 60 * 1000, 'ip+session');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	try {
		const { request } = event;
		let fromQueueId = null;
		let reason = null;
		try {
			const body = await request.json();
			fromQueueId = body.fromQueueId;
			reason = typeof body.reason === 'string' ? body.reason : null;
		} catch (e) {
			// ignore empty body
		}

		const result = await advanceQueue(fromQueueId);
		const resultAny = /** @type {any} */ (result);
		addPlaybackLog({
			source: 'server',
			event: 'queue_next',
			reason: reason || 'direct',
			queueId: fromQueueId || null,
			sessionId: event.locals?.sessionId || null,
			clientIp: event.locals?.clientIp || null,
			controller: true,
			data: {
				ok: result.ok,
				message: result.message || null,
				nextQueueId: resultAny?.next?.queueId || resultAny?.next?.id || null,
				playedQueueId: resultAny?.played?.queueId || null,
				reconciled: false,
				latencyMs: Date.now() - startedAt
			}
		});
		
		if (!result.ok) {
			// Treat empty queue as a successful "no next" response
			if ('error' in result && result.error === 'No available songs') {
				return json({ ok: true, next: null, message: 'Queue exhausted' });
			}
			return json(result, { status: 400 });
		}

		return json(result);

	} catch (err) {
		console.error(err);
		addPlaybackLog({
			source: 'server',
			event: 'queue_next_error',
			reason: 'exception',
			sessionId: event.locals?.sessionId || null,
			clientIp: event.locals?.clientIp || null,
			controller: true,
			data: { message: err?.message || String(err) }
		});
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}
