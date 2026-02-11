import Ably from 'ably';

const CHANNEL_NAME = 'rocola';

/**
 * Ably-based realtime helper.
 * @returns {{ on: (event:string, handler:Function)=>void, close:()=>void }}
 */
export function connectRealtime() {
	const handlers = new Map();
	const client = new Ably.Realtime({
		authUrl: '/api/realtime/token'
	});
	const channel = client.channels.get(CHANNEL_NAME);
	let presenceReady = false;

	channel.subscribe((message) => {
		const fn = handlers.get(message.name);
		if (fn) fn(message.data);
	});

	channel.presence.subscribe((presence) => {
		const fn = handlers.get('presence');
		if (fn) fn(presence);
		if (presenceReady) {
			channel.presence.get((err, members) => {
				if (err) return;
				const countFn = handlers.get('presence_count');
				if (countFn) countFn(members.length);
			});
		}
	});

	client.connection.on('connected', () => {
		channel.presence.enter();
		channel.presence.get((err, members) => {
			if (err) return;
			presenceReady = true;
			const fn = handlers.get('presence_count');
			if (fn) fn(members.length);
		});
	});

	const connectionHandler = (state) => {
		const fn = handlers.get('connection_state');
		if (fn) fn(state);
	};

	client.connection.on('connecting', () => connectionHandler('connecting'));
	client.connection.on('connected', () => connectionHandler('connected'));
	client.connection.on('disconnected', () => connectionHandler('disconnected'));
	client.connection.on('suspended', () => connectionHandler('suspended'));
	client.connection.on('failed', () => connectionHandler('failed'));
	client.connection.on('closing', () => connectionHandler('closing'));
	client.connection.on('closed', () => connectionHandler('closed'));

	client.connection.on('failed', (stateChange) => {
		console.warn('[Realtime] connection failed', stateChange.reason);
	});

	return {
		on(event, handler) {
			handlers.set(event, handler);
		},
		close() {
			channel.presence.leave();
			channel.detach();
			client.close();
		}
	};
}
