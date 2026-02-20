export function startControllerHeartbeat({ enabled, onController, intervalMs = 1800 }) {
	if (!enabled || typeof window === 'undefined') {
		onController(false);
		return () => {};
	}
	let timer;
	let alive = true;
	const run = async () => {
		try {
			const res = await fetch('/api/admin/controller', { method: 'POST' });
			const info = await res.json().catch(() => ({}));
			if (!alive) return;
			onController(Boolean(info?.isController));
		} catch {
			if (!alive) return;
			onController(false);
		}
		timer = setTimeout(run, intervalMs);
	};
	run();
	return () => {
		alive = false;
		if (timer) clearTimeout(timer);
	};
}

export function startAdminHealthPolling({
	enabled,
	onHealth,
	onError,
	onLeaseTick,
	pollMs = 2200,
	leaseTickMs = 250
}) {
	if (!enabled || typeof window === 'undefined') {
		onHealth(null);
		onError(false);
		onLeaseTick(0, true);
		return () => {};
	}
	let pollTimer;
	let leaseTimer;
	let alive = true;

	const poll = async () => {
		try {
			const res = await fetch('/api/admin/health/realtime');
			const info = await res.json().catch(() => ({}));
			if (!alive) return;
			if (res.ok && info?.ok) {
				onHealth(info);
				onError(false);
				const expiresAt = Number(info?.controller?.expiresAt || 0);
				onLeaseTick(Math.max(0, expiresAt - Date.now()), true);
			} else {
				onError(true);
			}
		} catch {
			if (!alive) return;
			onError(true);
		}
		pollTimer = setTimeout(poll, pollMs);
	};

	leaseTimer = setInterval(() => {
		onLeaseTick(leaseTickMs, false);
	}, leaseTickMs);
	poll();

	return () => {
		alive = false;
		if (pollTimer) clearTimeout(pollTimer);
		if (leaseTimer) clearInterval(leaseTimer);
	};
}

export async function enableAdminMode() {
	const res = await fetch('/api/admin/enable', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ code: 'up up down down left right left right a b' })
	});
	const data = await res.json().catch(() => ({}));
	return { status: res.status, data };
}

export async function requestQueueAdvance({ fromQueueId, reason = 'manual_or_ui' }) {
	const res = await fetch('/api/queue/next', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ fromQueueId, reason })
	});
	const data = await res.json().catch(() => null);
	return { status: res.status, data };
}

export async function requestSeedQueue() {
	const res = await fetch('/api/debug/seed', { method: 'POST' });
	return res.json();
}

export async function requestClearQueue() {
	const res = await fetch('/api/debug/clear', { method: 'POST' });
	return res.json();
}

export async function requestPlaybackTick() {
	const res = await fetch('/api/playback/tick', { method: 'POST' });
	return res.json().catch(() => ({}));
}

export async function requestPlaybackEnded({ queueId, videoId }) {
	const res = await fetch('/api/playback/ended', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ queueId, videoId })
	});
	return res.json().catch(() => ({}));
}

export async function postPlaybackDebug(payload) {
	return fetch('/api/debug/playback-log', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload || {})
	});
}

export async function postStarBurst(payload) {
	return fetch('/api/realtime/star', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload || {})
	});
}

