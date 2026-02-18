<script>
	import {
		playerState,
		initRealtime,
		addToast,
		refreshQueue
	} from '$lib/client/stores.svelte.js';
	import Toast from '$lib/components/Toast.svelte';
	import Queue from '$lib/components/Queue.svelte';
	import AddToQueue from '$lib/components/AddToQueue.svelte';
	import VideoPlayer from '$lib/components/VideoPlayer.svelte';
	import NowPlayingOverlay from '$lib/components/NowPlayingOverlay.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import LandingPage from '$lib/components/LandingPage.svelte';
	import StarBurstOverlay from '$lib/components/StarBurstOverlay.svelte';

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
	let helpOpen = $state(false);
	let queueVisible = $state(false);
	let queueHideTimer = null;
	let isMobileViewport = $state(false);

	const isAdmin = $derived(Boolean(data?.isAdmin));
	const connectionState = $derived(playerState.connectionState || 'connecting');
	const connectionTooltip = $derived(`Realtime: ${connectionState}`);
	const isIdleState = $derived(!playerState.currentSong && playerState.queue.length === 0);
	const hideStarButton = $derived(!playerState.currentSong);
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

	function toggleHelp() {
		helpOpen = !helpOpen;
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
				if (key === 'h') {
					e.preventDefault();
					toggleHelp();
					return;
				}
				if (key === 'escape' && helpOpen) {
					e.preventDefault();
					helpOpen = false;
					return;
				}
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

	async function star(payload) {
		try {
			await fetch('/api/realtime/star', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload || {})
			});
		} catch {
			// ignore transient errors
		}
	}
</script>

<div
	class="app-container"
	role="presentation"
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
				<button class="btn-skip btn-help" class:active={helpOpen} onclick={toggleHelp} aria-label="Help (H)">
					<Icon name="question" size={20} color="currentColor" strokeWidth={1.8} />
				</button>
					<div class="status">
						<span title="Connected clients">
							<Icon name="stations" size={20} color="currentColor" strokeWidth={1.8} />
						</span>
						<span class="count">{playerState.clientCount.toString().padStart(2, '0')}</span>
						<span class="queue-count" aria-label="Queue count" title="Songs waiting in queue">
							<Icon name="clients" size={20} color="currentColor" strokeWidth={1.8} />
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
		onstar={star}
		hideTrigger={isVideoPaused}
		hideStar={hideStarButton}
		pulse={isIdleState}
		mode={isIdleState ? 'center' : 'nearQueue'}
	/>
	<StarBurstOverlay bursts={playerState.starBursts} />

		{#if helpOpen}
			<div
				class="help-backdrop"
				role="button"
				tabindex="0"
				aria-label="Close help"
				onclick={(e) => {
					if (e.target === e.currentTarget) helpOpen = false;
				}}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') helpOpen = false;
				}}
			>
				<button class="help-close-fixed" onclick={() => (helpOpen = false)} aria-label="Close help">
					<span class="close-icon" aria-hidden="true">
						<svg viewBox="0 0 24 24" role="img" focusable="false">
							<path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M6.21991 6.21479C6.51281 5.92189 6.98768 5.92189 7.28057 6.21479L17.7854 16.7196C18.0783 17.0125 18.0783 17.4874 17.7854 17.7803C17.4925 18.0732 17.0177 18.0732 16.7248 17.7803L6.21991 7.27545C5.92702 6.98255 5.92702 6.50768 6.21991 6.21479Z"
								class="close-icon-soft"
							/>
							<path
								fill-rule="evenodd"
								clip-rule="evenodd"
								d="M17.7853 6.21479C18.0782 6.50769 18.0782 6.98256 17.7853 7.27545L7.28038 17.7802C6.98749 18.0731 6.51261 18.0731 6.21972 17.7802C5.92683 17.4873 5.92683 17.0124 6.21973 16.7195L16.7247 6.21478C17.0176 5.92189 17.4924 5.9219 17.7853 6.21479Z"
								class="close-icon-main"
							/>
						</svg>
					</span>
				</button>
				<div class="help-modal" role="dialog" aria-modal="true" aria-label="How Rocola works">
					<LandingPage />
				</div>
			</div>
		{/if}
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
	.btn-help {
		font-size: var(--font-size-2);
		font-weight: var(--font-weight-7);
		line-height: 1;
	}
	.help-backdrop {
		position: fixed;
		inset: 0;
		z-index: var(--layer-important);
		display: flex;
		align-items: center;
		justify-content: center;
		padding-top: 56px;
		padding-bottom: var(--mobile-footer-h, 124px);
		background: transparent;
	}
	.help-modal {
		width: min(90vw, 1400px);
		height: calc(100dvh - 56px - var(--mobile-footer-h, 124px) - var(--size-3));
		max-height: calc(100dvh - 56px - var(--mobile-footer-h, 124px) - var(--size-3));
		overflow-x: auto;
		overflow-y: auto;
		padding: var(--size-4);
		background: linear-gradient(90deg, #000000 63%, transparent);
		border-radius: 9px;
	}
	.help-close-fixed {
		background: transparent;
		border: 0;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 9px;
		position: fixed;
		top: calc(56px + var(--size-2));
		right: var(--size-4);
		z-index: calc(var(--layer-important) + 1);
	}
	.help-close-fixed .close-icon { width: 36px; height: 36px; display: inline-flex; }
	.help-close-fixed .close-icon svg { width: 100%; height: 100%; }
	.help-close-fixed .close-icon-soft {
		fill: #ff6b6b;
		transition: fill var(--transition-duration-1) ease, filter var(--transition-duration-1) ease;
	}
	.help-close-fixed .close-icon-main {
		fill: #8b1f1f;
		transition: fill var(--transition-duration-1) ease, filter var(--transition-duration-1) ease;
	}
	.help-close-fixed:hover .close-icon-soft { fill: #ff8a8a; filter: drop-shadow(0 0 6px rgba(255, 106, 106, 0.8)); }
	.help-close-fixed:hover .close-icon-main { fill: #b32020; filter: drop-shadow(0 0 8px rgba(179, 32, 32, 0.85)); }
	.help-close-fixed:active .close-icon-soft { fill: #ffb0b0; filter: drop-shadow(0 0 8px rgba(255, 106, 106, 0.95)); }
	.help-close-fixed:active .close-icon-main { fill: #d92b2b; filter: drop-shadow(0 0 10px rgba(217, 43, 43, 0.95)); }
	.btn-help.active {
		color: var(--text-main);
		opacity: 1;
		transform: scale(1.04);
	}
	.btn-help :global(svg path:first-child) {
		opacity: 0.45;
	}
	.btn-help :global(svg path:nth-child(n+2)) {
		opacity: 1;
	}
	.btn-help.active :global(svg path:first-child) {
		opacity: 1;
	}
	.btn-help.active :global(svg path:nth-child(n+2)) {
		opacity: 0.45;
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


