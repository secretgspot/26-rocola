import { json } from '@sveltejs/kit';
import { getQueue, addToQueue } from '$lib/server/services/queue.js';
import { checkRate } from '$lib/server/security.js';
import { withReadRetry } from '$lib/server/db/retry.js';


export async function GET() {
	try {
		const { queue, currentTurn } = await withReadRetry(() => getQueue());
		return json({ ok: true, queue, currentTurn });
	} catch (err) {
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}

export async function POST(event) {
	const limited = checkRate(event, 'queue-add', 30, 60 * 1000, 'ip+session');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	const { request, locals } = event;
	const payload = await request.json();
	const { videoId, metadata, tier = 'free' } = payload;
	if (!videoId) return json({ ok: false, error: 'videoId required' }, { status: 400 });

	try {
		const result = await addToQueue(
			{ videoId, ...metadata },
			tier,
			locals.clientIp || 'anon',
			{ bypassFreeDailyLimit: Boolean(locals.isAdmin) }
		);
		return json({ ok: true, id: result.id });
	} catch (err) {
		if (err?.code === 'FREE_TIER_DAILY_DUPLICATE') {
			return json({ ok: false, error: err.message }, { status: 409 });
		}
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}

