import { json } from '@sveltejs/kit';
import { getQueue } from '$lib/server/services/queue.js';
import { getPlaybackState, broadcast } from '$lib/server/ws.js';

export async function GET() {
	try {
		const rows = await getQueue();
		
		if (!rows || rows.length === 0) {
			return json({ ok: true, current: null });
		}

		const top = rows[0];
		let playback = getPlaybackState();
		
		// If no song is recorded as playing, or it's a different song than the top of queue
		// we "start" this one now. 
		// Note: this is a bit aggressive but ensures sync for the first person joining an idle system.
		if (!playback.currentQueueId || playback.currentQueueId !== top.id) {
			const now = Math.floor(Date.now() / 1000);
			broadcast('song_playing', { 
				songId: top.song.id, 
				queueId: top.id, 
				startedAt: now 
			});
			playback = getPlaybackState(); // get updated state
		}
		
		const current = { 
			...top.song, 
			...top, 
			queueId: top.id, 
			songId: top.song.id,
			startedAt: playback.startedAt
		};
		
		return json({ ok: true, current });
	} catch (err) {
		console.error(err);
		return json({ ok: false, error: 'DB error', details: err?.message || String(err) }, { status: 500 });
	}
}
