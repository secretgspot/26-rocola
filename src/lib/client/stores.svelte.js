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
 * @property {number} [startedAtMs]
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
 *   starBursts: any[],
 *   currentTurn: number,
 *   clientCount: number,
 *   clockOffsetSec: number,
 *   connectionState: string,
 *   syncStats: {
 *     driftP50Ms: number,
 *     driftP95Ms: number,
 *     sampleCount: number,
 *     microSyncCount: number,
 *     hardSyncCount: number,
 *     transitionCount: number,
 *     lastTransitionLatencyMs: number
 *   }
 * }}
 */
export const playerState = $state({
	queue: [],
	currentSong: null,
	previousSong: null,
	toasts: [],
	starBursts: [],
	currentTurn: 0,
	clientCount: 1,
	clockOffsetSec: 0,
	connectionState: 'connecting',
	syncStats: {
		driftP50Ms: 0,
		driftP95Ms: 0,
		sampleCount: 0,
		microSyncCount: 0,
		hardSyncCount: 0,
		transitionCount: 0,
		lastTransitionLatencyMs: 0
	}
});

/**
 * Smooth server clock offset updates to avoid jitter-induced seek corrections.
 * @param {number} serverNowMs
 */
function updateClockOffset(serverNowMs) {
	const sample = serverNowMs / 1000 - Date.now() / 1000;
	if (!Number.isFinite(sample)) return;
	const prev = playerState.clockOffsetSec || 0;
	// Bootstrap quickly, then smooth while remaining responsive to drift changes.
	playerState.clockOffsetSec = prev === 0 ? sample : prev * 0.75 + sample * 0.25;
}

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
		startedAtMs:
			left.startedAtMs ?? item.startedAtMs ??
			(typeof (left.startedAt ?? item.startedAt) === 'number' ? (left.startedAt ?? item.startedAt) * 1000 : null),
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
	if (refreshInFlight) return refreshInFlight;
	refreshInFlight = (async () => {
	try {
		const [qRes, cRes] = await Promise.all([
			fetch('/api/queue'),
			fetch('/api/queue/current')
		]);
		
		/** @type {Song | null} */
		let current = null;
			if (cRes.ok) {
				const data = await cRes.json();
				if (data.serverNowMs) {
					updateClockOffset(data.serverNowMs);
				}
			if (data.ok && data.current) {
				current = normalizeQueueItem(data.current);
				if (current) {
					const currentId = playerState.currentSong?.queueId || playerState.currentSong?.id;
					const newId = current.queueId || current.id;
					
					// Update if ID changed OR if we got a new startedAt
					if (
						currentId !== newId ||
						current.startedAtMs !== playerState.currentSong?.startedAtMs ||
						current.startedAt !== playerState.currentSong?.startedAt
					) {
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
	})().finally(() => {
		refreshInFlight = null;
	});
	return refreshInFlight;
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
let refreshInFlight = null;
let refreshTimer = null;

function scheduleRefresh(delayMs = 80) {
	if (refreshTimer) clearTimeout(refreshTimer);
	refreshTimer = setTimeout(() => {
		refreshTimer = null;
		refreshQueue();
	}, delayMs);
}

function makeParticles(count = 1) {
	const size = Math.max(1, Math.min(6, count));
	return Array.from({ length: size }).map(() => ({
		dx: -12 + Math.random() * 24,
		dy: -(90 + Math.random() * 60),
		delay: 0,
		dur: 760 + Math.round(Math.random() * 260),
		scale: 0.95 + Math.random() * 0.25,
		rot: -8 + Math.random() * 16,
		size: 44 + Math.round(Math.random() * 8)
	}));
}

function resolveLocalStarAnchor() {
	if (typeof document === 'undefined' || typeof window === 'undefined') return null;
	const button = document.querySelector('.fab-star:not(.hidden)');
	const rect = button?.getBoundingClientRect?.();
	if (!rect) return null;
	return {
		x: (rect.left + rect.width / 2) / window.innerWidth,
		y: (rect.top + rect.height / 2) / window.innerHeight
	};
}

export function addStarBurst(payload = {}) {
	const id = crypto.randomUUID();
	const localAnchor = payload?.source === 'star_button' ? resolveLocalStarAnchor() : null;
	const burst = {
		id,
		x:
			typeof localAnchor?.x === 'number'
				? localAnchor.x
				: typeof payload.x === 'number'
					? payload.x
					: 0.82,
		y:
			typeof localAnchor?.y === 'number'
				? localAnchor.y
				: typeof payload.y === 'number'
					? payload.y
					: 0.76,
		particles: payload.particles || makeParticles(payload.count || 1)
	};
	playerState.starBursts = [...playerState.starBursts, burst].slice(-24);
	setTimeout(() => {
		playerState.starBursts = playerState.starBursts.filter((b) => b.id !== id);
	}, 1800);
}

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
			} else {
				scheduleRefresh(80);
			}
		});

		ws.on('presence_count', (count) => {
			if (typeof count === 'number') {
				playerState.clientCount = count;
			}
		});

		ws.on('connection_state', (state) => {
			if (typeof state === 'string') {
				playerState.connectionState = state;
			}
		});
		
		ws.on('song_added', (payload) => {
			if (payload?.title) {
				addToast({ message: payload.title, level: 'queued' });
			}
			scheduleRefresh(playerState.currentSong ? 80 : 0);
		});
		
		ws.on('song_playing', (payload) => {
			console.debug('[RT] song_playing received', payload);
			if (payload?.serverNowMs) {
				updateClockOffset(payload.serverNowMs);
			}
			const currentId = playerState.currentSong?.queueId || playerState.currentSong?.id;
			if (currentId !== payload.queueId) {
				playerState.previousSong = playerState.currentSong;
				if (payload?.song) {
					playerState.currentSong = normalizeQueueItem(payload.song);
					scheduleRefresh(50);
				} else {
					scheduleRefresh(50);
				}
			} else {
				// Just update startedAt if same song
				if (playerState.currentSong) {
					playerState.currentSong.startedAt = payload.startedAt;
					playerState.currentSong.startedAtMs =
						payload.startedAtMs ??
						(typeof payload.startedAt === 'number' ? payload.startedAt * 1000 : playerState.currentSong.startedAtMs);
				}
			}
		});
		
		ws.on('song_ended', (payload) => {
			playerState.previousSong = playerState.currentSong;
			// Avoid forcing null between tracks; wait for song_playing/refresh to prevent reload flicker.
			scheduleRefresh(50);
		});

		ws.on('star_burst', (payload) => {
			addStarBurst(payload || {});
		});

	} catch (e) {
		console.warn('[Store] Realtime initialization failed:', e);
	}

	// Periodic sync to keep clients aligned (handles missed realtime events)
	if (!syncInterval) {
		syncInterval = setInterval(() => {
			if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
			refreshQueue();
		}, 5000);
	}
	// Frequent current-song sync to keep playback time aligned
	if (!currentSyncInterval) {
		currentSyncInterval = setInterval(async () => {
			if (!playerState.currentSong) return;
			if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
			try {
				const res = await fetch('/api/queue/current');
				if (!res.ok) return;
				const data = await res.json();
				if (data.serverNowMs) {
					updateClockOffset(data.serverNowMs);
				}
				if (data.ok && data.current) {
					const current = normalizeQueueItem(data.current);
					const currentId = playerState.currentSong?.queueId || playerState.currentSong?.id;
					const newId = current?.queueId || current?.id;
					if (
						currentId !== newId ||
						current.startedAtMs !== playerState.currentSong?.startedAtMs ||
						current.startedAt !== playerState.currentSong?.startedAt
					) {
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
		window.addEventListener('focus', () => scheduleRefresh(0));
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'visible') scheduleRefresh(0);
		});
	}
}
