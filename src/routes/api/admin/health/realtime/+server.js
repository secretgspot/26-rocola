import { json } from '@sveltejs/kit';
import { isAdminRequest } from '$lib/server/security.js';
import { getControllerState, isActiveController } from '$lib/server/controller.js';
import { getPlaybackState } from '$lib/server/services/playback.js';
import { getGlobalTurn } from '$lib/server/services/queue.js';
import { getStationRuntime } from '$lib/server/services/station.js';

export async function GET(event) {
	if (!isAdminRequest(event, { allowDev: false })) {
		return json({ ok: false, error: 'Admin required' }, { status: 403 });
	}

	const [controller, playback, turn, station] = await Promise.all([
		getControllerState(),
		getPlaybackState(),
		getGlobalTurn(),
		getStationRuntime()
	]);

	return json({
		ok: true,
		controller: {
			isController: await isActiveController(event),
			sessionId: controller.sessionId,
			expiresAt: controller.expiresAt,
			leaseMs: controller.leaseMs
		},
		playback: {
			currentQueueId: playback.currentQueueId,
			startedAtMs: playback.startedAtMs,
			eventSeq: playback.eventSeq
		},
		station,
		turn
	});
}
