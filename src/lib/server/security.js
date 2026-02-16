import { dev } from '$app/environment';

const rateBuckets = new Map();

function nowMs() {
	return Date.now();
}

/**
 * @param {string | null | undefined} value
 */
function normalizeKeyPart(value) {
	return String(value || 'unknown').trim().toLowerCase();
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export function getClientFingerprint(event) {
	const ip = normalizeKeyPart(event.locals.clientIp || event.getClientAddress?.() || 'unknown');
	const session = normalizeKeyPart(event.locals.sessionId || event.cookies.get('session_id') || 'anon');
	return { ip, session };
}

/**
 * In-memory fixed-window rate limiter.
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {{ key: string, limit: number, windowMs: number, scope?: 'ip' | 'session' | 'ip+session' }} options
 */
export function applyRateLimit(event, options) {
	const { key, limit, windowMs, scope = 'ip+session' } = options;
	const { ip, session } = getClientFingerprint(event);

	let scopeKey = ip;
	if (scope === 'session') scopeKey = session;
	if (scope === 'ip+session') scopeKey = `${ip}:${session}`;

	const bucketKey = `${key}:${scopeKey}`;
	const currentTs = nowMs();
	const bucket = rateBuckets.get(bucketKey);

	if (!bucket || currentTs >= bucket.resetAt) {
		const fresh = {
			count: 1,
			resetAt: currentTs + windowMs
		};
		rateBuckets.set(bucketKey, fresh);
		return {
			allowed: true,
			remaining: limit - 1,
			retryAfterMs: windowMs
		};
	}

	if (bucket.count >= limit) {
		return {
			allowed: false,
			remaining: 0,
			retryAfterMs: Math.max(0, bucket.resetAt - currentTs)
		};
	}

	bucket.count += 1;
	return {
		allowed: true,
		remaining: Math.max(0, limit - bucket.count),
		retryAfterMs: Math.max(0, bucket.resetAt - currentTs)
	};
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {{ allowDev?: boolean }} [opts]
 */
export function isAdminRequest(event, opts = {}) {
	const { allowDev = true } = opts;
	if (allowDev && dev) return true;
	return event.locals?.isAdmin === true;
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 * @param {string} key
 * @param {number} limit
 * @param {number} windowMs
 * @param {'ip' | 'session' | 'ip+session'} [scope]
 */
export function checkRate(event, key, limit, windowMs, scope = 'ip+session') {
	const result = applyRateLimit(event, { key, limit, windowMs, scope });
	if (!result.allowed) {
		const retryAfter = Math.ceil(result.retryAfterMs / 1000);
		return {
			ok: false,
			status: 429,
			body: {
				ok: false,
				error: 'Rate limit exceeded',
				retryAfter
			}
		};
	}
	return { ok: true };
}
