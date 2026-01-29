<script>
	import { onMount, onDestroy } from 'svelte';
	import { queue, currentSong, previousSong, toasts, initRealtime, addToast } from '$lib/client/stores.js';
	import Toast from '$lib/components/Toast.svelte';
	import Queue from '$lib/components/Queue.svelte';
	import AddToQueue from '$lib/components/AddToQueue.svelte';
	import VideoPlayer from '$lib/components/VideoPlayer.svelte';

	let statsInterval;
	let bitrate = 4820;
	let latency = 32;
	let buffer = 100;
	let playbackProgress = 0;

	onMount(() => {
		initRealtime();
		statsInterval = setInterval(() => {
			bitrate = 4200 + Math.floor(Math.random() * 800);
			latency = 28 + Math.floor(Math.random() * 12);
			buffer = 98 + Math.floor(Math.random() * 2);
		}, 3000);
	});

	onDestroy(() => {
		clearInterval(statsInterval);
	});

	function handleTimeUpdate(e) {
		playbackProgress = e.detail.progress;
	}

	async function advance() {
		const res = await fetch('/api/queue/next', { method: 'POST' });
		const data = await res.json();
		if (!data.ok) {
			addToast({ message: data.error || 'Advance failed', level: 'warn' });
			return;
		}
		if (data.next) {
			previousSong.set($currentSong);
			currentSong.set(data.next);
			playbackProgress = 0;
			// Refresh queue
			try {
				const qRes = await fetch('/api/queue');
				const qData = await qRes.json();
				const items = (qData.queue || []).map((r) => ({ ...r.left, song: r.right }));
				
				const cRes = await fetch('/api/queue/current');
				const cData = await cRes.json();

				if (cData?.current) {
					const currentSongId = cData.current.songId ?? cData.current.id ?? cData.current.videoId;
					queue.set(items.filter((it) => (it.song?.id ?? it.songId ?? it.id) !== currentSongId));
				} else {
					queue.set(items);
				}
			} catch (e) {
				console.warn('Failed to refresh queue', e);
			}
			addToast({ message: `Now playing: ${data.next.title || data.next.videoId}`, level: 'info' });
		} else if (data.message) {
			addToast({ message: data.message, level: 'info' });
		}
	}
</script>

