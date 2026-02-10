import { connectRealtime } from '$lib/client/realtime.js';

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
 * @property {number} [duration]
 * @property {number} [startedAt]
 * @property {number} [lastPlayedTurn]
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
 *   toasts: Toast[],
 *   currentTurn: number,
 *   clientCount: number
 * }}
 */
export const playerState = $state({
	queue: [],
	currentSong: null,
	previousSong: null,
	toasts: [],
	currentTurn: 0,
	clientCount: 1
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
		duration: left.duration ?? song?.duration ?? 0,
		startedAt: left.startedAt ?? item.startedAt ?? null,
		lastPlayedTurn: left.lastPlayedTurn ?? 0,
		song: song
	};
	
	if (!normalized.queueId) normalized.queueId = normalized.songId;
	
	// @ts-ignore
	return normalized;
}

/**
 * Filter out current song and items with no plays left
 * @param {any[]} items
 * @param {Song | null} current
 * @returns {Song[]}
 */
export function filterQueue(items, current) {
	const currentQueueId = current?.queueId ?? current?.id;
	
	const filtered = items
		.map(it => normalizeQueueItem(it))
		.filter(it => {
			if (!it) return false;
			if (it.playsRemainingToday <= 0) return false;
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
		
		/** @type {Song | null} */
		let current = null;
		if (cRes.ok) {
			const data = await cRes.json();
			if (data.ok && data.current) {
				current = normalizeQueueItem(data.current);
				if (current) {
					const currentId = playerState.currentSong?.queueId || playerState.currentSong?.id;
					const newId = current.queueId || current.id;
					
					// Update if ID changed OR if we got a new startedAt
					if (currentId !== newId || current.startedAt !== playerState.currentSong?.startedAt) {
						console.debug('[Store] Updating currentSong', { currentId, newId, startedAt: current.startedAt });
						playerState.currentSong = current;
					}
				}
			} else if (data.ok && !data.current) {
				playerState.currentSong = null;
			}
		}
		
		if (qRes.ok) {
			const data = await qRes.json();
			if (data.ok && data.queue) {
				playerState.currentTurn = data.currentTurn || 0;
				playerState.queue = filterQueue(data.queue, playerState.currentSong);
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
let syncInterval = null;
let currentSyncInterval = null;

export async function initRealtime() {
	if (initialized) return;
	initialized = true;
	
	refreshQueue();

	try {
		const ws = connectRealtime();
		refreshQueue();

		ws.on('queue_changed', (payload) => {
			if (payload?.queue) {
				playerState.currentTurn = payload.currentTurn || 0;
				playerState.queue = filterQueue(payload.queue, playerState.currentSong);
			}
		});

		ws.on('presence_count', (count) => {
			if (typeof count === 'number') {
				playerState.clientCount = count;
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
							addToast({ message: `Queued: ${added.title}`, level: 'success' });
						}
					}
					
					if (!playerState.currentSong) {
						refreshQueue();
					}
				});
		});
		
		ws.on('song_playing', (payload) => {
			console.debug('[RT] song_playing received', payload);
			const currentId = playerState.currentSong?.queueId || playerState.currentSong?.id;
			if (currentId !== payload.queueId) {
				playerState.previousSong = playerState.currentSong;
				if (payload?.song) {
					playerState.currentSong = normalizeQueueItem(payload.song);
					refreshQueue();
				} else {
					refreshQueue();
				}
			} else {
				// Just update startedAt if same song
				if (playerState.currentSong) {
					playerState.currentSong.startedAt = payload.startedAt;
				}
			}
		});
		
		ws.on('song_ended', (payload) => {
			playerState.previousSong = playerState.currentSong;
			playerState.currentSong = null;
			refreshQueue();
		});

	} catch (e) {
		console.warn('[Store] Realtime initialization failed:', e);
	}

	// Periodic sync to keep clients aligned (handles missed realtime events)
	if (!syncInterval) {
		syncInterval = setInterval(() => {
			refreshQueue();
		}, 5000);
	}
	// Frequent current-song sync to keep playback time aligned
	if (!currentSyncInterval) {
		currentSyncInterval = setInterval(async () => {
			try {
				const res = await fetch('/api/queue/current');
				if (!res.ok) return;
				const data = await res.json();
				if (data.ok && data.current) {
					const current = normalizeQueueItem(data.current);
					const currentId = playerState.currentSong?.queueId || playerState.currentSong?.id;
					const newId = current?.queueId || current?.id;
					if (currentId !== newId || current.startedAt !== playerState.currentSong?.startedAt) {
						playerState.currentSong = current;
					}
				}
			} catch (e) {
				// ignore
			}
		}, 1000);
	}

	// Sync when tab regains focus
	if (typeof window !== 'undefined') {
		window.addEventListener('focus', refreshQueue);
	}
}
