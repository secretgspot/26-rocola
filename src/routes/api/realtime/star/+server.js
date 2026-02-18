import { json } from '@sveltejs/kit';
import { checkRate } from '$lib/server/security.js';
import { broadcast } from '$lib/server/realtime.js';

export async function POST(event) {
	const limited = checkRate(event, 'realtime-star', 160, 60 * 1000, 'ip+session');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	try {
		const body = await event.request.json().catch(() => ({}));
		const x = typeof body?.x === 'number' ? Math.max(0, Math.min(1, body.x)) : 0.82;
		const y = typeof body?.y === 'number' ? Math.max(0, Math.min(1, body.y)) : 0.76;
		const source = body?.source === 'star_button' ? 'star_button' : 'coords';
		const clientId = typeof body?.clientId === 'string' ? body.clientId.slice(0, 80) : 'unknown';
		await broadcast('star_burst', { source, clientId, x, y, count: 1 });
		return json({ ok: true });
	} catch (err) {
		console.error('[Realtime star] failed', err);
		return json({ ok: false, error: 'star_broadcast_failed' }, { status: 500 });
	}
}