<div class="app-container">
	<!-- Toast Layer -->
	<div class="toasts-layer">
		{#each $toasts as t (t.id)}
			<Toast message={t.message} level={t.level} />
		{/each}
	</div>

	<!-- Background Decorations -->
	<div class="bg-decoration top-left"></div>
	<div class="bg-decoration bottom-right"></div>

	<!-- Main Grid -->
	<header class="top-bar">
		<div class="logo">
			<span class="glitch" data-text="ROCOLA">ROCOLA</span>
			<span class="version">v2.6</span>
		</div>
		<div class="header-meta">
			{#if import.meta.env.DEV}
				<button class="btn-skip" on:click={advance} title="Force Next (Dev)">
					SKIP_BUFFER
				</button>
			{/if}
			<div class="status">
				<span class="live-dot"></span> 
				<span class="status-text">SYSTEM_ACTIVE</span>
			</div>
		</div>
	</header>

	<main class="player-zone glass-panel">
		{#if $currentSong}
			{#if $currentSong.videoId}
				<div class="video-wrapper">
					<VideoPlayer on:next={advance} on:timeupdate={handleTimeUpdate} />
				</div>
				<div class="now-playing-info">
					<div class="info-top">
						<div class="info-main">
							<div class="info-header">
								<span class="tag">NOW PLAYING</span>
							</div>
							<h2 class="song-title">{$currentSong.title}</h2>
							<div class="info-footer">
								<div class="channel-badge">{$currentSong.channelTitle}</div>
								<div class="video-id">{$currentSong.videoId}</div>
							</div>
						</div>
						<div class="system-stats">
							<div class="stat-box">
								<span class="label">BITRATE</span>
								<span class="val cyan">{bitrate}kbps</span>
							</div>
							<div class="stat-box">
								<span class="label">LATENCY</span>
								<span class="val green">{latency}ms</span>
							</div>
							<div class="stat-box">
								<span class="label">BUFFER</span>
								<span class="val pink">{buffer}%</span>
							</div>
						</div>
					</div>
					<div class="playback-bar">
						<div class="progress-fill" style="width: {playbackProgress}%"></div>
					</div>
				</div>
			{:else}
				<div class="empty-state">
					<p>No playable song</p>
				</div>
			{/if}
		{:else}
			<div class="empty-state">
				<div class="scanner-line"></div>
				<div class="pulse-ring"></div>
				<p class="glitch-text" data-text="SYSTEM IDLE">SYSTEM IDLE</p>
				<p class="sub-text">WAITING FOR SEQUENCE...</p>
			</div>
		{/if}
	</main>

	<aside class="queue-zone glass-panel">
		<div class="queue-header">
			<h3>UP NEXT</h3>
			<div class="queue-meta">
				<span class="count">{$queue.length}</span>
			</div>
		</div>
		<div class="queue-content">
			<Queue />
		</div>
	</aside>

	<!-- Floating Controls -->
	<div class="fab-layer">
		<AddToQueue />
	</div>
</div>

<style>
	.app-container {
		height: 100vh;
		width: 100vw;
		display: grid;
		grid-template-columns: 1fr;
		grid-template-rows: 60px 1fr 35%; 
		gap: var(--gap);
		padding: var(--gap);
		box-sizing: border-box;
		position: relative;
		z-index: 10;
	}

	@media (min-width: 1024px) {
		.app-container {
			grid-template-columns: 1fr 400px;
			grid-template-rows: 60px 1fr;
			max-width: 1600px;
			margin: 0 auto;
		}
		.top-bar { grid-column: 1 / span 2; }
		.queue-zone { grid-column: 2; grid-row: 2; }
		.player-zone { grid-column: 1; grid-row: 2; }
	}

	/* Decorations */
	.bg-decoration {
		position: fixed;
		width: 300px;
		height: 300px;
		border: 1px solid rgba(0, 243, 255, 0.05);
		pointer-events: none;
		z-index: -1;
	}
	.top-left { top: -100px; left: -100px; transform: rotate(45deg); border-width: 40px; }
	.bottom-right { bottom: -150px; right: -150px; transform: rotate(15deg); border-width: 60px; }

	/* Header */
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 0.5rem;
		background: transparent;
		border: none;
		box-shadow: none;
	}
	.logo {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.logo .glitch {
		font-family: var(--font-display);
		font-weight: 800;
		font-size: 1.5rem;
		letter-spacing: 0.25em;
		color: var(--neon-cyan);
		position: relative;
		text-shadow: 0 0 20px rgba(0, 243, 255, 0.2);
	}
	.version {
		font-family: var(--font-mono);
		font-size: 0.5rem;
		color: var(--text-muted);
		margin-top: 4px;
	}

	.header-meta {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}

	.btn-skip {
		background: rgba(255, 215, 0, 0.05);
		border: 1px solid rgba(255, 215, 0, 0.2);
		color: var(--tier-gold);
		font-family: var(--font-pixel);
		font-size: 0.4rem;
		padding: 4px 8px;
		cursor: pointer;
		transition: all 0.2s;
		letter-spacing: 0.1em;
	}
	.btn-skip:hover {
		background: var(--tier-gold);
		color: #000;
		box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
	}

	.status {
		font-family: var(--font-pixel);
		font-size: 0.5rem;
		color: var(--neon-green);
		display: flex;
		align-items: center;
		gap: 0.6rem;
		background: rgba(10, 255, 10, 0.05);
		padding: 6px 12px;
		border: 1px solid rgba(10, 255, 10, 0.1);
	}
	.status-text {
		letter-spacing: 0.15em;
	}
	.live-dot {
		width: 4px;
		height: 4px;
		background: var(--neon-green);
		border-radius: 50%;
		box-shadow: 0 0 5px var(--neon-green);
		animation: pulse 1s infinite;
	}

	/* Player Zone */
	.player-zone {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
		border: 1px solid var(--glass-border);
		box-shadow: 0 0 40px rgba(0,0,0,0.5);
	}
	.video-wrapper {
		flex: 1;
		width: 100%;
		background: #000;
		position: relative;
	}

	.now-playing-info {
		padding: 1.5rem 2rem;
		background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(5, 7, 20, 0.8) 100%);
		border-top: 1px solid var(--glass-border);
		display: flex;
		flex-direction: column;
		gap: 1.25rem;
	}
	.info-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
		gap: 2rem;
	}
	.info-main {
		flex: 1;
		min-width: 0;
	}
	.info-header {
		margin-bottom: 0.5rem;
	}
	.info-header .tag {
		font-family: var(--font-pixel);
		font-size: 0.45rem;
		color: var(--neon-pink);
		letter-spacing: 0.2em;
	}
	.song-title {
		font-size: 1.5rem;
		margin-bottom: 0.75rem;
		color: #fff;
		font-weight: 800;
		line-height: 1.2;
		letter-spacing: -0.01em;
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.info-footer {
		display: flex;
		align-items: center;
		gap: 1.5rem;
	}
	.channel-badge {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--neon-cyan);
		background: rgba(0, 243, 255, 0.05);
		padding: 2px 8px;
		border: 1px solid rgba(0, 243, 255, 0.15);
	}
	.video-id {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--text-muted);
	}

	.system-stats {
		display: flex;
		gap: 1.5rem;
		padding-bottom: 4px;
	}
	.stat-box {
		display: flex;
		flex-direction: column;
		gap: 4px;
		min-width: 60px;
	}
	.stat-box .label {
		font-family: var(--font-pixel);
		font-size: 0.35rem;
		color: var(--text-muted);
	}
	.stat-box .val {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		font-weight: 700;
	}

	.playback-bar {
		width: 100%;
		height: 2px;
		background: rgba(255,255,255,0.05);
		position: relative;
	}
	.playback-bar .progress-fill {
		position: absolute;
		top: 0; left: 0; height: 100%;
		background: var(--neon-cyan);
		box-shadow: 0 0 10px var(--neon-cyan);
		transition: width 0.5s linear;
	}
	
	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--text-dim);
		font-family: var(--font-mono);
		gap: 1rem;
		background: radial-gradient(circle, rgba(0, 243, 255, 0.05) 0%, transparent 70%);
		position: relative;
	}
	.scanner-line {
		position: absolute;
		top: 0; left: 0; width: 100%; height: 2px;
		background: var(--neon-cyan);
		box-shadow: 0 0 15px var(--neon-cyan);
		opacity: 0.3;
		animation: scan 4s linear infinite;
	}
	.pulse-ring {
		width: 80px;
		height: 80px;
		border: 1px solid var(--neon-cyan);
		border-radius: 50%;
		animation: ring-pulse 3s infinite;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	.pulse-ring::after {
		content: "";
		width: 40px;
		height: 40px;
		border: 1px solid var(--neon-pink);
		border-radius: 50%;
		animation: ring-pulse 3s infinite reverse;
	}

	@keyframes scan {
		0% { top: 0; }
		100% { top: 100%; }
	}

	/* Queue Zone */
	.queue-zone {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border-left: 1px solid var(--glass-border);
	}
	.queue-header {
		padding: 1.25rem 1.5rem;
		border-bottom: 1px solid var(--glass-border);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(0,0,0,0.3);
	}
	.queue-header h3 {
		font-size: 0.75rem;
		color: #fff;
		font-family: var(--font-pixel);
		letter-spacing: 0.1em;
	}
	.queue-meta .count {
		background: var(--neon-cyan);
		color: #000;
		padding: 2px 8px;
		font-size: 0.7rem;
		font-family: var(--font-mono);
		font-weight: 800;
	}
	.queue-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	/* Layers */
	.toasts-layer {
		position: fixed;
		top: 1.5rem;
		right: 1.5rem;
		z-index: 2000;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		pointer-events: none;
	}
	.fab-layer {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		z-index: 1000;
	}

	@keyframes pulse {
		0% { opacity: 1; }
		50% { opacity: 0.3; }
		100% { opacity: 1; }
	}

	@keyframes ring-pulse {
		0% { transform: scale(0.8); opacity: 0.8; }
		100% { transform: scale(1.5); opacity: 0; }
	}

	/* Glitch Effect */
	.glitch {
		position: relative;
	}
	.glitch::before, .glitch::after {
		content: attr(data-text);
		position: absolute;
		top: 0; left: 0; width: 100%; height: 100%;
		opacity: 0.8;
	}
	.glitch::before {
		color: #ff00ff;
		z-index: -1;
		animation: glitch-anim 2s infinite linear alternate-reverse;
	}
	.glitch::after {
		color: #00ffff;
		z-index: -2;
		animation: glitch-anim2 3s infinite linear alternate-reverse;
	}

	@keyframes glitch-anim {
		0% { clip: rect(20px, 9999px, 10px, 0); transform: skew(0.5deg); }
		100% { clip: rect(80px, 9999px, 30px, 0); transform: skew(0.5deg); }
	}
	@keyframes glitch-anim2 {
		0% { clip: rect(60px, 9999px, 40px, 0); transform: skew(-0.5deg); }
		100% { clip: rect(10px, 9999px, 70px, 0); transform: skew(-0.5deg); }
	}
</style>