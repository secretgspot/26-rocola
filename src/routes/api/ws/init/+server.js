import { json } from '@sveltejs/kit';
import { initWebSocketServer } from '$lib/server/ws.js';

/**
 * POST /api/ws/init - force initialize the WebSocket server and return status
 */
export async function POST() {
	try {
		const wss = initWebSocketServer();
		if (!wss) return json({ ok: false, error: 'ws not available or failed to init' }, { status: 500 });
		return json({ ok: true, clients: wss.clients.size });
	} catch (err) {
		console.error('WS init error', err);
		return json({ ok: false, error: 'init failed', details: err?.message || String(err) }, { status: 500 });
	}
}
