import { json } from '@sveltejs/kit';
import Ably from 'ably';
import { env } from '$env/dynamic/private';
import { checkRate } from '$lib/server/security.js';

export async function GET(event) {
	const limited = checkRate(event, 'realtime-token', 90, 60 * 1000, 'ip+session');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	const { locals } = event;
	const key = env.ABLY_API_KEY || env.ABLY_SUPER_API_KEY;
	if (!key) {
		return json({ error: 'ABLY_API_KEY or ABLY_SUPER_API_KEY not configured' }, { status: 500 });
	}

	try {
		const ably = new Ably.Rest(key);
		const clientId = locals.sessionId || 'anon';
		const tokenRequest = await new Promise((resolve, reject) => {
			ably.auth.createTokenRequest(
				{
					clientId,
					capability: { rocola: ['subscribe', 'presence'] }
				},
				(err, request) => {
					if (err) reject(err);
					else resolve(request);
				}
			);
		});
		return json(tokenRequest);
	} catch (err) {
		console.error('[Realtime] token request failed', err);
		return json({ ok: false, error: 'Failed to create realtime token' }, { status: 500 });
	}
}
