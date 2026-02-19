import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';

const rawBase = process.env.BASE_URL;
const BASE =
	typeof rawBase === 'string' && /^https?:\/\//.test(rawBase)
		? rawBase
		: 'http://localhost:5173';
const SHOULD_START_SERVER = process.env.INTEGRATION_START_SERVER === '1';
let serverProcess = null;

async function waitFor(url, timeout = 30000) {
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

async function fetchJson(path, opts) {
	const res = await fetch(`${BASE}${path}`, opts);
	const json = await res.json().catch(() => ({}));
	return { status: res.status, ok: res.ok, json };
}

beforeAll(async () => {
	if (SHOULD_START_SERVER) {
		const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
		serverProcess = spawn(command, ['run', 'dev'], {
			env: { ...process.env, NODE_ENV: 'development' },
			stdio: 'ignore'
		});
	}
	await waitFor(`${BASE}/api/queue`, SHOULD_START_SERVER ? 30000 : 3000);
});

afterAll(() => {
	if (serverProcess && !serverProcess.killed) {
		serverProcess.kill('SIGTERM');
	}
});

describe('Autonomous station progression', () => {
	it(
		'advances playback via server tick without controller/client progression loop',
		async () => {
			const clearRes = await fetchJson('/api/debug/clear', { method: 'POST' });
			if (!clearRes.ok) {
				// In non-dev this may be admin-gated; continue with unique video ids anyway.
			}

			const vidA = `auto-${Date.now()}-a`;
			const vidB = `auto-${Date.now()}-b`;

			for (const videoId of [vidA, vidB]) {
				const add = await fetchJson('/api/queue', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						videoId,
						tier: 'free',
						metadata: {
							videoId,
							title: `Auto ${videoId}`,
							channelTitle: 'Integration',
							thumbnail: '',
							duration: 'PT2S'
						}
					})
				});
				expect(add.status).toBe(200);
				expect(add.json.ok).toBe(true);
			}

			const current1 = await fetchJson('/api/queue/current');
			expect(current1.status).toBe(200);
			expect(current1.json.ok).toBe(true);
			expect(current1.json.current).toBeTruthy();
			const firstQueueId = current1.json.current.queueId;

			await new Promise((res) => setTimeout(res, 2400));
			const tick1 = await fetchJson('/api/station/tick', { method: 'POST' });
			expect(tick1.status).toBe(200);
			expect(tick1.json.ok).toBe(true);

			const current2 = await fetchJson('/api/queue/current');
			expect(current2.status).toBe(200);
			expect(current2.json.ok).toBe(true);
			expect(current2.json.current).toBeTruthy();
			expect(current2.json.current.queueId).not.toBe(firstQueueId);

			await new Promise((res) => setTimeout(res, 2400));
			const tick2 = await fetchJson('/api/station/tick', { method: 'POST' });
			expect(tick2.status).toBe(200);
			expect(tick2.json.ok).toBe(true);

			const current3 = await fetchJson('/api/queue/current');
			expect(current3.status).toBe(200);
			expect(current3.json.ok).toBe(true);
			expect(current3.json.current).toBeNull();
		},
		30_000
	);
});

