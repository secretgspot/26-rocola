import { json } from '@sveltejs/kit';
import { initWebSocketServer } from '$lib/server/ws.js';

export async function GET() {
	try {
		const wss = initWebSocketServer();
		if (!wss) return json({ ok: false, error: 'ws not available' }, { status: 500 });
		const clients = [...wss.clients].map((c, i) => ({ id: i, readyState: c.readyState }));
		return json({ ok: true, clients });
	} catch (err) {
		console.error('WS clients error', err);
		return json({ ok: false, error: 'failed', details: err?.message || String(err) }, { status: 500 });
	}
}
