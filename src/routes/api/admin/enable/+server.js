import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';
import { checkRate } from '$lib/server/security.js';

const DEFAULT_CODE = 'up up down down left right left right a b';

/**
 * @param {string | null | undefined} code
 */
function normalize(code) {
	return String(code || '')
		.trim()
		.toLowerCase()
		.replace(/\s+/g, ' ');
}

export async function POST(event) {
	if (!dev) {
		const limited = checkRate(event, 'admin-enable', 8, 10 * 60 * 1000, 'ip');
		if (!limited.ok) return json(limited.body, { status: limited.status });
	}

	try {
		const { request, cookies } = event;
		const { code } = await request.json();
		const expected = normalize(env.ADMIN_CODE || DEFAULT_CODE);
		const actual = normalize(code);

		if (actual !== expected) {
			return json({ ok: false, error: 'Invalid code' }, { status: 403 });
		}
		const secureCookie = event.url.protocol === 'https:' && !dev;

		cookies.set('admin_mode', '1', {
			path: '/',
			httpOnly: true,
			secure: secureCookie,
			sameSite: 'lax',
			maxAge: 60 * 60 * 12
		});

		return json({ ok: true });
	} catch (err) {
		return json({ ok: false, error: 'Bad request' }, { status: 400 });
	}
}

export async function DELETE(event) {
	const { cookies, url } = event;
	const secureCookie = url.protocol === 'https:' && !dev;
	cookies.set('admin_mode', '0', {
		path: '/',
		httpOnly: true,
		secure: secureCookie,
		sameSite: 'lax',
		maxAge: 0
	});
	return json({ ok: true });
}
