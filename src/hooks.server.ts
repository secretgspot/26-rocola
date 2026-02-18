import { dev } from '$app/environment';

/** @type {import('@sveltejs/kit').Handle} */
export async function handle({ event, resolve }) {
	// IP Tracking
	let clientIp = '127.0.0.1';
	try {
		clientIp = event.getClientAddress() || '127.0.0.1';
	} catch {
		// Some dev/internal requests in Vite may not provide a resolvable client address.
		clientIp = '127.0.0.1';
	}
	event.locals.clientIp = clientIp;
	event.locals.userAgent = event.request.headers.get('user-agent') || 'unknown';

	// Session management (Simple anonymous sessions)
	let sessionId = event.cookies.get('session_id');
	if (!sessionId) {
		sessionId = crypto.randomUUID();
		event.cookies.set('session_id', sessionId, {
			path: '/',
			httpOnly: true,
			secure: !dev,
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365 // 1 year
		});
	}
	event.locals.sessionId = sessionId;
	
	// Admin mode (dev always enabled)
	const adminCookie = event.cookies.get('admin_mode');
	event.locals.isAdmin = dev || adminCookie === '1';

	const response = await resolve(event);
	return response;
}
