/**
 * Lightweight in-memory controller lease for single-instance/dev runtime.
 * Lease must be renewed periodically by the owning admin session.
 */
const LEASE_MS = 6500;

/** @type {{ sessionId: string | null, expiresAt: number }} */
const state = {
	sessionId: null,
	expiresAt: 0
};

function nowMs() {
	return Date.now();
}

export function getControllerState() {
	const now = nowMs();
	if (state.sessionId && now >= state.expiresAt) {
		state.sessionId = null;
		state.expiresAt = 0;
	}
	return {
		sessionId: state.sessionId,
		expiresAt: state.expiresAt,
		leaseMs: LEASE_MS
	};
}

/**
 * Acquire or renew control for a given session.
 * @param {string} sessionId
 */
export function claimController(sessionId) {
	const now = nowMs();
	const current = getControllerState();
	if (!current.sessionId || current.sessionId === sessionId) {
		state.sessionId = sessionId;
		state.expiresAt = now + LEASE_MS;
		return { ok: true, isController: true, expiresAt: state.expiresAt, leaseMs: LEASE_MS };
	}
	return {
		ok: true,
		isController: false,
		expiresAt: current.expiresAt,
		leaseMs: LEASE_MS
	};
}

/**
 * @param {import('@sveltejs/kit').RequestEvent} event
 */
export function isActiveController(event) {
	const sessionId = event.locals?.sessionId || null;
	if (!sessionId) return false;
	const current = getControllerState();
	return current.sessionId === sessionId;
}

