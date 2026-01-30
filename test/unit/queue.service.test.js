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

describe('queue service sorting', () => {
	let queueService;
	let db;

	beforeEach(async () => {
		vi.clearAllMocks();
		// Dynamic import to ensure mocks are applied
		queueService = await import('../../src/lib/server/services/queue.js');
		const dbModule = await import('../../src/lib/server/db/index.js');
		db = dbModule.db;
	});

	it('sorts queue items correctly: Platinum > Gold > Silver > Free > Oldest', async () => {
		// Mock data
		const mockQueue = [
			{ id: '1', songId: 's1', tier: 'free', baseRank: 1000, playsRemainingToday: 1 },
			{ id: '2', songId: 's2', tier: 'silver', baseRank: 2000, playsRemainingToday: 3 }, // Newer but silver
			{ id: '3', songId: 's3', tier: 'gold', baseRank: 3000, playsRemainingToday: 7 },
			{ id: '4', songId: 's4', tier: 'platinum', baseRank: 4000, playsRemainingToday: 15 },
			{ id: '5', songId: 's5', tier: 'free', baseRank: 500, playsRemainingToday: 1 }, // Older free
			{ id: '6', songId: 's6', tier: 'platinum', baseRank: 4500, playsRemainingToday: 15 } // Newer platinum
		];

		const mockSongs = [
			{ id: 's1', isAvailable: 1 },
			{ id: 's2', isAvailable: 1 },
			{ id: 's3', isAvailable: 1 },
			{ id: 's4', isAvailable: 1 },
			{ id: 's5', isAvailable: 1 },
			{ id: 's6', isAvailable: 1 },
		];

		const queueQueryMock = {
			from: vi.fn().mockReturnThis(),
			orderBy: vi.fn().mockReturnThis(),
			limit: vi.fn().mockResolvedValue(mockQueue)
		};
		
		const songsQueryMock = {
			from: vi.fn().mockResolvedValue(mockSongs)
		};

		db.select
			.mockReturnValueOnce(queueQueryMock) // First call for queue
			.mockReturnValueOnce(songsQueryMock); // Second call for songs

		const result = await queueService.getQueue();

		// Expected order:
		// 1. Platinum (s4, s6) -> s4 (older) then s6
		// 2. Gold (s3)
		// 3. Silver (s2)
		// 4. Free (s5, s1) -> s5 (older) then s1
		
		const ids = result.map(r => r.id);
		expect(ids).toEqual(['4', '6', '3', '2', '5', '1']);
	});
});