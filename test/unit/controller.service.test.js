import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const leaseRow = {
	id: 'global',
	sessionId: null,
	expiresAtMs: 0,
	updatedAtMs: 0
};

const controllerLeaseMock = {
	id: 'id',
	sessionId: 'sessionId',
	expiresAtMs: 'expiresAtMs',
	updatedAtMs: 'updatedAtMs'
};

const dbMock = {
	insert: vi.fn(() => ({
		values: vi.fn(() => ({
			onConflictDoNothing: vi.fn(async () => {
				// single-row table mock, row is already initialized
			})
		}))
	})),
	select: vi.fn(() => ({
		from: vi.fn(() => ({
			where: vi.fn(() => ({
				limit: vi.fn(async () => [{ ...leaseRow }])
			}))
		}))
	})),
	update: vi.fn(() => ({
		set: vi.fn((payload) => ({
			where: vi.fn(() => ({
				returning: vi.fn(async () => {
					const now = Date.now();
					const canUpdate =
						leaseRow.sessionId === payload.sessionId ||
						leaseRow.sessionId == null ||
						leaseRow.expiresAtMs < now;

					if (!canUpdate) return [];

					leaseRow.sessionId = payload.sessionId;
					leaseRow.expiresAtMs = payload.expiresAtMs;
					leaseRow.updatedAtMs = payload.updatedAtMs;
					return [{ sessionId: leaseRow.sessionId, expiresAtMs: leaseRow.expiresAtMs }];
				})
			}))
		}))
	}))
};

vi.mock('$lib/server/db/index.js', () => ({
	db: dbMock
}));

vi.mock('$lib/server/db/schema.js', () => ({
	controllerLease: controllerLeaseMock
}));

vi.mock('drizzle-orm', () => ({
	and: (...args) => ({ and: args }),
	eq: (...args) => ({ eq: args }),
	isNull: (...args) => ({ isNull: args }),
	lt: (...args) => ({ lt: args }),
	or: (...args) => ({ or: args })
}));

describe('controller lease service', () => {
	beforeEach(() => {
		leaseRow.id = 'global';
		leaseRow.sessionId = null;
		leaseRow.expiresAtMs = 0;
		leaseRow.updatedAtMs = 0;
		vi.useFakeTimers();
		vi.setSystemTime(1_000_000);
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('allows first session to acquire and renew lease', async () => {
		const { claimController } = await import('../../src/lib/server/controller.js');

		const first = await claimController('session-a');
		expect(first.ok).toBe(true);
		expect(first.isController).toBe(true);
		const firstExpiry = first.expiresAt;

		vi.setSystemTime(1_002_000);
		const renewed = await claimController('session-a');
		expect(renewed.ok).toBe(true);
		expect(renewed.isController).toBe(true);
		expect(renewed.expiresAt).toBeGreaterThan(firstExpiry);
	});

	it('prevents takeover while lease is still active', async () => {
		const { claimController } = await import('../../src/lib/server/controller.js');

		const a = await claimController('session-a');
		expect(a.isController).toBe(true);

		vi.setSystemTime(1_003_000);
		const b = await claimController('session-b');
		expect(b.ok).toBe(true);
		expect(b.isController).toBe(false);
		expect(leaseRow.sessionId).toBe('session-a');
	});

	it('allows takeover after lease expiration', async () => {
		const { claimController, getControllerState } = await import('../../src/lib/server/controller.js');

		const a = await claimController('session-a');
		expect(a.isController).toBe(true);

		vi.setSystemTime(a.expiresAt + 50);
		const b = await claimController('session-b');
		expect(b.ok).toBe(true);
		expect(b.isController).toBe(true);

		const state = await getControllerState();
		expect(state.sessionId).toBe('session-b');
		expect(state.expiresAt).toBeGreaterThan(Date.now());
	});
});
