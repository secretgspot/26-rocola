import { getPublicStatus } from '$lib/server/services/status.js';

export async function load() {
	return {
		initial: await getPublicStatus()
	};
}

