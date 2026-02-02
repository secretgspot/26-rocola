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

	let bitrate = $state(4820);
	let buffer = $state(100);
	let playbackProgress = $state(0);

	$effect(() => {
		initRealtime();
	});

	function handleTimeUpdate(e) {
		playbackProgress = e.progress;
	}

	function handleStatsUpdate(e) {
		if (e.bitrate) bitrate = e.bitrate;
		if (e.buffer !== undefined) buffer = e.buffer;
	}

	async function advance() {
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
			await refreshQueue();
		}
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
			{#if import.meta.env.DEV}
				<button class="btn-skip" onclick={advance} aria-label="Force advance to next song">[FORCE_NEXT]</button>
				<button class="btn-skip" onclick={async () => {
					const res = await fetch('/api/debug/seed', { method: 'POST' });
					const data = await res.json();
					if (data.ok) {
						addToast({ message: `Seeded ${data.added.length} songs`, level: 'success' });
						await refreshQueue();
					} else {
						addToast({ message: `Seed failed: ${data.error}`, level: 'error' });
					}
				}} aria-label="Seed queue with test data">[SEED]</button>
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
	}

	.top-bar {
		height: 60px;
		flex-shrink: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--size-5);
		background: var(--bg-dark);
		z-index: var(--layer-3);
	}
	.logo {
		display: flex;
		align-items: baseline;
		gap: var(--size-3);
	}
	.logo-text {
		font-size: var(--font-size-3);
		font-weight: var(--font-weight-9);
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
	}
	.live-dot {
		width: var(--size-2);
		height: var(--size-2);
		background: var(--text-main);
		animation: var(--animation-pulse);
	}
	.btn-skip {
		font-size: var(--font-size-00);
		padding: var(--size-1) var(--size-2);
		white-space: nowrap;
	}

	.main-layout {
		flex: 1;
		display: flex;
		min-height: 0;
	}

	.player-zone {
		flex: 1;
		display: flex;
		flex-direction: column;
		background: var(--bg-dark);
		min-width: 0;
	}
	.video-container {
		flex: 1;
		background: #000;
		position: relative;
		min-height: 0;
	}

	.metadata-tray {
		padding: var(--size-4);
		flex-shrink: 0;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		background: var(--bg-dark);
		gap: var(--size-5);
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
	}
	.progress-bar .fill {
		height: 100%;
		background: var(--text-main);
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
		background: var(--bg-dark);
		min-width: 0;
	}
	.queue-header {
		padding: var(--size-4);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: var(--bg-dark);
		flex-shrink: 0;
	}
	.queue-header h3 {
		font-size: var(--font-size-1);
		font-weight: var(--font-weight-9);
		margin: 0;
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
		top: 0;
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
