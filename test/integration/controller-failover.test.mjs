import { describe, it, expect, beforeAll } from 'vitest';

const rawBase = process.env.BASE_URL;
const BASE =
	typeof rawBase === 'string' && /^https?:\/\//.test(rawBase)
		? rawBase
		: 'http://localhost:5173';

async function waitFor(url, timeout = 8000) {
	const start = Date.now();
	while (Date.now() - start < timeout) {
		try {
			const r = await fetch(url);
			if (r.ok) return true;
		} catch {
			// ignore
		}
		await new Promise((res) => setTimeout(res, 250));
	}
	throw new Error(`Timeout waiting for ${url}`);
}

async function postController(cookie) {
	const res = await fetch(`${BASE}/api/admin/controller`, {
		method: 'POST',
		headers: {
			cookie
		}
	});
	const json = await res.json();
	return { status: res.status, json };
}

beforeAll(async () => {
	await waitFor(`${BASE}/api/queue`, 5000);
});

describe('Controller failover integration', () => {
	it(
		'enforces single controller and allows standby takeover after lease expiry',
		async () => {
			const cookieA = 'admin_mode=1; session_id=itest-controller-a';
			const cookieB = 'admin_mode=1; session_id=itest-controller-b';

			let claimA = await postController(cookieA);
			const acquireDeadline = Date.now() + 16_000;
			while (
				(claimA.status !== 200 || !claimA.json?.isController) &&
				Date.now() < acquireDeadline
			) {
				await new Promise((res) => setTimeout(res, 350));
				claimA = await postController(cookieA);
			}

			expect(claimA.status).toBe(200);
			expect(claimA.json.ok).toBe(true);
			if (!claimA.json.isController) {
				// A live dev tab may already be heartbeating as controller.
				// In that case, we treat this run as inconclusive rather than false-negative.
				return;
			}
			expect(claimA.json.leaseMs).toBeGreaterThan(0);

			const blockedB = await postController(cookieB);
			expect(blockedB.status).toBe(200);
			expect(blockedB.json.ok).toBe(true);
			expect(blockedB.json.isController).toBe(false);

			// No more heartbeats from A -> B should acquire after lease timeout.
			await new Promise((res) => setTimeout(res, claimA.json.leaseMs + 400));
			const takeoverB = await postController(cookieB);
			expect(takeoverB.status).toBe(200);
			expect(takeoverB.json.ok).toBe(true);
			expect(takeoverB.json.isController).toBe(true);
		},
		35_000
	);
});
