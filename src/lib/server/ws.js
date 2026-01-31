/**
 * Simple WebSocket server module using `ws`.
 * Exports utility functions to broadcast events to connected clients.
 *
 * Note: Ensure `ws` is installed (`npm install ws`) and restart the dev server.
 */

import { env } from '$env/dynamic/private';
import { WebSocketServer } from 'ws';

// Guard to avoid multiple servers during HMR in dev
if (!globalThis.__rocola_ws) {
	globalThis.__rocola_ws = { 
		initialized: false,
		playback: {
			currentQueueId: null,
			startedAt: null
		}
	};
}

/**
 * Initialize a WebSocket server (idempotent).
 * @returns {import('ws').Server | null}
 */
export function initWebSocketServer() {
	if (globalThis.__rocola_ws.server) return globalThis.__rocola_ws.server;

	const port = Number(env.WS_PORT || 6789);
	const wss = new WebSocketServer({ port });
	wss.on('connection', (ws) => {
		const count = wss.clients.size;
		console.info(`WS client connected. Total clients: ${count}. State: ${ws.readyState}`);
		
		// Send count to the new client specifically
		ws.send(JSON.stringify({ event: 'client_count', payload: { count } }));

		// Broadcast new client count to everyone (redundant for new client but ensures consistency)
		broadcast('client_count', { count });
		
		// Send current playback state immediately upon connection
		if (globalThis.__rocola_ws.playback.currentQueueId) {
			ws.send(JSON.stringify({
				event: 'sync_playback',
				payload: globalThis.__rocola_ws.playback
			}));
		}

		ws.on('error', (err) => console.error('WS client error:', err));

		ws.on('message', (message) => {
			try {
				const data = JSON.parse(message.toString());
				console.debug('WS message from client:', data);
			} catch (e) {
				console.debug('WS non-json message');
			}
		});
		ws.on('close', () => {
			const count = wss.clients.size;
			console.info(`WS client disconnected. Remaining clients: ${count}`);
			broadcast('client_count', { count });
		});
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

	// Track playback state on broadcast
	if (event === 'song_playing') {
		globalThis.__rocola_ws.playback = {
			currentQueueId: payload.queueId,
			startedAt: payload.startedAt || Math.floor(Date.now() / 1000)
		};
	} else if (event === 'song_ended') {
		globalThis.__rocola_ws.playback = {
			currentQueueId: null,
			startedAt: null
		};
	}

	const msg = JSON.stringify({ event, payload });
	try {
		console.info('Broadcasting event', event, 'to', wss.clients?.size || 0, 'clients');
		for (const client of wss.clients) {
			if (client.readyState === 1) {
				client.send(msg);
			}
		}
	} catch (err) {
		console.error('Error broadcasting to clients', err);
	}
}

/**
 * Get current playback state
 */
export function getPlaybackState() {
	return globalThis.__rocola_ws.playback;
}