import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock SvelteKit env modules
vi.mock('$env/dynamic/private', () => ({
	env: { DATABASE_URL: ':memory:' }
}));

// Mock DB module
vi.mock('$lib/server/db/index.js', () => {
	return {
		db: {
			select: vi.fn().mockReturnThis(),
			from: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			update: vi.fn().mockReturnThis(),
			set: vi.fn().mockReturnThis(),
			insert: vi.fn().mockReturnThis(),
			values: vi.fn().mockReturnThis(),
			innerJoin: vi.fn().mockReturnThis(),
		}
	};
});

vi.mock('$lib/server/db/schema.js', () => ({
	queue: { baseRank: 'baseRank', id: 'id', playsRemainingToday: 'playsRemainingToday', songId: 'songId' },
	songs: { id: 'id', isAvailable: 'isAvailable', videoId: 'videoId' },
	queuePlays: {}
}));

vi.mock('$lib/server/ws.js', () => ({
	broadcast: vi.fn(),
	getPlaybackState: vi.fn().mockReturnValue({ startedAt: 123 })
}));

describe('queue service fair-share sorting with Joins', () => {
	let queueService;
	let db;

	beforeEach(async () => {
		vi.clearAllMocks();
		queueService = await import('../../src/lib/server/services/queue.js');
		const dbModule = await import('../../src/lib/server/db/index.js');
		db = dbModule.db;
	});

	it('interleaves high-tier songs based on gaps using join results', async () => {
		const currentTurn = 10;
		const mockGlobalTurnRes = [{ count: currentTurn }];
		
		// Join results format: { queue: {...}, song: {...} }
		const mockJoinResults = [
			{ 
				queue: { id: 'plat', tier: 'platinum', lastPlayedTurn: 9, baseRank: 100, playsRemainingToday: 10, songId: 's1' },
				song: { id: 's1', isAvailable: 1 }
			},
			{ 
				queue: { id: 'gold', tier: 'gold', lastPlayedTurn: 8, baseRank: 200, playsRemainingToday: 5, songId: 's2' },
				song: { id: 's2', isAvailable: 1 }
			},
			{ 
				queue: { id: 'free1', tier: 'free', lastPlayedTurn: 0, baseRank: 300, playsRemainingToday: 1, songId: 's3' },
				song: { id: 's3', isAvailable: 1 }
			},
			{ 
				queue: { id: 'free2', tier: 'free', lastPlayedTurn: 0, baseRank: 50, playsRemainingToday: 1, songId: 's4' },
				song: { id: 's4', isAvailable: 1 }
			}
		];

		// Mock implementation for chained calls
		db.select.mockImplementation(() => {
			return {
				from: vi.fn().mockReturnThis(),
				innerJoin: vi.fn().mockReturnThis(),
				where: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockImplementation(function() {
					// Detect if this is the count query or the join query
					// In our case, we can use the order of calls
					return Promise.resolve(this._isCount ? mockGlobalTurnRes : mockJoinResults);
				}),
				_isCount: false
			};
		});

		// Specialized mock for count vs join
		db.select.mockReturnValueOnce({
			from: vi.fn().mockResolvedValue(mockGlobalTurnRes)
		});
		db.select.mockReturnValueOnce({
			from: vi.fn().mockReturnThis(),
			innerJoin: vi.fn().mockReturnThis(),
			where: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockResolvedValue(mockJoinResults)
		});

		const result = await queueService.getQueue();

		const ids = result.map(r => r.id);
		expect(ids).toEqual(['free2', 'free1', 'plat', 'gold']);
	});
});