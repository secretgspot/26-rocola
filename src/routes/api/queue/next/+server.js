import { json } from '@sveltejs/kit';
import { advanceQueue } from '$lib/server/services/queue.js';
import { checkRate, isAdminRequest } from '$lib/server/security.js';
import { isActiveController } from '$lib/server/controller.js';

/**
 * POST to advance the queue: mark the current song as played and return the next one
 * @returns {Promise<Response>}
 */
export async function POST(event) {
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
		try {
			const body = await request.json();
			fromQueueId = body.fromQueueId;
		} catch (e) {
			// ignore empty body
		}

		const result = await advanceQueue(fromQueueId);
		
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
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}
