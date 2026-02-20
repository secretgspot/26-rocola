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
 *   initializing: boolean,
 *   initLogs: { id: string, ts: number, message: string, level: 'info'|'ok'|'warn'|'error' }[],
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
 *   },
 *   lastEventSeq: number
 * }}
 */
export const playerState = $state({
	queue: [],
	currentSong: null,
	previousSong: null,
	initializing: true,
	initLogs: [],
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
	},
	lastEventSeq: 0
});

function pushInitLog(message, level = 'info') {
	const entry = {
		id: crypto.randomUUID(),
		ts: Date.now(),
		message,
		level: /** @type {'info'|'ok'|'warn'|'error'} */ (level)
	};
	playerState.initLogs = [...playerState.initLogs, entry].slice(-18);
	if (playerState.initializing) {
		const toastLevel =
			level === 'error' ? 'error' : level === 'warn' ? 'plain' : level === 'ok' ? 'success' : 'plain';
		const id = crypto.randomUUID();
		playerState.toasts = [{ id, message: `INIT: ${message}`, level: toastLevel }, ...playerState.toasts].slice(
			0,
			8
		);
		setTimeout(() => {
			playerState.toasts = playerState.toasts.filter((x) => x.id !== id);
		}, 1400);
	}
}

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

export async function refreshQueue(options = {}) {
	const logInit = options?.logInit === true;
	if (refreshInFlight) return refreshInFlight;
	refreshInFlight = (async () => {
	try {
		if (logInit) pushInitLog('REQUEST /api/queue + /api/queue/current');
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
				if (logInit) {
					pushInitLog(
						data.ok && data.current ? 'CURRENT_TRACK RESOLVED' : 'CURRENT_TRACK EMPTY',
						'ok'
					);
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
		} else if (logInit) {
			pushInitLog(`CURRENT_TRACK FAILED (${cRes.status})`, 'warn');
		}
		
		if (qRes.ok) {
			const data = await qRes.json();
			if (data.ok && data.queue) {
				playerState.currentTurn = data.currentTurn || 0;
				playerState.queue = filterQueue(data.queue, playerState.currentSong);
				if (logInit) pushInitLog(`QUEUE READY (${playerState.queue.length})`, 'ok');
				saveBootCache();
			}
		} else if (logInit) {
			pushInitLog(`QUEUE FAILED (${qRes.status})`, 'warn');
		}
	} catch (err) {
		console.error('[Store] Refresh error:', err);
		if (logInit) pushInitLog('QUEUE SYNC ERROR', 'error');
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
let cachedReactionClientId = null;
const BOOT_CACHE_KEY = 'rocola-boot-cache-v1';
const BOOT_READY_KEY = 'rocola-boot-ready-v1';
const BOOT_CACHE_MAX_AGE_MS = 45_000;
const DEFAULT_DURATION_FALLBACK_MS = 20_000;

function saveBootCache() {
	if (typeof window === 'undefined') return;
	try {
		const payload = {
			ts: Date.now(),
			currentSong: playerState.currentSong || null,
			queue: playerState.queue || [],
			currentTurn: playerState.currentTurn || 0
		};
		window.sessionStorage.setItem(BOOT_CACHE_KEY, JSON.stringify(payload));
		window.sessionStorage.setItem(BOOT_READY_KEY, '1');
	} catch {
		// ignore
	}
}

function hydrateBootCache() {
	if (typeof window === 'undefined') return false;
	try {
		const raw = window.sessionStorage.getItem(BOOT_CACHE_KEY);
		if (!raw) return false;
		const data = JSON.parse(raw);
		if (!data || typeof data !== 'object') return false;
		const ageMs = Date.now() - Number(data.ts || 0);
		if (!Number.isFinite(ageMs) || ageMs > BOOT_CACHE_MAX_AGE_MS) return false;

		if (data.currentSong) {
			const cachedCurrent = normalizeQueueItem(data.currentSong);
			const startedAtMs = Number(cachedCurrent?.startedAtMs || 0);
			const durationSec = Number(cachedCurrent?.duration || 0);
			const maxTrackAgeMs =
				durationSec > 0 ? durationSec * 1000 + 4_000 : DEFAULT_DURATION_FALLBACK_MS;
			const trackAgeMs = startedAtMs > 0 ? Date.now() - startedAtMs : Number.POSITIVE_INFINITY;
			const looksFresh = Number.isFinite(trackAgeMs) && trackAgeMs >= 0 && trackAgeMs <= maxTrackAgeMs;
			if (cachedCurrent && looksFresh) {
				playerState.currentSong = cachedCurrent;
			}
		}
		if (Array.isArray(data.queue)) {
			playerState.queue = data.queue.map((q) => normalizeQueueItem(q)).filter(Boolean);
		}
		playerState.currentTurn = Number(data.currentTurn || 0);
		return Boolean(playerState.currentSong || playerState.queue.length > 0);
	} catch {
		return false;
	}
}

export function getReactionClientId() {
	if (cachedReactionClientId) return cachedReactionClientId;
	if (typeof window === 'undefined') return 'server';
	const key = 'rocola-reaction-client-id';
	const existing = window.sessionStorage.getItem(key);
	if (existing) {
		cachedReactionClientId = existing;
		return existing;
	}
	const id = crypto.randomUUID();
	window.sessionStorage.setItem(key, id);
	cachedReactionClientId = id;
	return id;
}

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
	const localClientId = getReactionClientId();
	const isRemoteTap =
		typeof payload?.clientId === 'string' && payload.clientId !== localClientId;
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
		particles: payload.particles || makeParticles(payload.count || 1),
		fromBehind: isRemoteTap
	};
	playerState.starBursts = [...playerState.starBursts, burst].slice(-24);
	setTimeout(() => {
		playerState.starBursts = playerState.starBursts.filter((b) => b.id !== id);
	}, 1800);
}

export async function initRealtime() {
	if (initialized) return;
	initialized = true;
	playerState.initializing = true;
	playerState.initLogs = [];
	const hadPriorBoot =
		typeof window !== 'undefined' && window.sessionStorage.getItem(BOOT_READY_KEY) === '1';
	const resumed = hydrateBootCache();
	if (hadPriorBoot && resumed) {
		pushInitLog('FAST RESUME', 'ok');
		await refreshQueue({ logInit: false });
	} else {
		pushInitLog('BOOT START');
		await refreshQueue({ logInit: true });
	}

	try {
		if (!hadPriorBoot) pushInitLog('REALTIME AUTH/TOKEN');
		const ws = connectRealtime();
		if (!hadPriorBoot) pushInitLog('REALTIME CHANNEL SUBSCRIBE');
		await refreshQueue({ logInit: !hadPriorBoot });

		let sawRealtimeState = false;
		const startupRealtimeReady = new Promise((resolve) => {
			const timer = setTimeout(() => resolve(false), 1500);
			ws.on('connection_state', (state) => {
				if (typeof state === 'string') {
					playerState.connectionState = state;
					if (!sawRealtimeState && (state === 'connected' || state === 'connecting')) {
						sawRealtimeState = true;
						clearTimeout(timer);
						resolve(true);
					}
					if (!sawRealtimeState && (state === 'failed' || state === 'suspended')) {
						sawRealtimeState = true;
						clearTimeout(timer);
						resolve(false);
					}
				}
			});
		});

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
			const seq = Number(payload?.seq || 0);
			if (seq && seq < (playerState.lastEventSeq || 0)) return;
			if (seq) playerState.lastEventSeq = seq;
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

		const ready = await startupRealtimeReady;
		pushInitLog(ready ? 'REALTIME READY' : 'REALTIME DEGRADED', ready ? 'ok' : 'warn');

	} catch (e) {
		console.warn('[Store] Realtime initialization failed:', e);
		pushInitLog('REALTIME INIT ERROR', 'error');
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
	pushInitLog(hadPriorBoot ? 'RESUME COMPLETE' : 'BOOT COMPLETE', 'ok');
	playerState.initializing = false;
}
