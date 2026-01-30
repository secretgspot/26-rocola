import { json } from '@sveltejs/kit';
import { getQueue, addToQueue } from '$lib/server/services/queue.js';


export async function GET() {
	try {
		const { queue, currentTurn } = await getQueue();
		return json({ ok: true, queue, currentTurn });
	} catch (err) {
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}

export async function POST({ request, locals }) {
	const payload = await request.json();
	const { videoId, metadata, tier = 'free' } = payload;
	if (!videoId) return json({ ok: false, error: 'videoId required' }, { status: 400 });

	try {
		const result = await addToQueue({ videoId, ...metadata }, tier, locals.clientIp || 'anon');
		return json({ ok: true, id: result.id });
	} catch (err) {
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}

