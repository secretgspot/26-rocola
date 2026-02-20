import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';

const rawBase = process.env.BASE_URL;
const BASE =
	typeof rawBase === 'string' && /^https?:\/\//.test(rawBase) ? rawBase : 'http://localhost:5173';
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

describe('Station recovery integration', () => {
	it(
		'reconnect after long idle returns authoritative empty current (no stale replay)',
		async () => {
			await fetchJson('/api/debug/clear', { method: 'POST' });

			const mk = (suffix) => `recover-${Date.now()}-${suffix}`;
			for (const id of [mk('a'), mk('b')]) {
				const add = await fetchJson('/api/queue', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						videoId: id,
						tier: 'free',
						metadata: {
							videoId: id,
							title: `Recover ${id}`,
							channelTitle: 'Integration',
							thumbnail: '',
							duration: 'PT2S'
						}
					})
				});
				expect(add.status).toBe(200);
				expect(add.json.ok).toBe(true);
			}

			const c1 = await fetchJson('/api/queue/current');
			expect(c1.status).toBe(200);
			expect(c1.json.current).toBeTruthy();

			// Progress until exhausted (time-based advancement may need multiple ticks).
			for (let i = 0; i < 6; i += 1) {
				await new Promise((res) => setTimeout(res, 2200));
				const t = await fetchJson('/api/station/tick', { method: 'POST' });
				expect(t.status).toBe(200);
				expect(t.json.ok).toBe(true);
				const cur = await fetchJson('/api/queue/current');
				if (cur.json.current === null) break;
			}

			// Simulate reconnect much later: server truth should be idle, not stale last song.
			await new Promise((res) => setTimeout(res, 2000));
			const c2 = await fetchJson('/api/queue/current');
			expect(c2.status).toBe(200);
			expect(c2.json.ok).toBe(true);
			expect(c2.json.current).toBeNull();
		},
		35_000
	);

	it(
		'recovers to next playable track after active track is marked unavailable',
		async () => {
			await fetchJson('/api/debug/clear', { method: 'POST' });

			const claim = await fetchJson('/api/admin/controller', { method: 'POST' });
			expect(claim.status).toBe(200);
			expect(claim.json.ok).toBe(true);
			let isController = Boolean(claim.json.isController);
			for (let i = 0; i < 10 && !isController; i += 1) {
				await new Promise((res) => setTimeout(res, 800));
				const retry = await fetchJson('/api/admin/controller', { method: 'POST' });
				isController = Boolean(retry.json?.isController);
			}
			if (!isController) {
				// Another active lease may exist from a concurrent manual session.
				// Skip strict unavailable-path assertion in that case.
				return;
			}

			const ids = [`unavail-${Date.now()}-a`, `unavail-${Date.now()}-b`];
			for (const id of ids) {
				const add = await fetchJson('/api/queue', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						videoId: id,
						tier: 'free',
						metadata: {
							videoId: id,
							title: `Unavail ${id}`,
							channelTitle: 'Integration',
							thumbnail: '',
							duration: 'PT20S'
						}
					})
				});
				expect(add.status).toBe(200);
				expect(add.json.ok).toBe(true);
			}

			const current = await fetchJson('/api/queue/current');
			expect(current.status).toBe(200);
			expect(current.json.current).toBeTruthy();
			const active = current.json.current;

			const mark = await fetchJson('/api/queue/unavailable', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					queueId: active.queueId,
					songId: active.songId,
					videoId: active.videoId,
					reason: 'youtube_playback_error',
					errorCode: 101
				})
			});
			expect(mark.status).toBe(200);
			expect(mark.json.ok).toBe(true);
			expect(mark.json.action).toBe('skip');

			const tick = await fetchJson('/api/station/tick', { method: 'POST' });
			expect(tick.status).toBe(200);
			expect(tick.json.ok).toBe(true);

			const next = await fetchJson('/api/queue/current');
			expect(next.status).toBe(200);
			expect(next.json.ok).toBe(true);
			expect(next.json.current).toBeTruthy();
			expect(next.json.current.queueId).not.toBe(active.queueId);
		},
		35_000
	);
});
