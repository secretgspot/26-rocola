import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/services/queue.js', () => ({
	advanceQueue: vi.fn()
}));

vi.mock('$lib/server/security.js', () => ({
	checkRate: vi.fn(),
	isAdminRequest: vi.fn()
}));

vi.mock('$lib/server/controller.js', () => ({
	isActiveController: vi.fn()
}));

describe('/api/queue/next POST', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns ok:true with next:null when queue has no available songs', async () => {
		const { checkRate } = await import('$lib/server/security.js');
		const { isAdminRequest } = await import('$lib/server/security.js');
		const { isActiveController } = await import('$lib/server/controller.js');
		const { advanceQueue } = await import('$lib/server/services/queue.js');
		const { POST } = await import('../../src/routes/api/queue/next/+server.js');

		isAdminRequest.mockReturnValue(true);
		isActiveController.mockReturnValue(true);
		checkRate.mockReturnValue({ ok: true });
		advanceQueue.mockResolvedValue({ ok: false, error: 'No available songs' });

		const req = new Request('http://localhost/api/queue/next', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ fromQueueId: 'q1' })
		});
		const response = await POST({ request: req, locals: {}, cookies: {}, getClientAddress: () => '127.0.0.1' });
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.ok).toBe(true);
		expect(data.next).toBeNull();
		expect(data.message).toBe('Queue exhausted');
	});

	it('returns 429 when rate limit check fails', async () => {
		const { checkRate } = await import('$lib/server/security.js');
		const { isAdminRequest } = await import('$lib/server/security.js');
		const { isActiveController } = await import('$lib/server/controller.js');
		const { POST } = await import('../../src/routes/api/queue/next/+server.js');

		isAdminRequest.mockReturnValue(true);
		isActiveController.mockReturnValue(true);
		checkRate.mockReturnValue({
			ok: false,
			status: 429,
			body: { ok: false, error: 'Rate limit exceeded', retryAfter: 10 }
		});

		const req = new Request('http://localhost/api/queue/next', { method: 'POST' });
		const response = await POST({ request: req, locals: {}, cookies: {}, getClientAddress: () => '127.0.0.1' });
		const data = await response.json();

		expect(response.status).toBe(429);
		expect(data.ok).toBe(false);
		expect(data.error).toBe('Rate limit exceeded');
	});

	it('returns 403 when requester is not admin', async () => {
		const { isAdminRequest } = await import('$lib/server/security.js');
		const { POST } = await import('../../src/routes/api/queue/next/+server.js');

		isAdminRequest.mockReturnValue(false);

		const req = new Request('http://localhost/api/queue/next', { method: 'POST' });
		const response = await POST({ request: req, locals: {}, cookies: {}, getClientAddress: () => '127.0.0.1' });
		const data = await response.json();

		expect(response.status).toBe(403);
		expect(data.ok).toBe(false);
		expect(data.error).toMatch(/admin/i);
	});

	it('returns 409 when admin is not active controller', async () => {
		const { isAdminRequest } = await import('$lib/server/security.js');
		const { isActiveController } = await import('$lib/server/controller.js');
		const { POST } = await import('../../src/routes/api/queue/next/+server.js');

		isAdminRequest.mockReturnValue(true);
		isActiveController.mockReturnValue(false);

		const req = new Request('http://localhost/api/queue/next', { method: 'POST' });
		const response = await POST({ request: req, locals: {}, cookies: {}, getClientAddress: () => '127.0.0.1' });
		const data = await response.json();

		expect(response.status).toBe(409);
		expect(data.ok).toBe(false);
		expect(data.error).toMatch(/controller/i);
	});
});
