import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { controllerLease } from '$lib/server/db/schema.js';
import { checkRate, isAdminRequest } from '$lib/server/security.js';
import { eq } from 'drizzle-orm';

const LEASE_ID = 'global';
const LEASE_MS = 6500;

export async function POST(event) {
	if (!isAdminRequest(event)) {
		return json({ ok: false, error: 'Not allowed in production' }, { status: 403 });
	}
	const limited = checkRate(event, 'debug-controller', 30, 60 * 1000, 'session');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	const body = await event.request.json().catch(() => ({}));
	const action = typeof body?.action === 'string' ? body.action : 'claim';

	if (action === 'clear') {
		await db.delete(controllerLease).where(eq(controllerLease.id, LEASE_ID));
		return json({ ok: true, cleared: true });
	}

	const sessionId = event.locals?.sessionId || null;
	if (!sessionId) {
		return json({ ok: false, error: 'Session required' }, { status: 400 });
	}

	const now = Date.now();
	const expiresAtMs = now + LEASE_MS;

	await db
		.insert(controllerLease)
		.values({
			id: LEASE_ID,
			sessionId,
			expiresAtMs,
			updatedAtMs: now
		})
		.onConflictDoUpdate({
			target: controllerLease.id,
			set: {
				sessionId,
				expiresAtMs,
				updatedAtMs: now
			}
		});

	return json({
		ok: true,
		isController: true,
		sessionId,
		expiresAt: expiresAtMs,
		leaseMs: LEASE_MS
	});
}

