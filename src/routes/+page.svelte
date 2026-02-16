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

	const isAdmin = $derived(Boolean(data?.isAdmin));
	const connectionState = $derived(playerState.connectionState || 'connecting');
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

<div class="app-container">
	<div class="toasts-layer">
		{#each playerState.toasts as t (t.id)}
			<Toast message={t.message} level={t.level} />
		{/each}
	</div>

	<header class="top-bar">
		<div class="logo">
			<div class="live-dot {connectionState}" aria-hidden="true"></div>
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
						<span class="icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" role="img" focusable="false">
								<path
									d="M6 17L11 12L6 7M13 17L18 12L13 7"
									class="icon-stroke"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
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
						<span class="icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" role="img" focusable="false">
								<path fill="none" d="M0 0H24V24H0z"/>
								<path
									d="M6 3c3.49 0 6.383 2.554 6.913 5.895C14.088 7.724 15.71 7 17.5 7H22v2.5c0 3.59-2.91 6.5-6.5 6.5H13v5h-2v-8H9c-3.866 0-7-3.134-7-7V3h4zm14 6h-2.5c-2.485 0-4.5 2.015-4.5 4.5v.5h2.5c2.485 0 4.5-2.015 4.5-4.5V9zM6 5H4v1c0 2.761 2.239 5 5 5h2v-1c0-2.761-2.239-5-5-5z"
									class="icon-fill"
								/>
							</svg>
						</span>
					</button>
					<button
						class="btn-skip btn-clear"
						onclick={async () => {
							if (clearPending) return;
							clearPending = true;
							const res = await fetch('/api/debug/clear', { method: 'POST' });
							const data = await res.json();
							if (data.ok) {
								addToast({ message: 'CLEARED', level: 'success' });
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
						<span class="icon" aria-hidden="true">
							<svg viewBox="0 0 24 24" role="img" focusable="false">
								<path
									d="M9 9L15 15"
									class="icon-stroke"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
								<path
									d="M15 9L9 15"
									class="icon-stroke"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
								<circle
									cx="12"
									cy="12"
									r="9"
									class="icon-stroke"
									stroke-linecap="round"
									stroke-linejoin="round"
								/>
							</svg>
						</span>
					</button>
				</div>
			{/if}
			<button class="theme-toggle btn-skip btn-theme" onclick={toggleTheme} aria-label="Toggle theme">
				<span class="icon" aria-hidden="true">
					{#if theme === 'dark'}
						<svg viewBox="0 0 512 512" role="img" focusable="false">
							<path
								d="M256,0c-9.22,0-16.696,7.475-16.696,16.696v33.391c0,9.22,7.475,16.696,16.696,16.696s16.696-7.475,16.696-16.696V16.696
								C272.696,7.475,265.22,0,256,0z"
								class="icon-fill"/>
							<path
								d="M256,445.217c-9.22,0-16.696,7.475-16.696,16.696v33.391c0,9.22,7.475,16.696,16.696,16.696s16.696-7.475,16.696-16.696
								v-33.391C272.696,452.693,265.22,445.217,256,445.217z"
								class="icon-fill"/>
							<path
								d="M50.087,239.304H16.696C7.475,239.304,0,246.78,0,256s7.475,16.696,16.696,16.696h33.391
								c9.22,0,16.696-7.475,16.696-16.696S59.307,239.304,50.087,239.304z"
								class="icon-fill"/>
							<path
								d="M495.304,239.304h-33.391c-9.22,0-16.696,7.475-16.696,16.696s7.475,16.696,16.696,16.696h33.391
								c9.22,0,16.696-7.475,16.696-16.696S504.525,239.304,495.304,239.304z"
								class="icon-fill"/>
							<path
								d="M92.132,350.609c-4.61-7.985-14.821-10.723-22.806-6.111l-28.917,16.696c-7.985,4.61-10.721,14.821-6.111,22.806
								c4.612,7.991,14.827,10.72,22.806,6.111l28.917-16.696C94.007,368.805,96.742,358.594,92.132,350.609z"
								class="icon-fill"/>
							<path
								d="M477.702,128c-4.61-7.986-14.821-10.724-22.806-6.111l-28.917,16.696c-7.985,4.61-10.721,14.821-6.111,22.806
								c4.612,7.99,14.827,10.72,22.806,6.111l28.917-16.696C479.576,146.196,482.312,135.985,477.702,128z"
								class="icon-fill"/>
							<path
								d="M161.391,419.868c-7.985-4.614-18.196-1.877-22.806,6.111l-16.696,28.917c-4.61,7.985-1.874,18.197,6.111,22.806
								c7.985,4.611,18.196,1.875,22.806-6.111l16.696-28.917C172.112,434.689,169.376,424.477,161.391,419.868z"
								class="icon-fill"/>
							<path
								d="M384,34.298c-7.986-4.614-18.196-1.877-22.806,6.111l-16.696,28.917c-4.61,7.985-1.874,18.197,6.111,22.806
								c7.985,4.611,18.196,1.875,22.806-6.111l16.696-28.917C394.721,49.12,391.985,38.908,384,34.298z"
								class="icon-fill"/>
							<path
								d="M390.111,454.895l-16.696-28.917c-4.61-7.985-14.82-10.724-22.806-6.111c-7.985,4.61-10.721,14.821-6.111,22.806
								l16.696,28.917c4.614,7.991,14.827,10.72,22.806,6.111C391.985,473.091,394.721,462.88,390.111,454.895z"
								class="icon-fill"/>
							<path
								d="M167.502,69.326l-16.696-28.917c-4.609-7.985-14.821-10.723-22.806-6.111c-7.985,4.61-10.721,14.821-6.111,22.806
								l16.696,28.917c4.612,7.99,14.827,10.72,22.806,6.111C169.376,87.522,172.112,77.311,167.502,69.326z"
								class="icon-fill"/>
							<path
								d="M471.591,361.194l-28.917-16.696c-7.986-4.614-18.196-1.877-22.806,6.111c-4.61,7.985-1.874,18.197,6.111,22.806
								l28.917,16.696c7.985,4.611,18.196,1.875,22.806-6.111C482.312,376.015,479.576,365.803,471.591,361.194z"
								class="icon-fill"/>
							<path
								d="M86.022,138.585l-28.917-16.696c-7.986-4.612-18.197-1.875-22.806,6.111c-4.61,7.985-1.874,18.197,6.111,22.806
								l28.917,16.696c7.985,4.611,18.196,1.875,22.806-6.111C96.742,153.406,94.007,143.194,86.022,138.585z"
								class="icon-fill"/>
							<path
								d="M256,100.174c-85.922,0-155.826,69.904-155.826,155.826S170.078,411.826,256,411.826S411.826,341.922,411.826,256
								S341.923,100.174,256,100.174z M256,378.435c-67.51,0-122.435-54.924-122.435-122.435S188.489,133.565,256,133.565
								S378.435,188.49,378.435,256S323.511,378.435,256,378.435z"
								class="icon-fill"/>
						</svg>
					{:else}
						<svg viewBox="0 0 24 24" role="img" focusable="false">
							<path
								d="M21.0672 11.8568L20.4253 11.469L21.0672 11.8568ZM12.1432 2.93276L11.7553 2.29085V2.29085L12.1432 2.93276ZM21.25 12C21.25 17.1086 17.1086 21.25 12 21.25V22.75C17.9371 22.75 22.75 17.9371 22.75 12H21.25ZM12 21.25C6.89137 21.25 2.75 17.1086 2.75 12H1.25C1.25 17.9371 6.06294 22.75 12 22.75V21.25ZM2.75 12C2.75 6.89137 6.89137 2.75 12 2.75V1.25C6.06294 1.25 1.25 6.06294 1.25 12H2.75ZM15.5 14.25C12.3244 14.25 9.75 11.6756 9.75 8.5H8.25C8.25 12.5041 11.4959 15.75 15.5 15.75V14.25ZM20.4253 11.469C19.4172 13.1373 17.5882 14.25 15.5 14.25V15.75C18.1349 15.75 20.4407 14.3439 21.7092 12.2447L20.4253 11.469ZM9.75 8.5C9.75 6.41182 10.8627 4.5828 12.531 3.57467L11.7553 2.29085C9.65609 3.5593 8.25 5.86509 8.25 8.5H9.75ZM12 2.75C11.9115 2.75 11.8077 2.71008 11.7324 2.63168C11.6686 2.56527 11.6538 2.50244 11.6503 2.47703C11.6461 2.44587 11.6482 2.35557 11.7553 2.29085L12.531 3.57467C13.0342 3.27065 13.196 2.71398 13.1368 2.27627C13.0754 1.82126 12.7166 1.25 12 1.25V2.75ZM21.7092 12.2447C21.6444 12.3518 21.5541 12.3539 21.523 12.3497C21.4976 12.3462 21.4347 12.3314 21.3683 12.2676C21.2899 12.1923 21.25 12.0885 21.25 12H22.75C22.75 11.2834 22.1787 10.9246 21.7237 10.8632C21.286 10.804 20.7293 10.9658 20.4253 11.469L21.7092 12.2447Z"
								class="icon-fill"
							/>
						</svg>
					{/if}
				</span>
			</button>
			<div class="status">
				<span class="client-icon" aria-hidden="true">
					<svg viewBox="0 0 24 24" role="img" focusable="false">
						<path
							d="M8 12H16"
							class="client-icon-main"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
						<path
							d="M15 16H17C19.2091 16 21 14.2091 21 12C21 9.79086 19.2091 8 17 8H15M9 8H7C4.79086 8 3 9.79086 3 12C3 14.2091 4.79086 16 7 16H9"
							class="client-icon-side"
							stroke-linecap="round"
							stroke-linejoin="round"
						/>
					</svg>
				</span>
				<span class="count">{playerState.clientCount.toString().padStart(2, '0')}</span>
				<span class="queue-count" aria-label="Queue count">
					<span class="queue-icon" aria-hidden="true">
						<svg viewBox="0 0 32 32" role="img" focusable="false">
							<path
								d="M7 24.269V9.73C7 8.223 8.753 7.44 9.83 8.465l7.632 7.269a1.758 1.758 0 010 2.532L9.83 25.535C8.753 26.56 7 25.777 7 24.269z"
								class="queue-icon-main"
								stroke-linecap="round"
								stroke-linejoin="round"
							/>
							<path
								d="M23 5v8M19 9h8"
								class="queue-icon-plus"
								stroke-linecap="round"
							/>
						</svg>
					</span>
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
		<aside class="queue-zone min-w-0">
			<div class="queue-content overflow-hidden">
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

	<div class="fab-container" class:fab-center={playerState.queue.length === 0} class:fab-near-queue={playerState.queue.length > 0}>
		<AddToQueue onqueued={refreshQueue} hideTrigger={isVideoPaused} pulse={playerState.queue.length === 0} />
	</div>
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
		z-index: 3;
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
	.theme-toggle .icon { width: 18px; height: 18px; color: var(--text-main); display: inline-flex; }
	.theme-toggle svg { width: 100%; height: 100%; }
	.theme-toggle .icon-fill {
		fill: currentColor;
	}
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
		font-weight: var(--font-weight-8);
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
	.queue-icon {
		display: inline-flex;
		width: 18px;
		height: 18px;
	}
	.queue-icon svg {
		width: 100%;
		height: 100%;
		fill: none;
	}
	.queue-icon-main,
	.queue-icon-plus {
		stroke-width: 2;
	}
	.queue-icon-main {
		stroke: var(--tier-gold);
		animation: queueIconMainPulse 2.4s ease-in-out infinite;
	}
	.queue-icon-plus {
		stroke: #7de3ff;
		animation: queueIconPlusPulse 2.4s ease-in-out infinite;
	}
	.client-icon {
		display: inline-flex;
		width: 18px;
		height: 18px;
	}
	.client-icon svg {
		width: 100%;
		height: 100%;
		fill: none;
	}
	.client-icon-main,
	.client-icon-side {
		stroke-width: 1.6;
	}
	.client-icon-main {
		stroke: var(--tier-silver);
		animation: clientIconMainPulse 2.2s ease-in-out infinite;
	}
	.client-icon-side {
		stroke: var(--tier-gold);
		animation: clientIconSidePulse 2.2s ease-in-out infinite;
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
	.btn-skip .icon {
		display: inline-flex;
		width: 20px;
		height: 20px;
		color: var(--text-main);
	}
	.btn-skip svg {
		width: 100%;
		height: 100%;
		fill: none;
	}
	.btn-skip .icon-stroke {
		stroke: var(--icon-stroke-color);
		stroke-width: var(--icon-stroke-width);
	}
	.btn-skip .icon-fill {
		fill: var(--icon-stroke-color);
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
		@keyframes clientIconMainPulse {
			0%, 100% { stroke: var(--tier-silver); }
			50% { stroke: var(--tier-gold); }
		}
		@keyframes clientIconSidePulse {
			0%, 100% { stroke: var(--tier-gold); }
			50% { stroke: var(--tier-silver); }
		}
		@keyframes queueIconMainPulse {
			0%, 100% { stroke: var(--tier-gold); }
			50% { stroke: #7de3ff; }
		}
		@keyframes queueIconPlusPulse {
			0%, 100% { stroke: #7de3ff; }
			50% { stroke: var(--tier-gold); }
		}
	}
	}

	.queue-zone {
		width: min(420px, calc(100vw - var(--size-6)));
		height: auto;
		position: absolute;
		top: 50%;
		bottom: auto;
		right: 0;
		transform: translateY(-50%);
		display: flex;
		flex-direction: column;
		backdrop-filter: blur(6px);
		background: linear-gradient(270deg, var(--bg-dark), transparent);
		min-width: 0;
		z-index: 2;
		pointer-events: auto;
	}
	.queue-content {
		flex: 0 1 auto;
		max-height: 36vh;
		overflow-y: auto;
		overflow-x: visible;
		position: relative;
		pointer-events: auto;
	}

	.toasts-layer {
		position: fixed;
		top: 50%;
		left: var(--size-2);
		transform: translateY(-50%);
		z-index: var(--layer-important);
		padding: var(--size-3);
		display: flex;
		flex-direction: column;
		gap: var(--size-1);
		pointer-events: none;
		align-items: flex-start;
	}
	.fab-container {
		position: fixed;
		z-index: var(--layer-important);
	}
	.fab-center {
		left: 50%;
		top: 50%;
		margin-left: calc(var(--size-9) / -2);
		margin-top: calc(var(--size-9) / -2);
	}
	.fab-near-queue {
		top: 50%;
		right: min(420px, calc(100vw - var(--size-6)));
		margin-right: var(--size-3);
		margin-top: calc(var(--size-9) / -2);
	}

	@layer page-responsive {
	@container viewport (max-width: 1023px) {
		.video-layer { height: 60dvh; }
		.queue-zone {
			width: 100%;
			height: auto;
			top: 60dvh;
			bottom: calc(128px + env(safe-area-inset-bottom, 0px));
			right: 0;
			transform: none;
		}
		.fab-near-queue {
			top: auto;
			right: var(--size-3);
			bottom: calc(132px + env(safe-area-inset-bottom, 0px));
			margin-top: 0;
			margin-right: 0;
		}
	}

	@container viewport (max-width: 480px) {
		.top-bar {
			padding: 0 var(--size-3);
		}
		.logo-text {
			font-size: var(--font-size-1);
		}
	}
	}
</style>


