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

	let { data } = $props();

	let bitrate = $state(4820);
	let buffer = $state(100);
	let playbackProgress = $state(0);
	let adminIndex = $state(0);
	let seedPending = $state(false);
	let nextPending = $state(false);
	let clearPending = $state(false);

	const isAdmin = $derived(() => data?.isAdmin);
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
		const data = await res.json();
		if (data.ok && data.next) {
			playerState.currentSong = data.next;
			playbackProgress = 0;
			refreshQueue();
			addToast({ message: 'ADVANCED', level: 'success' });
		} else if (!data.ok) {
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

	<header class="top-bar border-b">
		<div class="logo">
			<span class="logo-text">ROCOLA</span>
		</div>
		<div class="header-meta">
			{#if import.meta.env.DEV || isAdmin}
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
			{/if}
			<div class="status">
				<div class="live-dot" aria-hidden="true"></div>
				<span>SYS_ACTIVE [{playerState.clientCount.toString().padStart(2, '0')}]</span>
			</div>
		</div>
	</header>

	<div class="main-layout overflow-hidden">
		<main class="player-zone border-r min-w-0">
			{#if playerState.currentSong}
				<div class="video-container">
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
							onstatsupdate={handleStatsUpdate} />
					</svelte:boundary>
				</div>
				<div class="metadata-tray border-t">
					<div class="meta-main min-w-0">
						<span class="label text-muted">// NOW_PLAYING</span>
						<h2 class="title">{playerState.currentSong.title}</h2>
						<div class="meta-footer text-dim">
							<span class="channel">{playerState.currentSong.channelTitle}</span>
							<span class="divider">|</span>
							<span class="vid-id">{playerState.currentSong.videoId}</span>
						</div>
					</div>
					<div class="meta-stats">
						{#if playerState.currentSong.tier && playerState.currentSong.tier !== 'free'}
							<div class="stat">
								<span class="s-label">REM</span>
								<span class="s-val">{playerState.currentSong.playsRemainingToday}</span>
							</div>
						{/if}
						<div class="stat">
							<span class="s-label">BTR</span>
							<span class="s-val">{bitrate}</span>
						</div>
						<div class="stat">
							<span class="s-label">BUF</span>
							<span class="s-val">{buffer}%</span>
						</div>
					</div>
				</div>
				<div class="progress-bar">
					<div class="fill" style="width: {playbackProgress}%"></div>
				</div>
			{:else}
				<div class="empty-state">
					<h1 class="blink">SYSTEM_IDLE</h1>
				</div>
			{/if}
		</main>

		<aside class="queue-zone min-w-0">
			<div class="queue-header border-b">
				<h3>SEQUENCE_QUEUE</h3>
				<span class="count"
					>[{playerState.queue.length.toString().padStart(2, '0')}]</span>
			</div>
			<div class="queue-content overflow-hidden">
				<Queue />
			</div>
		</aside>
	</div>

	<div class="fab-container">
		<AddToQueue onqueued={refreshQueue} />
	</div>
</div>

<style>
	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		height: 100dvh;
		width: 100vw;
		background: var(--bg-dark);
		overflow: hidden;
		position: relative;
	}

	.top-bar {
		height: 52px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--size-4);
		background: var(--bg-panel);
		z-index: var(--layer-3);
		letter-spacing: 0.08em;
		border-bottom: 0;
		text-transform: uppercase;
	}
	.logo {
		display: flex;
		align-items: baseline;
		gap: var(--size-3);
	}
	.logo-text {
		font-size: var(--font-size-2);
		font-weight: var(--font-weight-8);
		text-transform: uppercase;
		letter-spacing: 0.2em;
	}
	.header-meta {
		display: flex;
		align-items: center;
		gap: var(--size-3);
	}
	.status {
		font-size: var(--font-size-0);
		font-weight: var(--font-weight-8);
		display: flex;
		align-items: center;
		gap: var(--size-2);
		color: var(--text-dim);
		white-space: nowrap;
		border-left: 0;
		padding-left: 0;
	}
	.live-dot {
		width: var(--size-2);
		height: var(--size-2);
		background: var(--text-main);
		box-shadow: 0 0 8px var(--hud-glow);
	}
	.btn-skip {
		font-size: var(--font-size-2);
		padding: 0;
		border: 0;
		background: transparent;
		white-space: nowrap;
		line-height: 1;
		--icon-stroke-color: var(--text-main);
		--icon-stroke-width: 2;
	}
	.btn-skip:hover {
		--icon-stroke-color: var(--border-bright);
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

	.main-layout {
		flex: 1;
		display: flex;
		min-height: 0;
		position: relative;
		z-index: 1;
	}

	.player-zone {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: var(--bg-panel);
		min-width: 0;
		border-right: 0;
	}
	.video-container {
		flex: 1;
		background: #000;
		position: relative;
		min-height: 0;
	}
	.video-container::after {
		content: none;
	}

	.metadata-tray {
		padding: var(--size-3) var(--size-4);
		flex-shrink: 0;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		background: var(--bg-panel);
		gap: var(--size-5);
		border-top: 0;
	}
	.meta-main {
		flex: 1;
		min-width: 0;
	}
	.meta-main .label {
		font-size: var(--font-size-00);
		font-weight: var(--font-weight-8);
		display: block;
		margin-bottom: var(--size-1);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
	.meta-main .title {
		font-size: var(--font-size-4);
		font-weight: var(--font-weight-9);
		line-height: var(--font-lineheight-1);
		margin-bottom: var(--size-2);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.meta-footer {
		font-size: var(--font-size-0);
		font-weight: var(--font-weight-7);
		display: flex;
		gap: var(--size-3);
		overflow: hidden;
	}
	.meta-footer span {
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.meta-stats {
		display: flex;
		gap: var(--size-3);
		flex-shrink: 0;
		border-left: 0;
		padding-left: 0;
	}
	.stat {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
	}
	.s-label {
		font-size: var(--font-size-00);
		color: var(--text-muted);
		font-weight: var(--font-weight-9);
	}
	.s-val {
		font-size: var(--font-size-0);
		font-weight: var(--font-weight-8);
	}

	.progress-bar {
		height: var(--size-2);
		background: var(--border-dim);
		width: 100%;
		flex-shrink: 0;
		position: relative;
		overflow: hidden;
	}
	.progress-bar .fill {
		height: 100%;
		background: var(--text-main);
	}
	.progress-bar::after {
		content: none;
	}

	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: var(--size-3);
	}
	.blink {
		animation: var(--animation-blink);
	}

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

	.queue-zone {
		width: 400px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		background: var(--bg-panel);
		min-width: 0;
	}
	.queue-header {
		padding: var(--size-3) var(--size-4);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--bg-panel);
		flex-shrink: 0;
		border-bottom: 0;
	}
	.queue-header h3 {
		font-size: var(--font-size-1);
		font-weight: var(--font-weight-9);
		margin: 0;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
	.queue-header .count {
		font-weight: var(--font-weight-9);
	}
	.queue-content {
		flex: 1;
		overflow-y: auto;
		overflow-x: hidden;
	}

	.toasts-layer {
		position: fixed;
		top: var(--size-2);
		right: 0;
		z-index: var(--layer-important);
		padding: var(--size-3);
		display: flex;
		flex-direction: column;
		gap: var(--size-1);
		pointer-events: none;
	}
	.fab-container {
		position: fixed;
		bottom: var(--size-5);
		right: var(--size-5);
		z-index: var(--layer-5);
	}

	@media (max-width: 1023px) {
		.main-layout {
			flex-direction: column;
		}
		.queue-zone {
			width: 100%;
			height: 40%;
			border-left: 0;
			border-top: var(--border-size-1) solid var(--border-main);
		}
		.player-zone {
			border-right: 0;
		}
		.meta-main .title {
			font-size: var(--font-size-3);
		}
	}

	@media (max-width: 480px) {
		.metadata-tray {
			padding: var(--size-3);
			flex-direction: column;
			align-items: flex-start;
			gap: var(--size-2);
		}
		.meta-stats {
			width: 100%;
			justify-content: space-between;
		}
		.top-bar {
			padding: 0 var(--size-3);
		}
		.logo-text {
			font-size: var(--font-size-1);
		}
	}
</style>


