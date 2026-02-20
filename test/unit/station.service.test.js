import { beforeEach, describe, expect, it, vi } from 'vitest';

const makeTx = (currentPlayableRow = null) => ({
	execute: vi.fn().mockResolvedValue(undefined),
	insert: vi.fn().mockReturnValue({
		values: vi.fn().mockReturnValue({
			onConflictDoNothing: vi.fn().mockResolvedValue(undefined)
		})
	}),
	update: vi.fn().mockReturnValue({
		set: vi.fn().mockReturnValue({
			where: vi.fn().mockResolvedValue(undefined)
		})
	}),
	select: vi.fn().mockReturnValue({
		from: vi.fn().mockReturnValue({
			innerJoin: vi.fn().mockReturnValue({
				where: vi.fn().mockReturnValue({
					limit: vi.fn().mockResolvedValue(currentPlayableRow ? [currentPlayableRow] : [])
				})
			})
		})
	})
});

vi.mock('$lib/server/db/index.js', () => ({
	db: {
		transaction: vi.fn()
	}
}));

vi.mock('$lib/server/db/schema.js', () => ({
	stationRuntime: {},
	queue: {},
	songs: {}
}));

vi.mock('$lib/server/services/playback.js', () => ({
	getPlaybackState: vi.fn(),
	setPlaybackState: vi.fn()
}));

vi.mock('$lib/server/services/queue.js', () => ({
	getQueue: vi.fn(),
	advanceQueue: vi.fn(),
	getGlobalTurn: vi.fn()
}));

vi.mock('$lib/server/realtime.js', () => ({
	broadcast: vi.fn()
}));

vi.mock('$lib/server/services/playback-reconcile.js', () => ({
	reconcilePlaybackState: vi.fn().mockResolvedValue({ ok: true, changed: true })
}));

describe('stationTick', () => {
	let stationTick;
	let db;
	let getPlaybackState;
	let setPlaybackState;
	let getQueue;
	let advanceQueue;
	let getGlobalTurn;
	let broadcast;
	let reconcilePlaybackState;

	beforeEach(async () => {
		vi.clearAllMocks();
		({ stationTick } = await import('../../src/lib/server/services/station.js'));
		({ db } = await import('$lib/server/db/index.js'));
		({ getPlaybackState, setPlaybackState } = await import('$lib/server/services/playback.js'));
		({ getQueue, advanceQueue, getGlobalTurn } = await import('$lib/server/services/queue.js'));
		({ broadcast } = await import('$lib/server/realtime.js'));
		({ reconcilePlaybackState } = await import('$lib/server/services/playback-reconcile.js'));
		getGlobalTurn.mockResolvedValue(12);
	});

	it('starts playback from idle queue head', async () => {
		const tx = makeTx(null);
		db.transaction.mockImplementation(async (fn) => fn(tx));
		getPlaybackState.mockResolvedValue({ currentQueueId: null, startedAtMs: null });
		getQueue.mockResolvedValue({
			queue: [{ id: 'q1', songId: 's1', song: { id: 's1', duration: 8, title: 'Track 1' } }]
		});

		const result = await stationTick({ source: 'test', maxAdvances: 5 });

		expect(result.ok).toBe(true);
		expect(result.startedFromIdle).toBe(true);
		expect(result.reason).toBe('started');
		expect(setPlaybackState).toHaveBeenCalledTimes(1);
		expect(broadcast).toHaveBeenCalledWith('queue_changed', { currentTurn: 12 });
		expect(advanceQueue).not.toHaveBeenCalled();
	});

	it('performs catch-up advances when elapsed exceeds duration', async () => {
		const tx = makeTx({
			q: { id: 'q1', songId: 's1' },
			s: { duration: 1 }
		});
		db.transaction.mockImplementation(async (fn) => fn(tx));
		getPlaybackState.mockResolvedValue({
			currentQueueId: 'q1',
			startedAtMs: Date.now() - 20_000
		});
		advanceQueue.mockResolvedValue({ ok: true, played: { queueId: 'q1' }, next: { queueId: 'q2' } });

		const result = await stationTick({ source: 'test', maxAdvances: 3 });

		expect(result.ok).toBe(true);
		expect(result.advances).toBe(3);
		expect(advanceQueue).toHaveBeenCalledTimes(3);
		expect(reconcilePlaybackState).not.toHaveBeenCalled();
	});
});

