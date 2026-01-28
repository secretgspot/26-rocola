import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { queue, songs } from '$lib/server/db/schema.js';
import { broadcast } from '$lib/server/ws.js';
import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';

const SEED_IDS = ['wn1OPI6lwnY', 'S-Z7IuPC1Wo', 'dytoUhPxMd0', 'd1ln5Pqbh5c'];
const BAD_TITLES = ['Test song', 'Nirvana - Smells like teen spirit'];

export async function POST() {
	// Guard: only allow in development environment
	if (env.NODE_ENV !== 'development') return json({ ok: false, error: 'Not allowed' }, { status: 403 });

	let rawDb;
	try {
		rawDb = new Database(env.DATABASE_URL);

		// Full cleanup strategy (dev): wipe analytics and queue, ensure only SEED_IDS remain in songs/queue
		rawDb.pragma('foreign_keys = OFF');
		// wipe analytics referencing queue (safe in dev)
		rawDb.prepare('DELETE FROM queue_plays').run();
		rawDb.prepare('DELETE FROM daily_play_counts').run();
		// wipe queue
		rawDb.prepare('DELETE FROM queue').run();

		// remove songs that are not in the seed list
		const placeholders = SEED_IDS.map(() => '?').join(',');
		rawDb.prepare(`DELETE FROM songs WHERE videoId NOT IN (${placeholders})`).run(...SEED_IDS);

		// re-insert or upsert seed songs and queue
		const now = Math.floor(Date.now() / 1000);
		let rank = Date.now();
		for (const vid of SEED_IDS) {
			let song = rawDb.prepare('SELECT * FROM songs WHERE videoId = ?').get(vid);
			let songId;
			if (song) songId = song.id;
			else {
				songId = crypto.randomUUID();
				rawDb.prepare('INSERT INTO songs (id, videoId, title, thumbnail, duration, channelTitle, metadata, submittedBy, createdAt, isAvailable, totalPlays) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(songId, vid, `Seeded ${vid}`, '', 0, 'Seed channel', null, 'seed', now, 1, 0);
			}
			// insert queue entry
			rawDb.prepare('INSERT INTO queue (id, songId, tier, baseRank, rankBoost, playsRemainingToday, promotionExpiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(crypto.randomUUID(), songId, 'seed', rank, 0, 1, null, now, now);
			rank += 10;
		}

		rawDb.pragma('foreign_keys = ON');

		// Build snapshot and broadcast
		const qRows = await db.select().from(queue).orderBy(queue.baseRank).limit(200);
		const sAll = await db.select().from(songs);
		const sMap = new Map(sAll.map((s) => [s.id, s]));
		const snapshot = qRows.map((q) => ({ ...q, song: sMap.get(q.songId) || null }));
		broadcast('queue_changed', { queue: snapshot });

		// compute and broadcast current if available
		const rows = qRows.map((q) => ({ left: q, right: sMap.get(q.songId) || null }));
		const available = rows.filter((r) => r.left.playsRemainingToday > 0 && r.right && r.right.isAvailable === 1);
		if (available.length) {
			const computed = available.map((r) => ({ ...r.left, ...r.right, visibleRank: (r.left.tier === 'platinum' ? 3 : r.left.tier === 'gold' ? 2 : r.left.tier === 'silver' ? 1 : 0) * 1000000 + r.left.baseRank }));
			computed.sort((a, b) => b.visibleRank - a.visibleRank || a.baseRank - b.baseRank);
			broadcast('song_playing', { songId: computed[0].songId });
		}

		rawDb.close();
		return json({ ok: true, seeded: SEED_IDS.length, removed: 0, finalQueue: snapshot.length });
	} catch (err) {
		console.error('Seed endpoint error', err);
		if (rawDb) try { rawDb.close(); } catch (e) {}
		return json({ ok: false, error: err?.message || String(err) }, { status: 500 });
	}
}