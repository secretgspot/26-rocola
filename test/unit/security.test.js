import { describe, it, expect, vi } from 'vitest';

vi.mock('$app/environment', () => ({
	dev: false
}));

import { checkRate, isAdminRequest } from '$lib/server/security.js';

function makeEvent(overrides = {}) {
	return {
		locals: {
			clientIp: '127.0.0.1',
			sessionId: 'session-a',
			isAdmin: false,
			...overrides.locals
		},
		cookies: {
			get: () => null,
			...overrides.cookies
		},
		getClientAddress: () => '127.0.0.1',
		...overrides
	};
}

describe('security rate limiting', () => {
	it('allows until limit and then blocks with 429 payload', () => {
		const event = makeEvent({
			locals: { clientIp: '10.0.0.1', sessionId: 'sess-1' }
		});
		const key = `unit-limit-${Date.now()}`;

		const first = checkRate(event, key, 2, 60_000, 'ip+session');
		const second = checkRate(event, key, 2, 60_000, 'ip+session');
		const third = checkRate(event, key, 2, 60_000, 'ip+session');

		expect(first.ok).toBe(true);
		expect(second.ok).toBe(true);
		expect(third.ok).toBe(false);
		if (!third.ok) {
			expect(third.status).toBe(429);
			expect(third.body.ok).toBe(false);
			expect(third.body.error).toBe('Rate limit exceeded');
			expect(third.body.retryAfter).toBeGreaterThan(0);
		}
	});

	it('separates buckets by session when using ip+session scope', () => {
		const key = `unit-scope-${Date.now()}`;
		const a = makeEvent({ locals: { clientIp: '10.0.0.2', sessionId: 'sess-a' } });
		const b = makeEvent({ locals: { clientIp: '10.0.0.2', sessionId: 'sess-b' } });

		const a1 = checkRate(a, key, 1, 60_000, 'ip+session');
		const a2 = checkRate(a, key, 1, 60_000, 'ip+session');
		const b1 = checkRate(b, key, 1, 60_000, 'ip+session');

		expect(a1.ok).toBe(true);
		expect(a2.ok).toBe(false);
		expect(b1.ok).toBe(true);
	});
});

describe('security admin guard', () => {
	it('returns true when locals.isAdmin is true', () => {
		const event = makeEvent({ locals: { isAdmin: true } });
		expect(isAdminRequest(event, { allowDev: false })).toBe(true);
	});

	it('returns false when locals.isAdmin is false and dev override disabled', () => {
		const event = makeEvent({ locals: { isAdmin: false } });
		expect(isAdminRequest(event, { allowDev: false })).toBe(false);
	});
});
