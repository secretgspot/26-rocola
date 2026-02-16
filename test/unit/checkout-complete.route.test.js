import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('$lib/server/stripe.js', () => ({
	stripe: {
		checkout: {
			sessions: {
				retrieve: vi.fn()
			}
		}
	}
}));

vi.mock('$lib/server/services/queue.js', () => ({
	addToQueue: vi.fn()
}));

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		select: vi.fn(),
		update: vi.fn()
	}
}));

describe('/api/checkout/complete POST', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns 400 when sessionId is missing', async () => {
		const { POST } = await import('../../src/routes/api/checkout/complete/+server.js');
		const req = new Request('http://localhost/api/checkout/complete', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({})
		});

		const response = await POST({ request: req });
		const data = await response.json();

		expect(response.status).toBe(400);
		expect(data.ok).toBe(false);
	});

	it('finalizes pending paid order and returns queueId', async () => {
		const { stripe } = await import('$lib/server/stripe.js');
		const { db } = await import('$lib/server/db/index.js');
		const { addToQueue } = await import('$lib/server/services/queue.js');
		const { POST } = await import('../../src/routes/api/checkout/complete/+server.js');

		stripe.checkout.sessions.retrieve.mockResolvedValue({
			id: 'cs_test_123',
			payment_status: 'paid',
			status: 'complete'
		});

		db.select.mockReturnValue({
			from: () => ({
				where: () => ({
					limit: async () => [
						{
							status: 'pending',
							tier: 'silver',
							ipAddress: '127.0.0.1',
							metadata: JSON.stringify({ videoId: 'abc123', title: 'Song' })
						}
					]
				})
			})
		});

		addToQueue.mockResolvedValue({ id: 'queue_1' });
		db.update.mockReturnValue({
			set: () => ({
				where: async () => {}
			})
		});

		const req = new Request('http://localhost/api/checkout/complete', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ sessionId: 'cs_test_123' })
		});

		const response = await POST({ request: req });
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.ok).toBe(true);
		expect(data.queueId).toBe('queue_1');
		expect(addToQueue).toHaveBeenCalledWith(
			expect.objectContaining({ videoId: 'abc123' }),
			'silver',
			'127.0.0.1'
		);
	});
});

