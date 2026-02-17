<script>
	import {
		playerState,
		initRealtime,
		addToast,
		refreshQueue,
	} from '$lib/client/stores.svelte.js';
	import Toast from '$lib/components/Toast.svelte';
	import Queue from '$lib/components/Queue.svelte';
	import AddToQueue from '$lib/components/AddToQueue.svelte';
	import VideoPlayer from '$lib/components/VideoPlayer.svelte';
	import NowPlayingOverlay from '$lib/components/NowPlayingOverlay.svelte';
	import Icon from '$lib/components/Icon.svelte';

	let { data } = $props();

	let bitrate = $state(4820);
	let buffer = $state(100);
	let playbackProgress = $state(0);
	let adminIndex = $state(0);
	let seedPending = $state(false);
	let nextPending = $state(false);
	let clearPending = $state(false);
	let theme = $state('dark');
	let isVideoPaused = $state(false);
	let queueVisible = $state(false);
	let queueHideTimer = null;
	let isMobileViewport = $state(false);

	const isAdmin = $derived(Boolean(data?.isAdmin));
	const connectionState = $derived(playerState.connectionState || 'connecting');
	const connectionTooltip = $derived(`Realtime: ${connectionState}`);
	const isIdleState = $derived(!playerState.currentSong && playerState.queue.length === 0);
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

	$effect(() => {
		initRealtime();
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const stored = localStorage.getItem('rocola-theme');
		theme = stored === 'light' ? 'light' : 'dark';
		document.documentElement.setAttribute('data-theme', theme);
	});

	$effect(() => {
		if (typeof window === 'undefined') return;
		const media = window.matchMedia('(max-width: 1023px)');
		const update = () => {
			isMobileViewport = media.matches;
			if (isMobileViewport) {
				queueVisible = true;
				clearQueueHideTimer();
			}
		};
		update();
		media.addEventListener('change', update);
		return () => media.removeEventListener('change', update);
	});

	function toggleTheme() {
		theme = theme === 'dark' ? 'light' : 'dark';
		if (typeof window !== 'undefined') {
			localStorage.setItem('rocola-theme', theme);
			document.documentElement.setAttribute('data-theme', theme);
		}
	}

	async function enableAdmin() {
		try {
			const res = await fetch('/api/admin/enable', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: 'up up down down left right left right a b' })
			});
			const data = await res.json();
			if (data.ok) {
				addToast({ message: 'ADMIN MODE ENABLED', level: 'success' });
				location.reload();
			} else {
				addToast({ message: 'ADMIN MODE FAILED', level: 'error' });
			}
		} catch (e) {
			addToast({ message: 'ADMIN MODE ERROR', level: 'error' });
		}
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		const handler = (e) => {
			const target = e.target;
			if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
			const key = String(e.key || '').toLowerCase();
			const expected = konami[adminIndex];
			if (key === expected) {
				adminIndex += 1;
				if (adminIndex >= konami.length) {
					adminIndex = 0;
					enableAdmin();
				}
			} else {
				adminIndex = key === konami[0] ? 1 : 0;
			}
		};

		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	});

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

	function clearQueueHideTimer() {
		if (queueHideTimer) {
			clearTimeout(queueHideTimer);
			queueHideTimer = null;
		}
	}

	function scheduleQueueHide(delayMs = 1600) {
		clearQueueHideTimer();
		queueHideTimer = setTimeout(() => {
			queueVisible = false;
		}, delayMs);
	}

	function handleQueuePointerEnter(e) {
		if (e.pointerType === 'mouse') {
			queueVisible = true;
			clearQueueHideTimer();
		}
	}

	function handleQueuePointerMove(e) {
		if (e.pointerType === 'mouse') {
			queueVisible = true;
			clearQueueHideTimer();
		}
	}

	function handleQueuePointerLeave(e) {
		if (e.pointerType === 'mouse') {
			queueVisible = false;
			clearQueueHideTimer();
		}
	}

	function handleQueueTouchReveal() {
		queueVisible = true;
		scheduleQueueHide();
	}

	$effect(() => {
		if (playerState.queue.length === 0) {
			queueVisible = false;
			clearQueueHideTimer();
		}
	});

	$effect(() => {
		return () => {
			clearQueueHideTimer();
		};
	});

	async function advance() {
		if (nextPending) return;
		nextPending = true;
		const currentQueueId =
			playerState.currentSong?.queueId || playerState.currentSong?.id;
		const res = await fetch('/api/queue/next', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fromQueueId: currentQueueId }),
		});
		let data = null;
		try {
			data = await res.json();
		} catch {
			// ignore parse errors for empty responses
		}
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
</script>

