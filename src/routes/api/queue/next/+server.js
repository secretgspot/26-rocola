import { json } from '@sveltejs/kit';
import { advanceQueue } from '$lib/server/services/queue.js';

/**
 * POST to advance the queue: mark the current song as played and return the next one
 * @returns {Promise<Response>}
 */
export async function POST({ request }) {
	try {
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
			if (result.error === 'No available songs') {
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
