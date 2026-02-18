import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/security.js', () => ({
	checkRate: vi.fn()
}));

const broadcastMock = vi.fn();
vi.mock('$lib/server/realtime.js', () => ({
	broadcast: broadcastMock
}));

describe('/api/realtime/star POST', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('publishes one star burst with normalized payload', async () => {
		const { checkRate } = await import('$lib/server/security.js');
		checkRate.mockReturnValue({ ok: true });
		broadcastMock.mockResolvedValue(undefined);

		const { POST } = await import('../../src/routes/api/realtime/star/+server.js');
		const response = await POST({
			request: new Request('http://localhost/api/realtime/star', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ x: 0.33, y: 0.77, count: 99 })
			}),
			locals: {}
		});
		const data = await response.json();

		expect(response.status).toBe(200);
		expect(data.ok).toBe(true);
		expect(broadcastMock).toHaveBeenCalledWith(
			'star_burst',
			expect.objectContaining({ x: 0.33, y: 0.77, count: 1 })
		);
	});
});

