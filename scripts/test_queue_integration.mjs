import assert from 'node:assert';
import Database from 'better-sqlite3';

const BASE = process.env.BASE_URL || 'http://localhost:5173';
const DB_PATH = process.env.DATABASE_URL;

async function fetchJson(path, opts) {
	const res = await fetch(`${BASE}${path}`, opts);
	const json = await res.json();
	return { status: res.status, ok: res.ok, json };
}

async function run() {
	console.log('Integration test: queue excludes current and entries with no plays remaining');
	if (!DB_PATH) {
		console.error('DATABASE_URL not set in env. Set DATABASE_URL (path to sqlite file) and retry.');
		process.exit(1);
	}

	// 1) Seed via API
	const seedRes = await fetchJson('/api/debug/seed', { method: 'POST' });
	assert.strictEqual(seedRes.json.ok, true, 'Seed endpoint should return ok');
	console.log('  Seeded items:', seedRes.json.seeded, 'finalQueue', seedRes.json.finalQueue);

	// 2) Fetch current
	const curRes = await fetchJson('/api/queue/current');
	assert.strictEqual(curRes.json.ok, true, 'GET /api/queue/current should return ok');
	const current = curRes.json.current;
	console.log('  Current:', current?.title ?? current?.videoId ?? '(none)');

	// 3) Fetch queue
	const qRes = await fetchJson('/api/queue');
	assert.strictEqual(qRes.json.ok, true, 'GET /api/queue should return ok');
	const queue = qRes.json.queue || [];
	console.log('  Upcoming count:', queue.length);

	// Assert queue does not include current song
	if (current) {
		const curId = current.songId ?? current.id ?? current.videoId;
		const found = queue.find((r) => {
			const song = r.right || null;
			return (song?.id ?? r.left?.songId ?? r.left?.id) === curId;
		});
		assert.strictEqual(found, undefined, 'Queue should not include the current song');
		console.log('  ✅ Current is not in upcoming');
	} else {
		console.log('  (No current song)');
	}

	if (queue.length === 0) {
		console.log('  No upcoming rows to test playsRemaining behavior — consider seeding more items');
		console.log('  ✅ Test passed (no upcoming rows)');
		process.exit(0);
	}

	// 4) Take the first upcoming item and set playsRemainingToday=0 in DB
	const first = queue[0];
	const qId = first.left.id;
	console.log('  Marking queue item as played-out (playsRemainingToday=0) for id:', qId);
	const db = new Database(DB_PATH);
	try {
		const r = db.prepare('UPDATE queue SET playsRemainingToday = 0 WHERE id = ?').run(qId);
		assert.ok(r.changes === 1, 'Should update one row in DB');
		console.log('  DB updated');
	} finally {
		db.close();
	}

	// 5) Re-fetch queue and assert the marked item is gone
	const qRes2 = await fetchJson('/api/queue');
	assert.strictEqual(qRes2.json.ok, true, 'GET /api/queue should return ok (after DB edit)');
	const queue2 = qRes2.json.queue || [];
	const stillThere = queue2.find((r) => r.left.id === qId);
	assert.strictEqual(stillThere, undefined, 'Item with playsRemainingToday=0 should be excluded from /api/queue');
	console.log('  ✅ playsRemainingToday=0 entries excluded');

	console.log('\nIntegration test PASSED');
	process.exit(0);
}

run().catch((err) => {
	console.error('Test failed:', err);
	process.exit(1);
});