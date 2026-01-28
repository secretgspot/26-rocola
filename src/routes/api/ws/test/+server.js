import { json } from '@sveltejs/kit';
import { broadcast, initWebSocketServer } from '$lib/server/ws.js';

export async function POST() {
	try {
		broadcast('test_event', { hello: 'world', ts: Date.now() });
		const wss = initWebSocketServer();
		const clients = wss ? [...wss.clients].map((c) => c.readyState) : [];
		return json({ ok: true, sentTo: clients.length, states: clients });
	} catch (err) {
		console.error('WS test broadcast failed', err);
		return json({ ok: false, error: err?.message || String(err) }, { status: 500 });
	}
}