<div
	class="app-container"
	onpointerenter={handleQueuePointerEnter}
	onpointermove={handleQueuePointerMove}
	onpointerleave={handleQueuePointerLeave}
	ontouchstart={handleQueueTouchReveal}
>
	<div class="toasts-layer">
		{#each playerState.toasts as t (t.id)}
			<Toast message={t.message} level={t.level} />
		{/each}
	</div>

		<header class="top-bar">
			<div class="logo">
				<div class="live-dot {connectionState}" aria-hidden="true" title={connectionTooltip}></div>
				<span class="logo-text">ROCOLA</span>
			</div>
		<div class="header-meta">
			{#if import.meta.env.DEV || isAdmin}
				<div class="admin-panel">
					<button
						class="btn-skip btn-next"
						onclick={advance}
						aria-label="Force advance to next song"
						aria-busy={nextPending}
						disabled={nextPending}
					>
						<Icon name="skip" size={20} color="currentColor" strokeWidth={1.8} />
					</button>
					<button
						class="btn-skip btn-seed"
						onclick={async () => {
							if (seedPending) return;
							seedPending = true;
							const res = await fetch('/api/debug/seed', { method: 'POST' });
							const data = await res.json();
							if (data.ok) {
								addToast({ message: `Seeded ${data.added.length} songs`, level: 'success' });
								refreshQueue();
							} else {
								addToast({ message: `Seed failed: ${data.error}`, level: 'error' });
							}
							seedPending = false;
						}}
						aria-label="Seed queue with test data"
						aria-busy={seedPending}
						disabled={seedPending}
					>
						<Icon name="seed" size={20} color="currentColor" strokeWidth={1.8} />
					</button>
					<button
						class="btn-skip btn-clear"
						onclick={async () => {
							if (clearPending) return;
							clearPending = true;
							const res = await fetch('/api/debug/clear', { method: 'POST' });
							const data = await res.json();
							if (data.ok) {
								addToast({ message: 'Queue cleared!', level: 'plain' });
								playerState.currentSong = null;
								refreshQueue();
							} else {
								addToast({ message: `Clear failed: ${data.error}`, level: 'error' });
							}
							clearPending = false;
						}}
						aria-label="Clear all seeded data"
						aria-busy={clearPending}
						disabled={clearPending}
					>
						<Icon name="clear" size={20} color="currentColor" strokeWidth={1.8} />
					</button>
				</div>
			{/if}
			<button class="theme-toggle btn-skip btn-theme" onclick={toggleTheme} aria-label="Toggle theme">
				<Icon name={theme === 'dark' ? 'dark' : 'light'} size={20} color="currentColor" strokeWidth={1.8} />
			</button>
				<div class="status">
					<span title="Connected clients">
						<Icon name="clients" size={18} color="currentColor" strokeWidth={1.6} />
					</span>
					<span class="count">{playerState.clientCount.toString().padStart(2, '0')}</span>
					<span class="queue-count" aria-label="Queue count" title="Songs waiting in queue">
						<Icon name="queue" size={18} color="currentColor" strokeWidth={1.8} />
						<span class="count">{playerState.queue.length.toString().padStart(2, '0')}</span>
					</span>
			</div>
		</div>
	</header>

	<main class="video-layer min-w-0">
		{#if playerState.currentSong}
			<svelte:boundary onerror={(e) => console.error('Playback Error:', e)}>
				{#snippet failed(error, reset)}
					<div class="empty-state">
						<p class="text-muted">// ERROR: PLAYER_CRASHED</p>
						<button onclick={reset}>[REBOOT_PLAYER]</button>
						<button onclick={advance}>[FORCE_SKIP]</button>
					</div>
				{/snippet}
				<VideoPlayer
					onnext={advance}
					ontimeupdate={handleTimeUpdate}
					onstatsupdate={handleStatsUpdate}
					onplaystate={handlePlayState} />
			</svelte:boundary>
		{:else}
			<div class="empty-state">
			</div>
		{/if}
	</main>

	{#if playerState.queue.length > 0}
		<aside class="queue-zone min-w-0" class:visible={queueVisible || isMobileViewport}>
			<div class="queue-content">
				<Queue />
			</div>
		</aside>
	{/if}

	<NowPlayingOverlay
		song={playerState.currentSong}
		{bitrate}
		{buffer}
		progress={playbackProgress}
	/>

	<AddToQueue
		onqueued={refreshQueue}
		hideTrigger={isVideoPaused}
		pulse={isIdleState}
		mode={isIdleState ? 'center' : 'nearQueue'}
	/>
</div>

<style>
	@layer page-layout, page-motion, page-responsive;

	@layer page-layout {
	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		width: 100vw;
		background: transparent;
		overflow: hidden;
		position: relative;
		container-type: inline-size;
		container-name: viewport;
		--mobile-footer-h: 124px;
	}

	.top-bar {
		height: 56px;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--size-4);
		background: transparent;
		z-index: 10;
		letter-spacing: 0.08em;
		border-bottom: 0;
		text-transform: uppercase;
		pointer-events: auto;
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--queue-fade-void) 96%, transparent) 0%,
			color-mix(in srgb, var(--queue-fade-void) 70%, transparent) 40%,
			transparent 100%
		);
		color: var(--text-main);
	}
	.logo {
		display: flex;
		align-items: center;
		gap: var(--size-1);
	}
	.logo-text {
		font-size: var(--font-size-0);
		font-weight: var(--font-weight-1);
		text-transform: uppercase;
		letter-spacing: 0;
	}
	.theme-toggle {
		background: transparent;
		border: 0;
		padding: 0;
		margin-left: var(--size-2);
		opacity: 0.6;
		transition: opacity var(--transition-duration-1) ease;
	}
	.theme-toggle:hover { opacity: 1; }
	.header-meta {
		display: flex;
		align-items: center;
		gap: var(--size-3);
	}
	.admin-panel {
		display: flex;
		align-items: center;
		gap: var(--size-2);
		background: color-mix(in srgb, var(--bg-dark) 92%, transparent);
		padding: 4px 8px;
		border-radius: 9px;
	}
	.status {
		font-size: var(--font-size-1);
		font-weight: var(--font-weight-3);
		display: flex;
		align-items: center;
		gap: var(--size-2);
		color: var(--text-dim);
		white-space: nowrap;
		border-left: 0;
		padding-left: 0;
	}
	.status .count { color: var(--text-dim); letter-spacing: 0.12em; }
	.status .queue-count {
		display: inline-flex;
		align-items: center;
		gap: var(--size-1);
	}
	.live-dot {
		width: var(--size-2);
		height: var(--size-2);
		background: var(--status-pending);
		box-shadow: 0 0 8px var(--hud-glow);
	}
	.live-dot.connected {
		background: var(--status-good);
		box-shadow: 0 0 10px color-mix(in srgb, var(--status-good) 60%, transparent);
	}
	.live-dot.failed,
	.live-dot.suspended,
	.live-dot.disconnected {
		background: var(--status-bad);
		box-shadow: 0 0 10px color-mix(in srgb, var(--status-bad) 60%, transparent);
	}
	.live-dot.connecting,
	.live-dot.closing,
	.live-dot.closed {
		background: var(--status-pending);
		animation: blink 1.2s infinite;
	}
	.btn-skip {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--font-size-2);
		padding: 0;
		border: 0;
		background: transparent;
		white-space: nowrap;
		line-height: 1;
		--icon-stroke-color: var(--text-main);
		--icon-stroke-width: 2;
		opacity: 0.6;
		transition: opacity var(--transition-duration-1) ease;
		color: var(--text-main);
	}
	.top-bar button {
		all: unset;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.top-bar button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.btn-skip:hover {
		--icon-stroke-color: var(--border-bright);
		opacity: 1;
	}
	.btn-skip:active {
		opacity: 1;
	}
	:global([data-theme='light']) .btn-skip,
	:global([data-theme='light']) .theme-toggle {
		opacity: 0.9;
		color: var(--text-main);
	}

	.video-layer {
		position: fixed;
		inset: 0;
		z-index: 1;
		width: 100dvw;
		height: 100dvh;
		background: transparent;
		display: block;
	}

	.empty-state {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--size-3);
		z-index: var(--layer-2);
	}
	.blink {
		animation: var(--animation-blink);
	}

	.queue-zone {
		position: absolute;
		top: 120px;
		bottom: 120px;
		right: 0;
		left: auto;
		width: min(340px, 34vw);
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-width: 0;
		z-index: 2;
		pointer-events: none;
		background: transparent;
		opacity: 0;
		transform: translateX(14px);
		transition: opacity 180ms ease, transform 180ms ease;
		will-change: opacity, transform;
	}
	.queue-zone.visible {
		opacity: 1;
		transform: translateX(0);
		pointer-events: auto;
	}
	.queue-content {
		flex: 1 1 auto;
		height: 100%;
		max-height: 100%;
		overflow-y: auto;
		overflow-x: visible;
		position: relative;
		pointer-events: auto;
		align-content: center;
		background: linear-gradient(270deg, color-mix(in srgb, var(--bg-dark) 84%, transparent), transparent);
		transition: background 180ms ease;
		will-change: background;
	}
	.queue-zone.visible .queue-content {
		background: linear-gradient(270deg, color-mix(in srgb, var(--bg-dark) 88%, transparent), transparent);
	}

	.toasts-layer {
		position: fixed;
		top: calc(56px + var(--size-2));
		left: var(--size-4);
		transform: none;
		z-index: 2;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
		pointer-events: none;
		align-items: flex-start;
	}
	}

	@layer page-motion {
	@media (prefers-reduced-motion: no-preference) {
		@keyframes blink {
			0%,
			100% {
				opacity: 1;
			}
			50% {
				opacity: 0;
			}
		}
	}
	}

	@layer page-responsive {
	@container viewport (min-width: 1440px) {
		.queue-zone {
			width: min(360px, 30vw);
		}
	}

	@media (max-width: 1023px) and (orientation: portrait) {
		.video-layer {
			top: 0;
			left: 0;
			right: 0;
			bottom: auto;
			height: 50dvh;
		}
		.queue-zone {
			width: 100%;
			left: 0;
			right: 0;
			top: 50dvh;
			bottom: var(--mobile-footer-h);
			height: auto;
			justify-content: flex-start;
			background: transparent;
		}
		.queue-content {
			flex: 1 1 auto;
			height: 100%;
			max-height: none;
			background: color-mix(in srgb, var(--bg-dark) 90%, transparent);
		}
		.queue-zone.visible .queue-content {
			background: color-mix(in srgb, var(--bg-dark) 92%, transparent);
		}
		.toasts-layer {
			top: calc(56px + var(--size-1));
			left: var(--size-3);
			transform: none;
			padding: 0;
		}
	}

	@media (max-width: 1023px) and (orientation: landscape) {
		.queue-zone {
			width: min(340px, 40vw);
			top: 88px;
			bottom: 104px;
			left: auto;
			right: 0;
			justify-content: center;
		}
		.queue-content {
			height: 100%;
			max-height: 100%;
			background: linear-gradient(270deg, color-mix(in srgb, var(--bg-dark) 92%, transparent), transparent);
		}
		.queue-zone.visible .queue-content {
			background: linear-gradient(270deg, var(--bg-dark), transparent);
		}
	}

	@media (max-width: 480px) {
		.top-bar {
			padding: 0 var(--size-3);
		}
		.logo-text {
			font-size: var(--font-size-1);
		}
	}
	}
</style>


