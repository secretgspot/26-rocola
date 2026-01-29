import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { queue, songs } from '$lib/server/db/schema.js';
import { broadcast } from '$lib/server/ws.js';
import { gt, eq } from 'drizzle-orm';


export async function GET() {
	try {
		// Fetch queue and songs separately and combine in JS as a workaround
		const qRows = await db.select().from(queue).orderBy(queue.baseRank).limit(100);
		const sRows = await db.select().from(songs);
		const sMap = new Map(sRows.map((s) => [s.id, s]));
		let rows = qRows.map((q) => ({ left: q, right: sMap.get(q.songId) || null }));
		// Only return playable upcoming rows (exclude playsRemainingToday <= 0 and unavailable songs)
		rows = rows.filter((r) => r.left.playsRemainingToday > 0 && r.right && r.right.isAvailable === 1);
		return json({ ok: true, queue: rows.map((r) => ({ left: r.left, right: r.right })) });
	} catch (err) {
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}

export async function POST({ request }) {
	const payload = await request.json();
	const { videoId, metadata, tier = 'free' } = payload;
	if (!videoId) return json({ ok: false, error: 'videoId required' }, { status: 400 });

	try {
		// check if song exists (JS-based lookup)
		const allSongs = await db.select().from(songs).limit(1000);
		let existing = allSongs.find((s) => s.videoId === videoId);
		let song;
		if (existing) {
			song = existing;
			// Update metadata if provided to fix any stale/seed data
			if (metadata) {
				await db.update(songs).set({
					title: metadata.title || song.title,
					thumbnail: metadata.thumbnail || song.thumbnail,
					channelTitle: metadata.channelTitle || song.channelTitle,
					metadata: JSON.stringify(metadata)
				}).where(eq(songs.id, song.id));
				song = { ...song, ...metadata };
			}
		} else {
			const id = crypto.randomUUID();
			const title = metadata?.title || 'Unknown Title';
			const thumbnail = metadata?.thumbnail || null;
			const channelTitle = metadata?.channelTitle || null;
			const createdAt = Math.floor(Date.now() / 1000);
			await db.insert(songs).values({ id, videoId, title, thumbnail, channelTitle, metadata: metadata ? JSON.stringify(metadata) : null, submittedBy: 'anon', createdAt, isAvailable: 1, totalPlays: 0 });
			song = { id, videoId, title, thumbnail, channelTitle };
		}

		// Check if queue was empty before adding
		const existingQueue = await db.select().from(queue).where(gt(queue.playsRemainingToday, 0)).limit(1);
		const wasEmpty = existingQueue.length === 0;

		// add to queue
		const qId = crypto.randomUUID();
		const baseRank = Date.now();
		const createdAt = Math.floor(Date.now() / 1000);
		const playsRemainingToday = tier === 'free' ? 1 : 3; // simple defaults
		await db.insert(queue).values({ id: qId, songId: song.id, tier, baseRank, rankBoost: 0, playsRemainingToday, promotionExpiresAt: null, createdAt, updatedAt: createdAt });

		// Broadcast change to websocket clients
		try {
			const qRows = await db.select().from(queue).orderBy(queue.baseRank).limit(100);
			const sRows = await db.select().from(songs);
			const sMap = new Map(sRows.map((s) => [s.id, s]));
			const snapshot = qRows.map((q) => ({ ...q, song: sMap.get(q.songId) || null }));
			
			broadcast('song_added', { id: qId, songId: song.id, tier, baseRank });
			broadcast('queue_changed', { queue: snapshot });

			// If the player was idle, notify clients to start playing this song
			if (wasEmpty) {
				broadcast('song_playing', { songId: song.id });
			}
		} catch (e) {
			console.warn('Failed to broadcast queue change', e?.message || e);
		}

		return json({ ok: true, id: qId });
	} catch (err) {
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}
