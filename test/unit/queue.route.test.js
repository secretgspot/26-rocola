import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/services/queue.js', () => ({
	getQueue: vi.fn(),
	addToQueue: vi.fn()
}));

vi.mock('$lib/server/security.js', () => ({
	checkRate: vi.fn()
}));

describe('/api/queue POST duplicate rules', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 409 when free-tier duplicate rule is violated', async () => {
		const { checkRate } = await import('$lib/server/security.js');
		const { addToQueue } = await import('$lib/server/services/queue.js');
		const { POST } = await import('../../src/routes/api/queue/+server.js');

		checkRate.mockReturnValue({ ok: true });
		const duplicateErr = new Error(
			'Free tier allows the same song once per day. Use a paid tier to repeat it today.'
		);
		// @ts-ignore custom error code for test
		duplicateErr.code = 'FREE_TIER_DAILY_DUPLICATE';
		addToQueue.mockRejectedValue(duplicateErr);

		const req = new Request('http://localhost/api/queue', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				videoId: 'dQw4w9WgXcQ',
				tier: 'free',
				metadata: { title: 'Rick Astley' }
			})
		});

		const response = await POST({
			request: req,
			locals: { clientIp: '127.0.0.1' },
			cookies: {},
			getClientAddress: () => '127.0.0.1'
		});
		const data = await response.json();

		expect(response.status).toBe(409);
		expect(data.ok).toBe(false);
		expect(data.error).toContain('once per day');
	});

	it('accepts a valid first free-tier submission', async () => {
		const { checkRate } = await import('$lib/server/security.js');
		const { addToQueue } = await import('$lib/server/services/queue.js');
		const { POST } = await import('../../src/routes/api/queue/+server.js');

		checkRate.mockReturnValue({ ok: true });
		addToQueue.mockResolvedValue({ id: 'queue-free-1' });

		const req = new Request('http://localhost/api/queue', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				videoId: 'dQw4w9WgXcQ',
				tier: 'free',
				metadata: { title: 'Rick Astley' }
			})
		});

		const response = await POST({
			request: req,
			locals: { clientIp: '127.0.0.1' },
			cookies: {},
			getClientAddress: () => '127.0.0.1'
		});
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.ok).toBe(true);
		expect(data.id).toBe('queue-free-1');
	});

	it('allows paid tier repeat attempts (service success path)', async () => {
		const { checkRate } = await import('$lib/server/security.js');
		const { addToQueue } = await import('$lib/server/services/queue.js');
		const { POST } = await import('../../src/routes/api/queue/+server.js');

		checkRate.mockReturnValue({ ok: true });
		addToQueue.mockResolvedValue({ id: 'queue-123' });

		const req = new Request('http://localhost/api/queue', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({
				videoId: 'dQw4w9WgXcQ',
				tier: 'gold',
				metadata: { title: 'Rick Astley' }
			})
		});

		const response = await POST({
			request: req,
			locals: { clientIp: '127.0.0.1' },
			cookies: {},
			getClientAddress: () => '127.0.0.1'
		});
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.ok).toBe(true);
		expect(data.id).toBe('queue-123');
		expect(addToQueue).toHaveBeenCalledWith(
			expect.objectContaining({ videoId: 'dQw4w9WgXcQ' }),
			'gold',
			'127.0.0.1',
			{ bypassFreeDailyLimit: false }
		);
	});
});
