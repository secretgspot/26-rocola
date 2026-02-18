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
		} catch (e) {
			// ignore
		}
		await new Promise((res) => setTimeout(res, 250));
	}
	throw new Error(`Timeout waiting for ${url}`);
}

async function fetchJson(path, opts) {
	const res = await fetch(`${BASE}${path}`, opts);
	const json = await res.json();
	return { status: res.status, ok: res.ok, json };
}

beforeAll(async () => {
	// Optionally auto-start server. Default mode expects app already running.
	if (SHOULD_START_SERVER) {
		const command = process.platform === 'win32' ? 'npm.cmd' : 'npm';
		serverProcess = spawn(command, ['run', 'dev'], {
			env: { ...process.env, NODE_ENV: 'development' },
			stdio: 'ignore'
		});
	}
	try {
		await waitFor(`${BASE}/api/queue`, SHOULD_START_SERVER ? 30000 : 3000);
	} catch {
		throw new Error(
			`Integration server not reachable at ${BASE}. Start app first (e.g. npm run dev), then rerun npm run test:integration.`
		);
	}
});

afterAll(() => {
	if (serverProcess && !serverProcess.killed) {
		serverProcess.kill('SIGTERM');
	}
});

describe('Queue integration (server + DB)', () => {
	it('seeds queue and returns valid current/queue payloads', async () => {
		// 1) seed
		const seedRes = await fetchJson('/api/debug/seed', { method: 'POST' });
		expect(seedRes.json.ok).toBe(true);

		// 2) fetch current
		const curRes = await fetchJson('/api/queue/current');
		expect(curRes.json.ok).toBe(true);
		const current = curRes.json.current;

		// 3) fetch queue
		const qRes = await fetchJson('/api/queue');
		expect(qRes.json.ok).toBe(true);
		const queue = qRes.json.queue || [];

		if (current) {
			expect(typeof current).toBe('object');
			expect(current).toEqual(
				expect.objectContaining({
					queueId: expect.any(String)
				})
			);
		}

		if (queue.length === 0) return; // nothing else to test
	});

	it('returns normalized empty response shape for queue next', async () => {
		const res = await fetchJson('/api/queue/next', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ fromQueueId: null })
		});
		expect(res.status).toBe(200);
		expect(res.json.ok).toBe(true);
		// In empty case next is null; in non-empty case next is object.
		if (res.json.next === null) {
			expect(res.json).toEqual(expect.objectContaining({ ok: true, next: null }));
		} else {
			expect(typeof res.json.next).toBe('object');
		}
	});

	it('dev/admin mode bypasses free-tier duplicate restriction', async () => {
		const uniqueVideoId = `itest-${Date.now()}`;
		const payload = {
			videoId: uniqueVideoId,
			tier: 'free',
			metadata: {
				videoId: uniqueVideoId,
				title: 'Integration Duplicate Rule',
				channelTitle: 'Rocola Test',
				thumbnail: ''
			}
		};

		const first = await fetchJson('/api/queue', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
		expect(first.status).toBe(200);
		expect(first.json.ok).toBe(true);

		const second = await fetchJson('/api/queue', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});

		expect(second.status).toBe(200);
		expect(second.json.ok).toBe(true);
	});
});
