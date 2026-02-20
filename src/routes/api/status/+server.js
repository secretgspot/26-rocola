import { json } from '@sveltejs/kit';
import { getPublicStatus } from '$lib/server/services/status.js';

export async function GET() {
	try {
		const status = await getPublicStatus();
		return json(status);
	} catch (err) {
		return json(
			{ ok: false, error: 'status_unavailable', details: err?.message || String(err) },
			{ status: 500 }
		);
	}
}

