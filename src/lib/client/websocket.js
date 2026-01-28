/**
 * Lightweight client-side WebSocket helper.
 * Usage:
 * const ws = connectWebSocket();
 * ws.on('queue_changed', (payload) => { ... });
 *
 * @returns {{ on: (event:string, handler:Function)=>void, close:()=>void }}
 */
export function connectWebSocket() {
	// Use same-origin websocket path (proxied by dev server)
	const proto = location.protocol === 'https:' ? 'wss' : 'ws';
	const url = `${proto}://${location.host}/ws`;
	let socket = null;
	const handlers = new Map();
	let attempts = 0;

	function connect() {
		socket = new WebSocket(url);
		socket.addEventListener('open', () => {
			console.info('WS connected');
			attempts = 0;
		});
		socket.addEventListener('message', (ev) => {
			try {
				const { event, payload } = JSON.parse(ev.data);
				const fn = handlers.get(event);
				if (fn) fn(payload);
			} catch (e) {
				console.debug('WS message parse error', e);
			}
		});
		socket.addEventListener('close', () => {
			console.info('WS disconnected');
			// reconnect with backoff
			setTimeout(() => {
				attempts++;
				connect();
			}, Math.min(30000, 1000 * Math.pow(1.5, attempts)));
		});
	}

	connect();

	return {
		on(event, handler) {
			handlers.set(event, handler);
		},
		close() {
			socket && socket.close();
		}
	};
}
