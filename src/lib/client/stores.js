import { writable, get } from 'svelte/store';
import { connectWebSocket } from '$lib/client/websocket.js';

export const queue = writable([]);
export const currentSong = writable(null);
export const previousSong = writable(null);
export const toasts = writable([]);
export const devSeeded = writable(false); // dev-only flag: when true we show the dev-seeded queue

function normalizeQueueItem(item) {
	const song = item.song || item.right || item.song || null;
	return {
		id: item.id ?? item.left?.id ?? item.songId ?? item.song?.id,
		title: item.title ?? song?.title ?? item.left?.title ?? 'Untitled',
		channelTitle: item.channelTitle ?? song?.channelTitle ?? 'Unknown channel',
		playsRemainingToday: item.playsRemainingToday ?? song?.playsRemainingToday ?? undefined,
		tierName: item.tierName ?? song?.tierName,
		videoId: item.videoId ?? song?.videoId ?? song?.videoId,
		song: song
	};
}

/**
 * Add a toast notification
 * @param {{message:string,level?:string,ttl?:number}} opts
 */
export function addToast({ message, level = 'info', ttl = 3500 }) {
	const id = crypto.randomUUID();
	const t = { id, message, level };
	toasts.update((a) => [t, ...a]);
	setTimeout(() => toasts.update((a) => a.filter((x) => x.id !== id)), ttl);
	return id;
}

function filterOutCurrentItems(items, current) {
	// Exclude played/unavailable songs and the current song
	const currentSongId = current ? (current.songId ?? current.id ?? current.videoId) : null;
	return items
		.filter((it) => {
			const playsLeft = it.playsRemainingToday ?? it.song?.playsRemainingToday ?? 1;
			const available = (it.song?.isAvailable ?? 1) === 1;
			return playsLeft > 0 && available;
		})
		.filter((it) => (currentSongId ? (it.song?.id ?? it.songId ?? it.id) !== currentSongId : true));
}

/**
 * Initialize realtime subscriptions and initial fetch
 */
export async function initRealtime() {
	try {
		const [qRes, currentRes] = await Promise.all([fetch('/api/queue'), fetch('/api/queue/current')]);
		let current = null;
		if (currentRes.ok) {
			const data = await currentRes.json();
			if (data.ok) current = data.current || null;
		}
		if (qRes.ok) {
			const data = await qRes.json();
			const items = (data.queue || []).map((r) => normalizeQueueItem({ ...r.left, song: r.right }));
			// in dev, keep the UI queue empty until developer explicitly seeds
			if (import.meta.env.DEV && !get(devSeeded)) {
				queue.set([]);
			} else {
				queue.set(filterOutCurrentItems(items, current));
			}
		}
		if (current) currentSong.set(current);
	} catch (err) {
		console.warn('Initial fetch failed', err);
	}

	// connect websocket
	try {
		const ws = connectWebSocket();
		ws.on('queue_changed', (payload) => {
			if (payload?.queue) {
				const items = payload.queue.map((r) => normalizeQueueItem(r));
				// ignore server queue snapshots in dev until the user seeds
				if (import.meta.env.DEV && !get(devSeeded)) {
					queue.set([]);
					return;
				}
				queue.set(filterOutCurrentItems(items, get(currentSong)));
			}
		});
		ws.on('song_added', (payload) => {
			// refresh queue and show a contextual toast with title when possible
			fetch('/api/queue')
				.then((r) => r.json())
				.then((d) => {
					const items = (d.queue || []).map((r) => normalizeQueueItem({ ...r.left, song: r.right }));
					// ignore server queue updates in dev until seeded
					if (import.meta.env.DEV && !get(devSeeded)) {
						queue.set([]);
					} else {
						queue.set(filterOutCurrentItems(items, get(currentSong)));
					}
					// find added item by id or songId
					let found = null;
					if (payload?.id) found = items.find((it) => it.id === payload.id || it.song?.id === payload.id);
					if (!found && payload?.songId) found = items.find((it) => it.song?.id === payload.songId || it.id === payload.songId);
					if (found) addToast({ message: `Queued: ${found.title}`, level: 'success' });
					else addToast({ message: 'Song added to queue', level: 'success' });
				});
		});
		ws.on('song_playing', (payload) => {
			// move current to previous and refresh current
			previousSong.set(get(currentSong));
			if (payload?.songId) {
				fetch('/api/queue/current')
					.then((r) => r.json())
					.then((d) => {
						const newCurrent = d.current || null;
						currentSong.set(newCurrent);
						// refresh queue to exclude the new current
						fetch('/api/queue').then((r) => r.json()).then((d) => {
							const items = (d.queue || []).map((r) => normalizeQueueItem({ ...r.left, song: r.right }));
							queue.set(filterOutCurrentItems(items, newCurrent));
						});
				});
				addToast({ message: 'Now playing', level: 'info' });
			}
		});
		ws.on('song_ended', (payload) => {
			previousSong.set(get(currentSong));
			currentSong.set(null);
			addToast({ message: 'Song ended', level: 'info' });
			// queue refreshed via queue_changed event usually
		});
		ws.on('test_event', (payload) => {
			console.log('WS test_event', payload);
			addToast({ message: 'WS test event', level: 'info' });
		});
	} catch (e) {
		console.warn('WS init failed', e);
	}
}
