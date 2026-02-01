<script>
	import { playerState, initRealtime, addToast, refreshQueue } from '$lib/client/stores.svelte.js';
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
		const currentQueueId = playerState.currentSong?.queueId || playerState.currentSong?.id;
		const res = await fetch('/api/queue/next', { 
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ fromQueueId: currentQueueId })
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
				<button class="btn-skip" onclick={advance}>[FORCE_NEXT]</button>
			{/if}
			<div class="status">
				<div class="live-dot"></div>
				<span>SYS_ACTIVE [{playerState.clientCount.toString().padStart(2, '0')}]</span>
			</div>
		</div>
	</header>

	<div class="main-layout overflow-hidden">
		<main class="player-zone border-r min-w-0">
			{#if playerState.currentSong}
				<div class="video-container">
					<VideoPlayer onnext={advance} ontimeupdate={handleTimeUpdate} onstatsupdate={handleStatsUpdate} />
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
					<p class="text-dim">AWAITING_INPUT_SIGNAL...</p>
				</div>
			{/if}
		</main>

		<aside class="queue-zone min-w-0">
			<div class="queue-header border-b">
				<h3>SEQUENCE_QUEUE</h3>
				<span class="count">[{playerState.queue.length.toString().padStart(2, '0')}]</span>
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
		padding: 0 1.5rem;
		background: var(--bg-dark);
		z-index: 20;
	}
	.logo { display: flex; align-items: baseline; gap: 0.75rem; }
	.logo-text { font-size: 1.25rem; font-weight: 900; }
	.version { font-size: 0.65rem; font-weight: 700; }
	.header-meta { display: flex; align-items: center; gap: 1rem; }
	.status { font-size: 0.7rem; font-weight: 800; display: flex; align-items: center; gap: 0.5rem; color: var(--text-dim); white-space: nowrap; }
	.live-dot { width: 8px; height: 8px; background: var(--text-main); animation: pulse 2s infinite; }
	.btn-skip { font-size: 0.6rem; padding: 4px 6px; white-space: nowrap; }

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
	.video-container { flex: 1; background: #000; position: relative; min-height: 0; }
	
	.metadata-tray {
		padding: 1.25rem;
		flex-shrink: 0;
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		background: var(--bg-dark);
		gap: 1.5rem;
	}
	.meta-main { flex: 1; min-width: 0; }
	.meta-main .label { font-size: 0.6rem; font-weight: 800; display: block; margin-bottom: 0.25rem; }
	.meta-main .title { font-size: 1.5rem; font-weight: 900; line-height: 1.1; margin-bottom: 0.5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.meta-footer { font-size: 0.7rem; font-weight: 700; display: flex; gap: 0.75rem; overflow: hidden; }
	.meta-footer span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

	.meta-stats { display: flex; gap: 1rem; flex-shrink: 0; }
	.stat { display: flex; flex-direction: column; align-items: flex-end; }
	.s-label { font-size: 0.5rem; color: var(--text-muted); font-weight: 900; }
	.s-val { font-size: 0.8rem; font-weight: 800; }

	.progress-bar { height: 6px; background: var(--border-dim); width: 100%; flex-shrink: 0; }
	.progress-bar .fill { height: 100%; background: var(--text-main); }

	.empty-state { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; }
	.blink { animation: blink 1s steps(2) infinite; }
	@keyframes blink { 0% { opacity: 0; } }
	@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }

	.queue-zone {
		width: 400px;
		flex-shrink: 0;
		display: flex;
		flex-direction: column;
		background: var(--bg-dark);
		min-width: 0;
	}
	.queue-header { padding: 1.25rem; display: flex; justify-content: space-between; align-items: center; background: var(--bg-dark); flex-shrink: 0; }
	.queue-header h3 { font-size: 0.85rem; font-weight: 900; margin: 0; }
	.queue-header .count { font-weight: 900; }
	.queue-content { flex: 1; overflow-y: auto; overflow-x: hidden; }

	.toasts-layer { position: fixed; top: 0; right: 0; z-index: 2000; padding: 1rem; display: flex; flex-direction: column; gap: 2px; pointer-events: none; }
	.fab-container { position: fixed; bottom: 2rem; right: 2rem; z-index: 1000; }

	@media (max-width: 1023px) {
		.main-layout { flex-direction: column; }
		.queue-zone { width: 100%; height: 40%; border-left: 0; border-top: 1px solid var(--border-main); }
		.player-zone { border-right: 0; }
		.meta-main .title { font-size: 1.25rem; }
	}

	@media (max-width: 480px) {
		.metadata-tray { padding: 0.75rem; flex-direction: column; align-items: flex-start; gap: 0.75rem; }
		.meta-stats { width: 100%; justify-content: space-between; }
		.top-bar { padding: 0 0.75rem; }
		.logo-text { font-size: 1rem; }
	}
</style>