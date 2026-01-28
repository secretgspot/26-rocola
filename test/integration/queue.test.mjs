import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import Database from 'better-sqlite3';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const DB_PATH = process.env.DATABASE_URL;
let serverProcess;

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
	// Spawn the dev server for integration tests
	serverProcess = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['run', 'dev'], {
		env: { ...process.env, NODE_ENV: 'development' },
		stdio: 'ignore'
	});
	// wait for API to be reachable
	await waitFor(`${BASE}/api/queue`);
});

afterAll(() => {
	if (serverProcess && !serverProcess.killed) {
		serverProcess.kill('SIGTERM');
	}
});

describe('Queue integration (server + DB)', () => {
	it('seeds and ensures current is excluded from upcoming and playsRemaining filter works', async () => {
		if (!DB_PATH) throw new Error('DATABASE_URL env var must be set for integration tests');

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
				const song = r.right || null;
				return (song?.id ?? r.left?.songId ?? r.left?.id) === curId;
			});
			expect(found).toBeUndefined();
		}

		if (queue.length === 0) return; // nothing else to test

		// 4) set playsRemainingToday = 0 for first upcoming
		const first = queue[0];
		const qId = first.left.id;
		const db = new Database(DB_PATH);
		try {
			const r = db.prepare('UPDATE queue SET playsRemainingToday = 0 WHERE id = ?').run(qId);
			expect(r.changes).toBe(1);
		} finally {
			db.close();
		}

		// 5) re-fetch queue and ensure it's excluded
		const qRes2 = await fetchJson('/api/queue');
		expect(qRes2.json.ok).toBe(true);
		const queue2 = qRes2.json.queue || [];
		const stillThere = queue2.find((r) => r.left.id === qId);
		expect(stillThere).toBeUndefined();
	});
});