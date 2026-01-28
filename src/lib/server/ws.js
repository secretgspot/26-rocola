/**
 * Simple WebSocket server module using `ws`.
 * Exports utility functions to broadcast events to connected clients.
 *
 * Note: Ensure `ws` is installed (`npm install ws`) and restart the dev server.
 */

import { env } from '$env/dynamic/private';

// Guard to avoid multiple servers during HMR in dev
if (!globalThis.__rocola_ws) {
	globalThis.__rocola_ws = { initialized: false };
}

let WebSocketServer = null;
// Attempt dynamic import asynchronously so missing package doesn't crash import
(async () => {
	try {
		const wsMod = await import('ws');
		WebSocketServer = wsMod.WebSocketServer;
		// call init after we have the WS constructor
		try {
			initWebSocketServer();
		} catch (e) {
			console.warn('auto init failed', e?.message || e);
		}
	} catch (err) {
		console.error('`ws` package is not installed. Please run `npm install ws` to enable WebSocket features.');
	}
})();

/**
 * Initialize a WebSocket server (idempotent).
 * @returns {import('ws').Server | null}
 */
export function initWebSocketServer() {
	if (!WebSocketServer) return null;
	if (globalThis.__rocola_ws.server) return globalThis.__rocola_ws.server;

	const port = Number(env.WS_PORT || 6789);
	const wss = new WebSocketServer({ port });
	wss.on('connection', (ws) => {
		console.info('WS client connected');
		ws.on('message', (message) => {
			try {
				const data = JSON.parse(message.toString());
				// Echo or handle control messages later
				console.debug('WS message from client:', data);
			} catch (e) {
				console.debug('WS non-json message');
			}
		});
		ws.on('close', () => console.info('WS client disconnected'));
	});

	globalThis.__rocola_ws.server = wss;
	console.info(`WebSocket server listening on ws://localhost:${port}`);
	return wss;
}

/**
 * Broadcast a JSON message to all connected clients.
 * @param {string} event
 * @param {any} payload
 */
export function broadcast(event, payload) {
	const wss = globalThis.__rocola_ws.server;
	if (!wss) {
		console.warn('WebSocket server not initialized. Skipping broadcast.');
		return;
	}
	const msg = JSON.stringify({ event, payload });
	try {
		console.info('Broadcasting event', event, 'to', wss.clients?.size || 0, 'clients');
		for (const client of wss.clients) {
			console.debug('client state', client.readyState);
			if (client.readyState === 1) {
				client.send(msg);
			}
		}
	} catch (err) {
		console.error('Error broadcasting to clients', err);
	}
}

// Best-effort auto-init when module is imported (will be a no-op if ws missing)
try {
	initWebSocketServer();
} catch (err) {
	// ignore - init handles missing ws
}
