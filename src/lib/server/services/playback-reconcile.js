import { broadcast } from '$lib/server/realtime.js';
import { getPlaybackState, setPlaybackState } from '$lib/server/services/playback.js';
import { getGlobalTurn, getQueue } from '$lib/server/services/queue.js';

const STALE_GRACE_MS = 1500;
const DEFAULT_DURATION_MS = 20_000;

/**
 * @param {{ currentQueueId: string | null, startedAtMs: number | null }} playback
 * @param {{ id: string, duration?: number, song?: { duration?: number } } | null} target
 */
function needsReanchor(playback, target) {
	if (!target) return Boolean(playback.currentQueueId);
	if (playback.currentQueueId !== target.id) return true;
	const startedAtMs = Number(playback.startedAtMs || 0);
	if (!startedAtMs) return true;
	const now = Date.now();
	const elapsedMs = now - startedAtMs;
	if (elapsedMs < 0) return true;
	const durationSec = Number(target.song?.duration || target.duration || 0);
	const budgetMs = durationSec > 0 ? durationSec * 1000 + STALE_GRACE_MS : DEFAULT_DURATION_MS;
	return elapsedMs > budgetMs;
}

/**
 * Heals playback pointer/start-time if it drifts from queue truth.
 * Returns whether state was changed.
 * @param {{ reason?: string }} [opts]
 */
export async function reconcilePlaybackState(opts = {}) {
	const playback = await getPlaybackState();
	const { queue } = await getQueue({ pinCurrent: false });
	const next = queue[0] || null;

	if (!next) {
		if (!playback.currentQueueId) {
			return { ok: true, changed: false, reason: 'idle_clean' };
		}
		await setPlaybackState({ currentQueueId: null, startedAtMs: null });
		await broadcast('queue_changed', { currentTurn: await getGlobalTurn() });
		return { ok: true, changed: true, reason: opts.reason || 'reconcile_to_idle', next: null };
	}

	if (!needsReanchor(playback, next)) {
		return { ok: true, changed: false, reason: 'healthy', nextQueueId: next.id };
	}

	const startedAtMs = Date.now();
	await setPlaybackState({
		currentQueueId: next.id,
		songId: next.song?.id || next.songId,
		startedAtMs,
		song: {
			...next.song,
			...next,
			queueId: next.id,
			songId: next.song?.id || next.songId,
			startedAt: Math.floor(startedAtMs / 1000),
			startedAtMs
		}
	});
	await broadcast('queue_changed', { currentTurn: await getGlobalTurn() });
	return {
		ok: true,
		changed: true,
		reason: opts.reason || 'reconcile_to_head',
		nextQueueId: next.id
	};
}

