import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/realtime.js', () => ({
	broadcast: vi.fn()
}));

vi.mock('$lib/server/services/playback.js', () => ({
	getPlaybackState: vi.fn(),
	setPlaybackState: vi.fn()
}));

vi.mock('$lib/server/services/queue.js', () => ({
	getQueue: vi.fn(),
	getGlobalTurn: vi.fn()
}));

describe('playback-reconcile service', () => {
	let reconcilePlaybackState;
	let getPlaybackState;
	let setPlaybackState;
	let getQueue;
	let getGlobalTurn;
	let broadcast;

	beforeEach(async () => {
		vi.restoreAllMocks();
		vi.clearAllMocks();
		({ reconcilePlaybackState } = await import('../../src/lib/server/services/playback-reconcile.js'));
		({ getPlaybackState, setPlaybackState } = await import('$lib/server/services/playback.js'));
		({ getQueue, getGlobalTurn } = await import('$lib/server/services/queue.js'));
		({ broadcast } = await import('$lib/server/realtime.js'));
		getGlobalTurn.mockResolvedValue(19);
	});

	it('clears stale playback pointer when queue is empty', async () => {
		getPlaybackState.mockResolvedValue({
			currentQueueId: 'q-stale',
			startedAtMs: Date.now() - 40_000
		});
		getQueue.mockResolvedValue({ queue: [] });

		const result = await reconcilePlaybackState({ reason: 'test_idle' });

		expect(result.ok).toBe(true);
		expect(result.changed).toBe(true);
		expect(setPlaybackState).toHaveBeenCalledWith({ currentQueueId: null, startedAtMs: null });
		expect(broadcast).toHaveBeenCalledWith('queue_changed', { currentTurn: 19 });
	});

	it('reanchors when pointer points to same queue item but startedAt is stale', async () => {
		vi.spyOn(Date, 'now').mockReturnValue(200_000);
		getPlaybackState.mockResolvedValue({
			currentQueueId: 'q1',
			startedAtMs: 150_000
		});
		getQueue.mockResolvedValue({
			queue: [
				{
					id: 'q1',
					songId: 's1',
					duration: 7,
					song: { id: 's1', duration: 7, title: 'Track' }
				}
			]
		});

		const result = await reconcilePlaybackState({ reason: 'test_stale_start' });

		expect(result.ok).toBe(true);
		expect(result.changed).toBe(true);
		expect(setPlaybackState).toHaveBeenCalledTimes(1);
		expect(broadcast).toHaveBeenCalledWith('queue_changed', { currentTurn: 19 });
	});

	it('does not mutate playback when healthy', async () => {
		const now = Date.now();
		getPlaybackState.mockResolvedValue({
			currentQueueId: 'q1',
			startedAtMs: now - 1_000
		});
		getQueue.mockResolvedValue({
			queue: [
				{
					id: 'q1',
					songId: 's1',
					duration: 60,
					song: { id: 's1', duration: 60, title: 'Healthy' }
				}
			]
		});

		const result = await reconcilePlaybackState({ reason: 'test_healthy' });

		expect(result.ok).toBe(true);
		expect(result.changed).toBe(false);
		expect(setPlaybackState).not.toHaveBeenCalled();
		expect(broadcast).not.toHaveBeenCalled();
	});
});
