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
		}
	};
});

vi.mock('$lib/server/db/schema.js', () => ({
	queue: { baseRank: 'baseRank', id: 'id', playsRemainingToday: 'playsRemainingToday' },
	songs: { id: 'id' },
	queuePlays: {}
}));

vi.mock('$lib/server/ws.js', () => ({
	broadcast: vi.fn(),
	getPlaybackState: vi.fn().mockReturnValue({ startedAt: 123 })
}));

describe('queue service fair-share sorting', () => {
	let queueService;
	let db;

	beforeEach(async () => {
		vi.clearAllMocks();
		// Dynamic import to ensure mocks are applied
		queueService = await import('../../src/lib/server/services/queue.js');
		const dbModule = await import('../../src/lib/server/db/index.js');
		db = dbModule.db;
	});

	it('interleaves high-tier songs based on gaps', async () => {
		// Mock turn counter = 10 (10 songs played so far)
		const mockGlobalTurnRes = [{ count: 10 }];
		
		// Mock queue data
		const mockQueue = [
			// Platinum: last played at turn 9. Gap is 2, so next eligible is 11.
			// Since currentTurn (10) < 11, effectiveTurn = 11.
			{ id: 'plat', tier: 'platinum', lastPlayedTurn: 9, baseRank: 100, playsRemainingToday: 10, songId: 's1' },
			
			// Gold: last played at turn 8. Gap is 3, so next eligible is 11.
			// Since currentTurn (10) < 11, effectiveTurn = 11.
			{ id: 'gold', tier: 'gold', lastPlayedTurn: 8, baseRank: 200, playsRemainingToday: 5, songId: 's2' },
			
			// Free: never played. lastPlayedTurn 0. Gap 0.
			// nextEligible = 0. max(10, 0) = 10.
			{ id: 'free1', tier: 'free', lastPlayedTurn: 0, baseRank: 300, playsRemainingToday: 1, songId: 's3' },

			// Another Free: older than free1.
			{ id: 'free2', tier: 'free', lastPlayedTurn: 0, baseRank: 50, playsRemainingToday: 1, songId: 's4' }
		];

		const mockSongs = [
			{ id: 's1', isAvailable: 1 },
			{ id: 's2', isAvailable: 1 },
			{ id: 's3', isAvailable: 1 },
			{ id: 's4', isAvailable: 1 },
		];

		// Mock the chains
		db.select.mockImplementation((fields) => {
			if (fields && fields.count) {
				return { from: vi.fn().mockResolvedValue(mockGlobalTurnRes) };
			}
			return {
				from: vi.fn().mockReturnThis(),
				orderBy: vi.fn().mockReturnThis(),
				limit: vi.fn().mockResolvedValue(mockQueue)
			};
		});
		
		// Second call for songs
		db.select.mockReturnValueOnce({ from: vi.fn().mockReturnThis(), orderBy: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue(mockQueue) }) // turn count
				 .mockReturnValueOnce({ from: vi.fn().mockReturnThis(), orderBy: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue(mockQueue) }) // queue
				 .mockReturnValueOnce({ from: vi.fn().mockResolvedValue(mockSongs) }); // songs

		// Actually, I need a better way to mock the multiple select calls.
		// Let's just fix the mock logic:
		const turnMock = { from: vi.fn().mockResolvedValue(mockGlobalTurnRes) };
		const queueMock = { from: vi.fn().mockReturnThis(), orderBy: vi.fn().mockReturnThis(), limit: vi.fn().mockResolvedValue(mockQueue) };
		const songsMock = { from: vi.fn().mockResolvedValue(mockSongs) };

		db.select
			.mockReturnValueOnce(turnMock)
			.mockReturnValueOnce(queueMock)
			.mockReturnValueOnce(songsMock);

		const result = await queueService.getQueue();

		// Expected order:
		// 1. free2 (Effective 10, Priority 0, baseRank 50)
		// 2. free1 (Effective 10, Priority 0, baseRank 300)
		// 3. plat (Effective 11, Priority 3, baseRank 100)
		// 4. gold (Effective 11, Priority 2, baseRank 200)
		
		const ids = result.map(r => r.id);
		expect(ids).toEqual(['free2', 'free1', 'plat', 'gold']);
	});
});
