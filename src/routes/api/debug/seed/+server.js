import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { queue, songs } from '$lib/server/db/schema.js';
import { broadcast } from '$lib/server/ws.js';
import Database from 'better-sqlite3';
import { env } from '$env/dynamic/private';

const SEED_DATA = [
	{ 
		id: 'wn1OPI6lwnY', 
		title: 'Nirvana - Smells Like Teen Spirit', 
		channel: 'Nirvana', 
		thumb: 'https://i.ytimg.com/vi/wn1OPI6lwnY/hqdefault.jpg' 
	},
	{ 
		id: 'S-Z7IuPC1Wo', 
		title: "Guns N' Roses - Sweet Child O' Mine", 
		channel: "Guns N' Roses", 
		thumb: 'https://i.ytimg.com/vi/S-Z7IuPC1Wo/hqdefault.jpg' 
	},
	{ 
		id: 'dytoUhPxMd0', 
		title: 'Rick Astley - Never Gonna Give You Up', 
		channel: 'Rick Astley', 
		thumb: 'https://i.ytimg.com/vi/dytoUhPxMd0/hqdefault.jpg' 
	},
	{ 
		id: 'd1ln5Pqbh5c', 
		title: 'Queen – Bohemian Rhapsody', 
		channel: 'Queen Official', 
		thumb: 'https://i.ytimg.com/vi/d1ln5Pqbh5c/hqdefault.jpg' 
	}
];

export async function POST() {
	if (env.NODE_ENV !== 'development') return json({ ok: false, error: 'Not allowed' }, { status: 403 });

	let rawDb;
	try {
		rawDb = new Database(env.DATABASE_URL);

		// Seed logic: Just add the seeds, don't delete user songs
		const now = Math.floor(Date.now() / 1000);
		let rank = Date.now();
		
		for (const data of SEED_DATA) {
			let song = rawDb.prepare('SELECT * FROM songs WHERE videoId = ?').get(data.id);
			let songId;
			
			if (song) {
				songId = song.id;
				// Repair metadata
				rawDb.prepare('UPDATE songs SET title = ?, channelTitle = ?, thumbnail = ? WHERE id = ?')
					.run(data.title, data.channel, data.thumb, songId);
			} else {
				songId = crypto.randomUUID();
				rawDb.prepare('INSERT INTO songs (id, videoId, title, thumbnail, duration, channelTitle, metadata, submittedBy, createdAt, isAvailable, totalPlays) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(songId, data.id, data.title, data.thumb, 180, data.channel, JSON.stringify({ title: data.title, channelTitle: data.channel, thumbnail: data.thumb }), 'seed', now, 1, 0);
			}
			
			// Check if already in queue
			let inQueue = rawDb.prepare('SELECT * FROM queue WHERE songId = ? AND playsRemainingToday > 0').get(songId);
			if (!inQueue) {
				rawDb.prepare('INSERT INTO queue (id, songId, tier, baseRank, rankBoost, playsRemainingToday, promotionExpiresAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').run(crypto.randomUUID(), songId, 'seed', rank, 0, 1, null, now, now);
				rank += 10;
			}
		}

		rawDb.close();

		// Broadcast fresh state
		const qRows = await db.select().from(queue).orderBy(queue.baseRank).limit(100);
		const sAll = await db.select().from(songs);
		const sMap = new Map(sAll.map((s) => [s.id, s]));
		const snapshot = qRows.map((q) => ({ ...q, song: sMap.get(q.songId) || null }));
		broadcast('queue_changed', { queue: snapshot });

		return json({ ok: true, message: 'Seeded items added/repaired.' });
	} catch (err) {
		console.error('Seed error', err);
		if (rawDb) rawDb.close();
		return json({ ok: false, error: err.message });
	}
}