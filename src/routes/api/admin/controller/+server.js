import { json } from '@sveltejs/kit';
import { isAdminRequest, checkRate } from '$lib/server/security.js';
import { claimController, getControllerState, isActiveController } from '$lib/server/controller.js';

export async function GET(event) {
	if (!isAdminRequest(event, { allowDev: false })) {
		return json({ ok: false, error: 'Admin required' }, { status: 403 });
	}
	const current = await getControllerState();
	return json({
		ok: true,
		isController: await isActiveController(event),
		leaseMs: current.leaseMs,
		expiresAt: current.expiresAt
	});
}

export async function POST(event) {
	if (!isAdminRequest(event, { allowDev: false })) {
		return json({ ok: false, error: 'Admin required' }, { status: 403 });
	}
	const limited = checkRate(event, 'admin-controller-claim', 120, 60 * 1000, 'session');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	const sessionId = event.locals?.sessionId || null;
	if (!sessionId) return json({ ok: false, error: 'Session required' }, { status: 400 });
	return json(await claimController(sessionId));
}
