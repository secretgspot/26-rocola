import { db } from '$lib/server/db/index.js';
import { controllerLease } from '$lib/server/db/schema.js';
import { and, eq, isNull, lt, or } from 'drizzle-orm';

const LEASE_MS = 6500;
const LEASE_ID = 'global';

function nowMs() {
	return Date.now();
}

async function ensureLeaseRow() {
	try {
		await db
			.insert(controllerLease)
			.values({
				id: LEASE_ID,
				sessionId: null,
				expiresAtMs: 0,
				updatedAtMs: nowMs()
			})
			.onConflictDoNothing();
	} catch {
		// ignore
	}
}

export async function getControllerState() {
	await ensureLeaseRow();
	const rows = await db.select().from(controllerLease).where(eq(controllerLease.id, LEASE_ID)).limit(1);
	const row = rows[0];
	return {
		sessionId: row?.sessionId ?? null,
		expiresAt: row?.expiresAtMs ?? 0,
		leaseMs: LEASE_MS
	};
}

/**
 * Acquire or renew control for a given session.
 * @param {string} sessionId
 */
export async function claimController(sessionId) {
	await ensureLeaseRow();
	const now = nowMs();
	const nextExpiry = now + LEASE_MS;

	const updated = await db
		.update(controllerLease)
		.set({ sessionId, expiresAtMs: nextExpiry, updatedAtMs: now })
		.where(
			and(
				eq(controllerLease.id, LEASE_ID),
				or(
					eq(controllerLease.sessionId, sessionId),
					isNull(controllerLease.sessionId),
					lt(controllerLease.expiresAtMs, now)
				)
			)
		)
		.returning({ sessionId: controllerLease.sessionId, expiresAtMs: controllerLease.expiresAtMs });

	if (updated[0]?.sessionId === sessionId) {
		return { ok: true, isController: true, expiresAt: updated[0].expiresAtMs, leaseMs: LEASE_MS };
	}

	const current = await getControllerState();
	return {
		ok: true,
		isController: current.sessionId === sessionId,
		expiresAt: current.expiresAt,
		leaseMs: LEASE_MS
	};
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export async function isActiveController(event) {
	const sessionId = event.locals?.sessionId || null;
	if (!sessionId) return false;
	const current = await getControllerState();
	return current.sessionId === sessionId && current.expiresAt > nowMs();
}
