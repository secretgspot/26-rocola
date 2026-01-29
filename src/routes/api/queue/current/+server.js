import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db/index.js';
import { queue, songs } from '$lib/server/db/schema.js';
import { getPlaybackState, broadcast } from '$lib/server/ws.js';

export async function GET() {
	try {
		const qRows = await db.select().from(queue).orderBy(queue.baseRank).limit(100);
		const sRows = await db.select().from(songs);
		const sMap = new Map(sRows.map((s) => [s.id, s]));
		let rows = qRows.map((q) => ({ left: q, right: sMap.get(q.songId) || null }));
		rows = rows.filter((r) => r.left.playsRemainingToday > 0 && r.right && r.right.isAvailable === 1);
		
		if (!rows || rows.length === 0) {
			return json({ ok: true, current: null });
		}

		rows.sort((a, b) => {
			const priority = (t) => (t === 'platinum' ? 3 : t === 'gold' ? 2 : t === 'silver' ? 1 : 0);
			const pa = priority(a.left.tier), pb = priority(b.left.tier);
			if (pa !== pb) return pb - pa;
			return a.left.baseRank - b.left.baseRank;
		});

		const top = rows[0];
		let playback = getPlaybackState();
		
		// If no song is recorded as playing, or it's a different song than the top of queue
		// we "start" this one now. 
		// Note: this is a bit aggressive but ensures sync for the first person joining an idle system.
		if (!playback.currentQueueId || playback.currentQueueId !== top.left.id) {
			const now = Math.floor(Date.now() / 1000);
			broadcast('song_playing', { 
				songId: top.right.id, 
				queueId: top.left.id, 
				startedAt: now 
			});
			playback = getPlaybackState(); // get updated state
		}
		
		const current = { 
			...top.right, 
			...top.left, 
			queueId: top.left.id, 
			songId: top.right.id,
			startedAt: playback.startedAt
		};
		
		return json({ ok: true, current });
	} catch (err) {
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}
