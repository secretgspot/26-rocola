import { json } from '@sveltejs/kit';
import { getQueue, addToQueue } from '$lib/server/services/queue.js';


export async function GET() {
	try {
		const queue = await getQueue();
		return json({ ok: true, queue });
	} catch (err) {
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}

export async function POST({ request }) {
	const payload = await request.json();
	const { videoId, metadata, tier = 'free' } = payload;
	if (!videoId) return json({ ok: false, error: 'videoId required' }, { status: 400 });

	try {
		// Using anon IP for now as we don't have session/request IP extraction setup here yet
		const result = await addToQueue({ videoId, ...metadata }, tier, 'anon');
		return json({ ok: true, id: result.id });
	} catch (err) {
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}

