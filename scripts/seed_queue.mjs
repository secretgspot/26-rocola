import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../src/lib/server/db/schema.js';

const db = drizzle(new Database('local.db'), { schema });

async function upsertSongByVideoId(videoId) {
	// Drizzle comparator helpers caused issues earlier; perform client-side lookup
	const sRows = await db.select().from(schema.songs);
	const found = sRows.find((s) => s.videoId === videoId);
	if (found) return found.id;
	const now = Date.now();
	const title = `Seeded ${videoId}`;
	const res = await db.insert(schema.songs).values({ videoId, title, thumbnail: '', duration: 0, channelTitle: 'Seed channel', metadata: '', submittedBy: 'seed', createdAt: now, isAvailable: 1 }).returning();
	return res[0].id;
}

async function seedQueue(videoIds = []) {
	const now = Date.now();
	let rank = 10;
	for (const v of videoIds) {
		const songId = await upsertSongByVideoId(v);
		// ensure not already queued (client-side check)
		const qRows = await db.select().from(schema.queue);
		const found = qRows.find((q) => q.songId === songId);
		if (found) {
			console.log('Already in queue:', v);
			continue;
		}
		await db.insert(schema.queue).values({ songId, tier: 'seed', baseRank: rank, playsRemainingToday: 1, createdAt: now, updatedAt: now }).run();
		rank += 10;
		console.log('Queued:', v);
	}
}

// remove bad seeded titles if present
const titlesToRemove = ['Test song', 'Nirvana - Smells like teen spirit'];
const sRows = await db.select().from(schema.songs).limit(2000);
const toRemove = sRows.filter((s) => titlesToRemove.includes(s.title));
if (toRemove.length) {
	const ids = toRemove.map((t) => t.id);
	const qRows = await db.select().from(schema.queue).limit(2000);
	const rawDb = new Database('local.db');
	rawDb.pragma('foreign_keys = OFF');
	for (const q of qRows.filter((q) => ids.includes(q.songId))) {
		rawDb.prepare('DELETE FROM queue WHERE id = ?').run(q.id);
	}
	for (const id of ids) rawDb.prepare('DELETE FROM songs WHERE id = ?').run(id);
	rawDb.pragma('foreign_keys = ON');
	rawDb.close();
	console.log('Removed bad seeds:', toRemove.map((t) => t.title));
}

const ids = ['wn1OPI6lwnY', 'S-Z7IuPC1Wo', 'dytoUhPxMd0', 'd1ln5Pqbh5c'];
await seedQueue(ids);
console.log('Done seeding');
process.exit(0);
