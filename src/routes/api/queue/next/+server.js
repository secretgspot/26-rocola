import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { queue, songs, queuePlays } from '$lib/server/db/schema.js';
import { eq } from 'drizzle-orm';
import { broadcast, getPlaybackState } from '$lib/server/ws.js';

/**
 * POST to advance the queue: mark the current song as played and return the next one
 * @returns {Promise<Response>}
 */
export async function POST({ request }) {
	try {
		let fromQueueId = null;
		try {
			const body = await request.json();
			fromQueueId = body.fromQueueId;
		} catch (e) {
			// ignore empty body
		}

		// Fetch queue and songs and combine in JS
		const qRows = await db.select().from(queue).orderBy(queue.baseRank).limit(100);
		const sRows = await db.select().from(songs);
		const sMap = new Map(sRows.map((s) => [s.id, s]));
		let rows = qRows.map((q) => ({ left: q, right: sMap.get(q.songId) || null }));
		rows = rows.filter((r) => r.left.playsRemainingToday > 0 && r.right && r.right.isAvailable === 1);

		if (!rows || rows.length === 0) return json({ ok: false, error: 'No available songs' }, { status: 404 });

		// pick by tier priority, then baseRank
		rows.sort((a, b) => {
			const priority = (t) => (t === 'platinum' ? 3 : t === 'gold' ? 2 : t === 'silver' ? 1 : 0);
			const pa = priority(a.left.tier), pb = priority(b.left.tier);
			if (pa !== pb) return pb - pa;
			return a.left.baseRank - b.left.baseRank;
		});

		const current = rows[0].left;
		const currentSong = rows[0].right;

		// Guard: if client specified a song to skip from, but it's already advanced, just return current
		if (fromQueueId && current.id !== fromQueueId) {
			const playback = getPlaybackState();
			return json({ 
				ok: true, 
				message: 'Already advanced', 
				next: { ...currentSong, ...current, queueId: current.id, songId: current.songId, startedAt: playback.startedAt } 
			});
		}

		const now = Math.floor(Date.now() / 1000);

		// Update queue item: decrement playsRemainingToday, update timestamp
		const newPlays = Math.max(0, current.playsRemainingToday - 1);
		await db.update(queue).set({ playsRemainingToday: newPlays, updatedAt: now }).where(eq(queue.id, current.id));

		// Update songs totalPlays
		const totalPlays = (currentSong.totalPlays || 0) + 1;
		await db.update(songs).set({ totalPlays }).where(eq(songs.id, currentSong.id));

		// Insert queue play log
		await db.insert(queuePlays).values({ id: crypto.randomUUID(), queueId: current.id, tier: current.tier, playedAt: now });

		// Broadcast song ended and queue change; compute fresh afterRows in outer scope
		let afterRows = [];
		try {
			broadcast('song_ended', { songId: current.songId, queueId: current.id, playedAt: now });
			// fresh snapshot
			const qRowsNew = await db.select().from(queue).orderBy(queue.baseRank).limit(100);
			const sRowsNew = await db.select().from(songs);
			const sMapNew = new Map(sRowsNew.map((s) => [s.id, s]));
			afterRows = qRowsNew.map((q) => ({ left: q, right: sMapNew.get(q.songId) || null })).filter((r) => r.left.playsRemainingToday > 0 && r.right && r.right.isAvailable === 1);
			broadcast('queue_changed', { queue: afterRows.map((r) => ({ ...r.left, song: r.right })) });
		} catch (e) {
			console.warn('Failed to broadcast after advancing', e?.message || e);
		}

		if (!afterRows || afterRows.length === 0) return json({ ok: true, message: 'Queue exhausted' });
		afterRows.sort((a, b) => {
			const priority = (t) => (t === 'platinum' ? 3 : t === 'gold' ? 2 : t === 'silver' ? 1 : 0);
			const pa = priority(a.left.tier), pb = priority(b.left.tier);
			if (pa !== pb) return pb - pa;
			return a.left.baseRank - b.left.baseRank;
		});

		const next = { 
			...afterRows[0].right, 
			...afterRows[0].left, 
			queueId: afterRows[0].left.id, 
			songId: afterRows[0].right.id 
		};
		try {
			broadcast('song_playing', { songId: next.songId, queueId: next.queueId, startedAt: now });
		} catch (e) {
			console.warn('Failed to broadcast song_playing', e?.message || e);
		}
		return json({ ok: true, played: { queueId: current.id, songId: current.songId }, next: { ...next, startedAt: now } });
	} catch (err) {
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}