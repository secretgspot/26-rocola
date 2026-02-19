import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { checkRate } from '$lib/server/security.js';
import { stationTick } from '$lib/server/services/station.js';

function readToken(event) {
	const header = event.request.headers.get('x-station-token');
	if (header) return header.trim();
	const auth = event.request.headers.get('authorization') || '';
	if (auth.toLowerCase().startsWith('bearer ')) return auth.slice(7).trim();
	return '';
}

export async function POST(event) {
	const configured = String(env.STATION_TICK_SECRET || '').trim();
	const provided = readToken(event);

	if (configured) {
		if (!provided || provided !== configured) {
			return json({ ok: false, error: 'Unauthorized' }, { status: 401 });
		}
	} else if (!dev) {
		return json(
			{ ok: false, error: 'STATION_TICK_SECRET is required in production' },
			{ status: 503 }
		);
	}

	const limited = checkRate(event, 'station-tick', 240, 60 * 1000, 'ip');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	try {
		const result = await stationTick({ source: 'api' });
		return json(result);
	} catch (err) {
		console.error('[station/tick] failed', err);
		return json(
			{ ok: false, error: 'Station tick failed', details: err?.message || String(err) },
			{ status: 500 }
		);
	}
}

