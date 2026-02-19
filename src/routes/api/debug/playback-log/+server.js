import { json } from '@sveltejs/kit';
import { isAdminRequest, checkRate } from '$lib/server/security.js';
import { addPlaybackLog, clearPlaybackLogs, getPlaybackLogs } from '$lib/server/debug/playback-log.js';
import { getPlaybackState } from '$lib/server/services/playback.js';
import { getControllerState, isActiveController } from '$lib/server/controller.js';

export async function GET(event) {
	if (!isAdminRequest(event, { allowDev: true })) {
		return json({ ok: false, error: 'Admin required' }, { status: 403 });
	}
	const limited = checkRate(event, 'debug-playback-log-read', 120, 60 * 1000, 'session');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	const limit = Number(event.url.searchParams.get('limit') || 400);
	const [playback, controller] = await Promise.all([getPlaybackState(), getControllerState()]);
	return json({
		ok: true,
		file: 'docs/debug/playback-log.ndjson',
		playback,
		controller,
		isController: await isActiveController(event),
		logs: getPlaybackLogs(limit)
	});
}

export async function POST(event) {
	if (!isAdminRequest(event, { allowDev: true })) {
		return json({ ok: false, error: 'Admin required' }, { status: 403 });
	}
	const limited = checkRate(event, 'debug-playback-log-write', 600, 60 * 1000, 'session');
	if (!limited.ok) return json(limited.body, { status: limited.status });

	const body = await event.request.json().catch(() => ({}));
	const id = addPlaybackLog({
		...body,
		source: body?.source || 'client',
		sessionId: event.locals?.sessionId || null,
		clientIp: event.locals?.clientIp || null,
		controller: await isActiveController(event)
	});
	return json({ ok: true, id });
}

export async function DELETE(event) {
	if (!isAdminRequest(event, { allowDev: true })) {
		return json({ ok: false, error: 'Admin required' }, { status: 403 });
	}
	clearPlaybackLogs();
	return json({ ok: true });
}
