import { getControllerState } from '$lib/server/controller.js';
import { getPlaybackState } from '$lib/server/services/playback.js';
import { getQueue, getGlobalTurn } from '$lib/server/services/queue.js';
import { getStationRuntime } from '$lib/server/services/station.js';

function nowMs() {
	return Date.now();
}

/**
 * Public station status summary for `/status` dashboard.
 */
export async function getPublicStatus() {
	const [controller, playback, station, turn, queueResult] = await Promise.all([
		getControllerState(),
		getPlaybackState(),
		getStationRuntime(),
		getGlobalTurn(),
		getQueue({ pinCurrent: true })
	]);

	const queue = queueResult?.queue || [];
	const queueLength = queue.length;
	const currentRow = playback?.currentQueueId
		? queue.find((row) => row.id === playback.currentQueueId) || null
		: null;

	const durationSec = Number(currentRow?.song?.duration || currentRow?.duration || 0);
	const elapsedMs =
		typeof playback?.startedAtMs === 'number' && playback.startedAtMs > 0
			? nowMs() - playback.startedAtMs
			: null;

	const stalePlayback =
		typeof elapsedMs === 'number' &&
		durationSec > 0 &&
		elapsedMs > durationSec * 1000 + 10_000;

	const mode = queueLength === 0 ? 'idle' : currentRow ? 'playing' : 'recovering';

	return {
		ok: true,
		ts: nowMs(),
		mode,
		queueLength,
		turn,
		current: currentRow
			? {
					queueId: currentRow.id,
					videoId: currentRow.song?.videoId || currentRow.videoId || null,
					title: currentRow.song?.title || currentRow.title || 'Unknown',
					durationSec: durationSec || null,
					elapsedSec: typeof elapsedMs === 'number' ? Math.max(0, Math.round(elapsedMs / 1000)) : null
				}
			: null,
		controller: {
			active: Boolean(controller?.sessionId) && Number(controller?.expiresAt || 0) > nowMs(),
			expiresAt: Number(controller?.expiresAt || 0) || null,
			leaseMs: Number(controller?.leaseMs || 0) || null
		},
		station: {
			lagMs: station?.lagMs ?? null,
			lastTickAtMs: station?.lastTickAtMs ?? null,
			lastAdvanceCount: station?.lastAdvanceCount ?? 0,
			lastError: station?.lastError || null
		},
		health: {
			stalePlayback: Boolean(stalePlayback),
			stationDelayed: typeof station?.lagMs === 'number' ? station.lagMs > 90_000 : false
		}
	};
}

