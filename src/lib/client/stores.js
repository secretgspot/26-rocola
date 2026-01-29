import { writable, get } from 'svelte/store';
import { connectWebSocket } from '$lib/client/websocket.js';

export const queue = writable([]);
export const currentSong = writable(null);
export const previousSong = writable(null);
export const toasts = writable([]);

/**
 * Normalizes a queue item from various potential shapes (flat, {left,right}, {song})
 */
function normalizeQueueItem(item) {
	if (!item) return null;
	const left = item.left ?? item;
	const song = item.song ?? item.right ?? item.song ?? null;
	
	const normalized = {
		id: left.id ?? item.queueId ?? left.songId ?? song?.id,
		queueId: left.id ?? item.queueId,
		songId: left.songId ?? song?.id,
		videoId: left.videoId ?? song?.videoId,
		title: left.title ?? song?.title ?? 'Untitled',
		channelTitle: left.channelTitle ?? song?.channelTitle ?? 'Unknown Channel',
		playsRemainingToday: left.playsRemainingToday ?? 1,
		tier: left.tier ?? 'free',
		song: song
	};
	
	// Fallback for ID if queueId is missing
	if (!normalized.queueId) normalized.queueId = normalized.songId;
	
	return normalized;
}

/**
 * Filter out current song and items with no plays left
 */
function filterQueue(items, current) {
	const currentQueueId = current?.queueId ?? current?.id;
	
	const filtered = items
		.map(it => normalizeQueueItem(it))
		.filter(it => {
			// Must have plays left
			if (it.playsRemainingToday <= 0) return false;
			// Must not be the currently playing queue entry
			if (currentQueueId && it.queueId === currentQueueId) return false;
			return true;
		});
		
	console.debug('[Store] Filtered queue:', { 
		total: items.length, 
		visible: filtered.length, 
		currentQueueId 
	});
	
	return filtered;
}

export function addToast({ message, level = 'info', ttl = 3500 }) {
	const id = crypto.randomUUID();
	const t = { id, message, level };
	toasts.update((a) => [t, ...a]);
	setTimeout(() => toasts.update((a) => a.filter((x) => x.id !== id)), ttl);
	return id;
}

export async function initRealtime() {
	console.info('[Store] Initializing realtime...');
	
	// Initial Fetch
	try {
		const [qRes, cRes] = await Promise.all([
			fetch('/api/queue'),
			fetch('/api/queue/current')
		]);
		
		let current = null;
		if (cRes.ok) {
			const data = await cRes.json();
			if (data.ok && data.current) {
				current = data.current;
				currentSong.set(current);
			}
		}
		
		if (qRes.ok) {
			const data = await qRes.json();
			if (data.ok && data.queue) {
				queue.set(filterQueue(data.queue, current));
			}
		}
	} catch (err) {
		console.error('[Store] Initial fetch error:', err);
	}

	// WebSocket setup
	try {
		const ws = connectWebSocket();
		
		ws.on('queue_changed', (payload) => {
			console.debug('[WS] queue_changed received');
			if (payload?.queue) {
				queue.set(filterQueue(payload.queue, get(currentSong)));
			}
		});
		
		ws.on('song_added', (payload) => {
			console.debug('[WS] song_added received', payload);
			// Refresh queue data
			fetch('/api/queue')
				.then(r => r.json())
				.then(data => {
					if (data.ok && data.queue) {
						const items = data.queue.map(normalizeQueueItem);
						queue.set(filterQueue(items, get(currentSong)));
						
						const added = items.find(it => it.queueId === payload.id || it.songId === payload.songId);
						addToast({ 
							message: added ? `Queued: ${added.title}` : 'Song added to queue', 
							level: 'success' 
						});
					}
					
					// If idle, auto-play
					if (!get(currentSong)) {
						console.info('[Store] Idle, fetching current after song_added');
						fetch('/api/queue/current')
							.then(r => r.json())
							.then(cd => {
								if (cd.ok && cd.current) currentSong.set(cd.current);
							});
					}
				});
		});
		
		ws.on('song_playing', (payload) => {
			console.debug('[WS] song_playing received', payload);
			previousSong.set(get(currentSong));
			
			fetch('/api/queue/current')
				.then(r => r.json())
				.then(data => {
					if (data.ok && data.current) {
						currentSong.set(data.current);
						// Re-fetch queue to ensure correctly filtered state
						fetch('/api/queue')
							.then(r => r.json())
							.then(qdata => {
								if (qdata.ok) queue.set(filterQueue(qdata.queue, data.current));
							});
					}
				});
		});
		
		ws.on('song_ended', (payload) => {
			console.debug('[WS] song_ended received', payload);
			previousSong.set(get(currentSong));
			currentSong.set(null);
		});

	} catch (e) {
		console.warn('[Store] WS initialization failed:', e);
	}
}