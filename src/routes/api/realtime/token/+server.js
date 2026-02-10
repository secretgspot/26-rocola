import { json } from '@sveltejs/kit';
import Ably from 'ably';
import { env } from '$env/dynamic/private';

export async function GET({ locals }) {
	const key = env.ABLY_API_KEY || env.ABLY_SUPER_API_KEY;
	if (!key) {
		return json({ error: 'ABLY_API_KEY or ABLY_SUPER_API_KEY not configured' }, { status: 500 });
	}

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
}
