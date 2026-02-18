import { beforeEach, describe, expect, it, vi } from 'vitest';

const dbMock = {
	select: vi.fn(),
	insert: vi.fn()
};

vi.mock('$lib/server/db/index.js', () => ({
	db: dbMock
}));

vi.mock('$lib/server/db/schema.js', () => ({
	playbackState: { id: 'id', currentQueueId: 'currentQueueId', startedAt: 'startedAt', startedAtMs: 'startedAtMs' }
}));

const broadcastMock = vi.fn();
vi.mock('$lib/server/realtime.js', () => ({
	broadcast: broadcastMock
}));

describe('playback service', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('falls back to second-based startedAt when startedAtMs is missing', async () => {
		dbMock.select.mockReturnValue({
			from: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue([
				{ id: 'global', currentQueueId: 'q1', startedAt: 123, startedAtMs: null }
			])
		});

		const svc = await import('../../src/lib/server/services/playback.js');
		const state = await svc.getPlaybackState();

		expect(state.currentQueueId).toBe('q1');
		expect(state.startedAt).toBe(123);
		expect(state.startedAtMs).toBe(123000);
	});

	it('persists ms precision and broadcasts startedAtMs', async () => {
		const onConflictDoUpdate = vi.fn().mockResolvedValue(undefined);
		dbMock.insert.mockReturnValue({
			values: vi.fn().mockReturnValue({
				onConflictDoUpdate
			})
		});

		const svc = await import('../../src/lib/server/services/playback.js');
		await svc.setPlaybackState({
			currentQueueId: 'q2',
			songId: 's2',
			startedAtMs: 1700000000123,
			song: { id: 's2' }
		});

		expect(onConflictDoUpdate).toHaveBeenCalledTimes(1);
		expect(broadcastMock).toHaveBeenCalledWith(
			'song_playing',
			expect.objectContaining({
				queueId: 'q2',
				songId: 's2',
				startedAtMs: 1700000000123,
				startedAt: Math.floor(1700000000123 / 1000)
			})
		);
	});
});

