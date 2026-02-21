import {
	startControllerHeartbeat,
	startAdminHealthPolling,
	enableAdminMode,
	requestQueueAdvance,
	requestSeedQueue,
	requestClearQueue,
	requestPlaybackTick,
	requestPlaybackEnded,
	postPlaybackDebug,
	postStarBurst
} from '$lib/client/admin-runtime.js';
import {
	startViewportWatcher,
	createQueueRevealController,
	startShortcutBindings
} from '$lib/client/page-runtime.js';

export function createStationPageState({ getData, playerState, addToast, refreshQueue }) {
	let bitrate = $state(0);
	let buffer = $state(0);
	let playbackProgress = $state(0);
	let adminIndex = $state(0);
	let seedPending = $state(false);
	let nextPending = $state(false);
	let clearPending = $state(false);
	let theme = $state('dark');
	let isVideoPaused = $state(false);
	let localPlaybackBlocked = $state(false);
	let helpOpen = $state(false);
	let queueVisible = $state(false);
	let isController = $state(false);
	let isMobileViewport = $state(false);
	let debugLogBusy = $state(false);
	let tickInFlight = $state(false);
	let endedInFlight = $state(false);
	let suppressTickUntilMs = $state(0);
	let adminHealth = $state(null);
	let adminHealthError = $state(false);
	let adminHealthLeaseLeftMs = $state(0);

	const isAdmin = $derived(Boolean(getData?.()?.isAdmin));
	const isDevEnv = $derived(Boolean(getData?.()?.isDev));
	const canControl = $derived(isAdmin && isController);
	// Allow active admin controller to drive playback in production as a fallback
	// when server cron cadence is not sufficient (e.g. Hobby daily cron only).
	const canDrivePlayback = $derived(canControl);
	const showAdminHealth = $derived(isAdmin || isDevEnv);
	const connectionState = $derived(playerState.connectionState || 'connecting');
	const connectionTooltip = $derived(`Realtime: ${connectionState}`);
	const isInitializing = $derived(Boolean(playerState.initializing));
	const isIdleState = $derived(!playerState.currentSong && playerState.queue.length === 0);
	const hasActiveQueuePlayback = $derived(Boolean(playerState.currentSong) && playerState.queue.length > 0);
	const hideStarButton = $derived(!playerState.currentSong);
	const adminHealthState = $derived(
		!isAdmin ? '' : adminHealthError ? 'ERR' : adminHealth?.ok ? 'OK' : '...'
	);
	const adminHealthTurn = $derived(Number(adminHealth?.turn ?? 0));
	const adminHealthSeq = $derived(Number(adminHealth?.playback?.eventSeq ?? 0));
	const adminHealthLeaseSec = $derived(Math.max(0, Math.ceil(adminHealthLeaseLeftMs / 1000)));
	const adminHealthCtrl = $derived(Boolean(adminHealth?.controller?.isController));
	const landingMetrics = $derived({
		activeUsers: playerState.clientCount || 1,
		queueDepth: playerState.queue.length,
		connection: (playerState.connectionState || 'connecting').toUpperCase(),
		driftMs: Math.round(Math.abs(playerState.clockOffsetSec || 0) * 1000),
		syncP95: playerState.syncStats?.driftP95Ms || 0,
		hardSync: playerState.syncStats?.hardSyncCount || 0,
		transitions: playerState.syncStats?.transitionCount || 0,
		transitionLag: playerState.syncStats?.lastTransitionLatencyMs || 0,
		currentTitle: playerState.currentSong?.title || 'Waiting for next drop'
	});

	const konami = [
		'arrowup',
		'arrowup',
		'arrowdown',
		'arrowdown',
		'arrowleft',
		'arrowright',
		'arrowleft',
		'arrowright',
		'a',
		'b'
	];

	const queueReveal = createQueueRevealController({
		isHelpOpen: () => helpOpen,
		setQueueVisible: (visible) => {
			queueVisible = visible;
		}
	});

	function initTheme() {
		if (typeof window === 'undefined') return;
		const stored = localStorage.getItem('rocola-theme');
		theme = stored === 'light' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', theme);
	}

	function startViewportSync() {
		return startViewportWatcher({
			onChange: (mobile) => {
				isMobileViewport = mobile;
				if (isMobileViewport) {
					queueVisible = true;
					queueReveal.dispose();
				}
			}
		});
	}

	function startControllerSync() {
		return startControllerHeartbeat({
			enabled: isAdmin,
			onController: (value) => {
				isController = value;
			}
		});
	}

	function startAdminHealthSync() {
		return startAdminHealthPolling({
			enabled: isAdmin,
			onHealth: (value) => {
				adminHealth = value;
			},
			onError: (value) => {
				adminHealthError = value;
			},
			onLeaseTick: (value, reset) => {
				adminHealthLeaseLeftMs = reset ? Math.max(0, value) : Math.max(0, adminHealthLeaseLeftMs - value);
			}
		});
	}

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		if (typeof window !== 'undefined') {
			localStorage.setItem('rocola-theme', theme);
			document.documentElement.setAttribute('data-theme', theme);
		}
	}

	function toggleHelp() {
		helpOpen = !helpOpen;
	}

	function closeHelp() {
		helpOpen = false;
	}

	async function enableAdmin() {
		try {
			const { status, data } = await enableAdminMode();
			if (data.ok) {
				addToast({ message: 'ADMIN MODE ENABLED', level: 'success' });
				location.reload();
			} else {
				const detail = data?.error || `HTTP_${status}`;
				const retry = data?.retryAfter ? ` RETRY ${data.retryAfter}s` : '';
				addToast({ message: `ADMIN MODE FAILED: ${detail}${retry}`, level: 'error' });
			}
		} catch {
			addToast({ message: 'ADMIN MODE ERROR', level: 'error' });
		}
	}

	function startShortcuts() {
		return startShortcutBindings({
			getHelpOpen: () => helpOpen,
			getIsAdmin: () => isAdmin,
			getIsDev: () => isDevEnv,
			getAdminIndex: () => adminIndex,
			setAdminIndex: (next) => {
				adminIndex = next;
			},
			konami,
			onSkip: () => advance(),
			onToggleHelp: () => toggleHelp(),
			onCloseHelp: () => {
				helpOpen = false;
			},
			onEnableAdmin: () => enableAdmin()
		});
	}

	function handleTimeUpdate(e) {
		playbackProgress = e.progress;
	}

	function handleStatsUpdate(e) {
		if (e.bitrate) bitrate = e.bitrate;
		if (e.buffer !== undefined) buffer = e.buffer;
	}

	function handlePlayState(e) {
		isVideoPaused = Boolean(e?.paused);
	}

	function handleLocalBlockState(e) {
		localPlaybackBlocked = Boolean(e?.blocked);
	}

	function handleSyncTelemetry(e) {
		if (!e || typeof e !== 'object') return;
		playerState.syncStats = {
			...playerState.syncStats,
			...e
		};
	}

	function handleQueuePointerEnter(e) {
		queueReveal.pointerEnter(e);
	}

	function handleQueuePointerMove(e) {
		queueReveal.pointerMove(e);
	}

	function handleQueuePointerLeave(e) {
		queueReveal.pointerLeave(e);
	}

	function handleQueueTouchReveal() {
		queueReveal.touchReveal();
	}

	function syncHelpQueueVisibility() {
		queueReveal.syncHelpOpen(helpOpen);
	}

	function syncQueueLengthVisibility() {
		queueReveal.syncQueueLength(playerState.queue.length);
	}

	function disposeQueueReveal() {
		queueReveal.dispose();
	}

	async function advance() {
		if (!canControl) return;
		if (nextPending) return;
		nextPending = true;
		const currentQueueId = playerState.currentSong?.queueId || playerState.currentSong?.id;
		const { data } = await requestQueueAdvance({ fromQueueId: currentQueueId, reason: 'manual_or_ui' });
		if (data?.ok && data?.next) {
			playerState.currentSong = data.next;
			playbackProgress = 0;
			refreshQueue();
			addToast({ message: 'ADVANCED', level: 'success' });
		} else if (data?.ok && !data?.next) {
			playerState.currentSong = null;
			playbackProgress = 0;
			refreshQueue();
			addToast({ message: 'QUEUE EMPTY', level: 'info' });
		} else if (data && !data.ok) {
			addToast({ message: `ADVANCE FAILED: ${data.error || 'unknown'}`, level: 'error' });
		}
		nextPending = false;
	}

	async function seedQueue() {
		if (seedPending) return;
		seedPending = true;
		const data = await requestSeedQueue();
		if (data.ok) {
			addToast({ message: `Seeded ${data.added.length} songs`, level: 'success' });
			refreshQueue();
		} else {
			addToast({ message: `Seed failed: ${data.error}`, level: 'error' });
		}
		seedPending = false;
	}

	async function clearQueue() {
		if (clearPending) return;
		clearPending = true;
		const data = await requestClearQueue();
		if (data.ok) {
			addToast({ message: 'Queue cleared!', level: 'plain' });
			playerState.currentSong = null;
			refreshQueue();
		} else {
			addToast({ message: `Clear failed: ${data.error}`, level: 'error' });
		}
		clearPending = false;
	}

	async function writePlaybackDebug(payload) {
		if (!canControl && !isAdmin) return;
		if (debugLogBusy) return;
		debugLogBusy = true;
		try {
			await postPlaybackDebug(payload || {});
		} catch {
			// ignore debug logging failures
		} finally {
			debugLogBusy = false;
		}
	}

	async function star(payload) {
		try {
			await postStarBurst(payload || {});
		} catch {
			// ignore transient errors
		}
	}

	async function tickPlayback() {
		if (!canDrivePlayback) return;
		if (tickInFlight) return;
		if (Date.now() < suppressTickUntilMs) return;
		tickInFlight = true;
		try {
			const data = await requestPlaybackTick();
			if (data?.action === 'advance') {
				writePlaybackDebug({
					source: 'client',
					event: 'tick_advance_seen',
					reason: data?.reason || 'tick',
					queueId: playerState.currentSong?.queueId || playerState.currentSong?.id || null,
					videoId: playerState.currentSong?.videoId || null,
					progressPct: playbackProgress,
					data
				});
			}
		} catch {
			// ignore transient errors
		} finally {
			tickInFlight = false;
		}
	}

	async function endedPlayback(payload = null) {
		if (!canDrivePlayback) return;
		if (endedInFlight) return;
		endedInFlight = true;
		suppressTickUntilMs = Date.now() + 1200;
		try {
			const queueId =
				typeof payload?.queueId === 'string'
					? payload.queueId
					: playerState.currentSong?.queueId || playerState.currentSong?.id || null;
			const videoId =
				typeof payload?.videoId === 'string'
					? payload.videoId
					: playerState.currentSong?.videoId || null;
			const data = await requestPlaybackEnded({ queueId, videoId });
			writePlaybackDebug({
				source: 'client',
				event: 'ended_signal_sent',
				reason: data?.reason || data?.action || 'ended',
				queueId,
				videoId,
				progressPct: playbackProgress,
				data
			});
		} catch {
			// ignore transient errors
		} finally {
			endedInFlight = false;
		}
	}

	function startTickLoop() {
		if (!canDrivePlayback || typeof window === 'undefined') return () => {};
		const timer = setInterval(() => {
			tickPlayback();
		}, 320);
		return () => clearInterval(timer);
	}

	return {
		get bitrate() { return bitrate; },
		get buffer() { return buffer; },
		get playbackProgress() { return playbackProgress; },
		get seedPending() { return seedPending; },
		get nextPending() { return nextPending; },
		get clearPending() { return clearPending; },
		get theme() { return theme; },
		get isVideoPaused() { return isVideoPaused; },
		get localPlaybackBlocked() { return localPlaybackBlocked; },
		get helpOpen() { return helpOpen; },
		get queueVisible() { return queueVisible; },
		get isMobileViewport() { return isMobileViewport; },
		get isController() { return isController; },
		get isAdmin() { return isAdmin; },
		get isDevEnv() { return isDevEnv; },
		get canControl() { return canControl; },
		get canDrivePlayback() { return canDrivePlayback; },
		get showAdminHealth() { return showAdminHealth; },
		get connectionState() { return connectionState; },
		get connectionTooltip() { return connectionTooltip; },
		get isInitializing() { return isInitializing; },
		get isIdleState() { return isIdleState; },
		get hasActiveQueuePlayback() { return hasActiveQueuePlayback; },
		get hideStarButton() { return hideStarButton; },
		get adminHealthState() { return adminHealthState; },
		get adminHealthTurn() { return adminHealthTurn; },
		get adminHealthSeq() { return adminHealthSeq; },
		get adminHealthLeaseSec() { return adminHealthLeaseSec; },
		get adminHealthCtrl() { return adminHealthCtrl; },
		get adminHealthError() { return adminHealthError; },
		get landingMetrics() { return landingMetrics; },
		initTheme,
		startViewportSync,
		startControllerSync,
		startAdminHealthSync,
		toggleTheme,
		toggleHelp,
		closeHelp,
		enableAdmin,
		startShortcuts,
		handleTimeUpdate,
		handleStatsUpdate,
		handlePlayState,
		handleLocalBlockState,
		handleSyncTelemetry,
		handleQueuePointerEnter,
		handleQueuePointerMove,
		handleQueuePointerLeave,
		handleQueueTouchReveal,
		syncHelpQueueVisibility,
		syncQueueLengthVisibility,
		disposeQueueReveal,
		advance,
		seedQueue,
		clearQueue,
		writePlaybackDebug,
		star,
		endedPlayback,
		startTickLoop
	};
}
