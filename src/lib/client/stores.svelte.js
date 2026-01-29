import { connectWebSocket } from '$lib/client/websocket.js';

/**
 * @typedef {Object} Song
 * @property {string} id
 * @property {string} queueId
 * @property {string} songId
 * @property {string} videoId
 * @property {string} title
 * @property {string} channelTitle
 * @property {string} thumbnail
 * @property {number} playsRemainingToday
 * @property {string} tier
 */

/**
 * @typedef {Object} Toast
 * @property {string} id
 * @property {string} message
 * @property {string} level
 */

/**
 * @type {{
 *   queue: Song[],
 *   currentSong: Song | null,
 *   previousSong: Song | null,
 *   toasts: Toast[]
 * }}
 */
export const playerState = $state({
	queue: [],
	currentSong: null,
	previousSong: null,
	toasts: []
});

/**
 * Normalizes a queue item from various potential shapes (flat, {left,right}, {song})
 * @param {any} item
 * @returns {Song | null}
 */
export function normalizeQueueItem(item) {
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
		thumbnail: left.thumbnail ?? song?.thumbnail ?? '',
		playsRemainingToday: left.playsRemainingToday ?? 1,
		tier: left.tier ?? 'free',
		song: song
	};
	
	// Fallback for ID if queueId is missing
	if (!normalized.queueId) normalized.queueId = normalized.songId;
	
	// @ts-ignore
	return normalized;
}

/**
 * Filter out current song and items with no plays left
 * @param {any[]} items
 * @param {any} current
 */
export function filterQueue(items, current) {
	const currentQueueId = current?.queueId ?? current?.id;
	
	const filtered = items
		.map(it => normalizeQueueItem(it))
		.filter(it => {
			if (!it) return false;
			// Must have plays left
			if (it.playsRemainingToday <= 0) return false;
			// Must not be the currently playing queue entry
			if (currentQueueId && it.queueId === currentQueueId) return false;
			return true;
		});
		
	// @ts-ignore
	return filtered;
}

export async function refreshQueue() {
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
				playerState.currentSong = current;
			}
		}
		
		if (qRes.ok) {
			const data = await qRes.json();
			if (data.ok && data.queue) {
				playerState.queue = filterQueue(data.queue, current);
			}
		}
	} catch (err) {
		console.error('[Store] Refresh error:', err);
	}
}

/**
 * @param {{message: string, level?: string, ttl?: number}} param0
 */
export function addToast({ message, level = 'info', ttl = 3500 }) {
	const id = crypto.randomUUID();
	const t = { id, message, level };
	playerState.toasts = [t, ...playerState.toasts];
	setTimeout(() => {
		playerState.toasts = playerState.toasts.filter((x) => x.id !== id);
	}, ttl);
	return id;
}

let initialized = false;

export async function initRealtime() {
	if (initialized) return;
	initialized = true;
	
	refreshQueue();

	try {
		const ws = connectWebSocket();
		
		ws.on('queue_changed', (payload) => {
			if (payload?.queue) {
				playerState.queue = filterQueue(payload.queue, playerState.currentSong);
			}
		});
		
		ws.on('song_added', (payload) => {
			fetch('/api/queue')
				.then(r => r.json())
				.then(data => {
					if (data.ok && data.queue) {
						const items = data.queue.map(normalizeQueueItem);
						playerState.queue = filterQueue(items, playerState.currentSong);
						
						const added = items.find(it => it && (it.queueId === payload.id || it.songId === payload.songId));
						if (added) {
							addToast({ 
								message: `Queued: ${added.title}`, 
								level: 'success' 
							});
						}
					}
					
					if (!playerState.currentSong) {
						fetch('/api/queue/current')
							.then(r => r.json())
							.then(cd => {
								if (cd.ok && cd.current) playerState.currentSong = cd.current;
							});
					}
				});
		});
		
		ws.on('song_playing', (payload) => {
			playerState.previousSong = playerState.currentSong;
			
			fetch('/api/queue/current')
				.then(r => r.json())
				.then(data => {
					if (data.ok && data.current) {
						playerState.currentSong = data.current;
						fetch('/api/queue')
							.then(r => r.json())
							.then(qdata => {
								if (qdata.ok) playerState.queue = filterQueue(qdata.queue, data.current);
							});
					}
				});
		});
		
		ws.on('song_ended', (payload) => {
			playerState.previousSong = playerState.currentSong;
			playerState.currentSong = null;
		});

	} catch (e) {
		console.warn('[Store] WS initialization failed:', e);
	}
}