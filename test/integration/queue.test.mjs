import { describe, it, expect, beforeAll, afterAll } from 'vitest';
const rawBase = process.env.BASE_URL;
const BASE =
	typeof rawBase === 'string' && /^https?:\/\//.test(rawBase)
		? rawBase
		: 'http://localhost:5173';

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
	// Integration tests expect an already-running app server.
	// This keeps tests stable in restricted environments where child process spawn is blocked.
	try {
		await waitFor(`${BASE}/api/queue`, 3000);
	} catch {
		throw new Error(
			`Integration server not reachable at ${BASE}. Start app first (e.g. npm run dev), then rerun npm run test:integration.`
		);
	}
});

describe('Queue integration (server + DB)', () => {
	it('seeds queue and keeps current track out of upcoming list', async () => {
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

		// Ensure current not in queue
		if (current) {
			const curId = current.songId ?? current.id ?? current.videoId;
			const found = queue.find((r) => {
				const song = r.song || null;
				return (song?.id ?? r.songId ?? r.id) === curId;
			});
			expect(found).toBeUndefined();
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

	it('enforces free-tier duplicate rule over API', async () => {
		const payload = {
			videoId: 'dQw4w9WgXcQ',
			tier: 'free',
			metadata: {
				videoId: 'dQw4w9WgXcQ',
				title: 'Never Gonna Give You Up',
				channelTitle: 'Rick Astley',
				thumbnail: ''
			}
		};

		const first = await fetchJson('/api/queue', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});
		expect([200, 409]).toContain(first.status);

		const second = await fetchJson('/api/queue', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(payload)
		});

		// Second attempt should eventually be rejected as duplicate for this session/IP/day.
		expect([409, 429]).toContain(second.status);
	});
});
