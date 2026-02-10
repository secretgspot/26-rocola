import Ably from 'ably';
import { env } from '$env/dynamic/private';

const CHANNEL_NAME = 'rocola';

let ablyRest = null;

function getAblyRest() {
	if (ablyRest) return ablyRest;
	const key = env.ABLY_API_KEY || env.ABLY_SUPER_API_KEY;
	if (!key) {
		throw new Error('ABLY_API_KEY or ABLY_SUPER_API_KEY is not set');
	}
	ablyRest = new Ably.Rest(key);
	return ablyRest;
}

/**
 * Broadcast an event to all connected clients via Ably.
 * @param {string} event
 * @param {any} payload
 */
export async function broadcast(event, payload) {
	const ably = getAblyRest();
	const channel = ably.channels.get(CHANNEL_NAME);
	await channel.publish(event, payload);
}
