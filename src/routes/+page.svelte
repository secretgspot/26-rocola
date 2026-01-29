<script>
	import { onMount } from 'svelte';
	import { queue, currentSong, previousSong, toasts, initRealtime, addToast } from '$lib/client/stores.js';
	import Toast from '$lib/components/Toast.svelte';
	import Queue from '$lib/components/Queue.svelte';
	import AddToQueue from '$lib/components/AddToQueue.svelte';
	import VideoPlayer from '$lib/components/VideoPlayer.svelte';

	onMount(() => {
		initRealtime();
	});

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
			// Refresh queue
			try {
				const qRes = await fetch('/api/queue');
				const qData = await qRes.json();
				const items = (qData.queue || []).map((r) => ({ ...r.left, song: r.right }));
				const currentSongId = data.next.songId ?? data.next.id ?? data.next.videoId;
				const filtered = items.filter((it) => {
					const playsLeft = it.playsRemainingToday ?? it.song?.playsRemainingToday ?? 1;
					const available = (it.song?.isAvailable ?? 1) === 1;
					const id = it.song?.id ?? it.songId ?? it.id;
					return playsLeft > 0 && available && id !== currentSongId;
				});
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
	<header class="top-bar glass-panel">
		<div class="logo">
			<span class="glitch" data-text="ROCOLA">ROCOLA</span>
			<span class="version">v2.6.0</span>
		</div>
		<div class="system-status">
			<div class="stat-item">
				<span class="label">CPU</span>
				<div class="bar-container"><div class="bar" style="width: 45%"></div></div>
			</div>
			<div class="stat-item">
				<span class="label">WS</span>
				<span class="status-val green">CONNECTED</span>
			</div>
			<div class="status">
				<span class="live-dot"></span> LIVE FEED
			</div>
		</div>
	</header>

	<main class="player-zone glass-panel">
		<div class="panel-label">MAIN_VIEWPORT</div>
		{#if $currentSong}
			{#if $currentSong.videoId}
				<div class="video-wrapper">
					<VideoPlayer on:next={advance} />
				</div>
				<div class="now-playing-info">
					<div class="info-header">
						<span class="tag">NOW PLAYING</span>
						<span class="duration">04:20</span>
					</div>
					<h2 class="song-title">{$currentSong.title}</h2>
					<div class="info-footer">
						<div class="channel-badge">{$currentSong.channelTitle}</div>
						<div class="video-id">ID: {$currentSong.videoId}</div>
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
		<div class="panel-label">QUEUE_BUFFER</div>
		<div class="queue-header">
			<h3>UP NEXT</h3>
			<div class="queue-meta">
				<span class="label">ITEMS:</span>
				<span class="count">{$queue.length}</span>
			</div>
		</div>
		<div class="queue-content">
			<Queue />
		</div>
		<div class="queue-footer">
			<div class="scroll-indicator">
				<div class="dot active"></div>
				<div class="dot"></div>
				<div class="dot"></div>
			</div>
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
		grid-template-rows: 70px 1fr 35%;
		gap: var(--gap);
		padding: var(--gap);
		box-sizing: border-box;
		position: relative;
		z-index: 10;
	}

	@media (min-width: 1024px) {
		.app-container {
			grid-template-columns: 1fr 380px;
			grid-template-rows: 70px 1fr;
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

	/* Panel Label */
	.panel-label {
		position: absolute;
		top: 0;
		right: 2rem;
		background: var(--neon-cyan);
		color: #000;
		font-family: var(--font-pixel);
		font-size: 0.5rem;
		padding: 2px 6px;
		transform: translateY(-50%);
		z-index: 20;
		letter-spacing: 0.1em;
	}

	/* Header */
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 2rem;
		background: rgba(0,0,0,0.6);
		border-bottom: 2px solid var(--neon-cyan);
		box-shadow: 0 4px 20px rgba(0, 243, 255, 0.1);
	}
	.logo {
		display: flex;
		align-items: baseline;
		gap: 1rem;
	}
	.logo .glitch {
		font-family: var(--font-display);
		font-weight: 900;
		font-size: 1.75rem;
		letter-spacing: 0.2em;
		color: var(--neon-cyan);
		position: relative;
		text-shadow: 0 0 10px rgba(0,243,255,0.4);
	}
	.version {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--text-dim);
		opacity: 0.6;
	}

	.system-status {
		display: flex;
		align-items: center;
		gap: 2rem;
	}
	.stat-item {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.stat-item .label {
		font-family: var(--font-mono);
		font-size: 0.5rem;
		color: var(--text-dim);
	}
	.stat-item .status-val {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		font-weight: 700;
	}
	.bar-container {
		width: 60px;
		height: 4px;
		background: rgba(255,255,255,0.1);
		position: relative;
	}
	.bar-container .bar {
		height: 100%;
		background: var(--neon-purple);
		box-shadow: 0 0 5px var(--neon-purple);
	}

	.status {
		font-family: var(--font-pixel);
		font-size: 0.6rem;
		color: var(--neon-green);
		display: flex;
		align-items: center;
		gap: 0.75rem;
		background: rgba(0, 255, 0, 0.05);
		padding: 4px 10px;
		border: 1px solid rgba(0, 255, 0, 0.2);
	}
	.live-dot {
		width: 6px;
		height: 6px;
		background: var(--neon-green);
		border-radius: 50%;
		box-shadow: 0 0 8px var(--neon-green);
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
	.video-wrapper::before {
		content: "";
		position: absolute;
		top: 0; left: 0; width: 100%; height: 100%;
		border: 1px solid rgba(255,255,255,0.05);
		pointer-events: none;
		z-index: 5;
	}

	.now-playing-info {
		padding: 1.5rem 2rem;
		background: linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 100%);
		border-top: 1px solid var(--glass-border);
	}
	.info-header {
		display: flex;
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}
	.info-header .tag {
		font-family: var(--font-pixel);
		font-size: 0.5rem;
		color: var(--neon-pink);
		letter-spacing: 0.2em;
	}
	.info-header .duration {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--text-dim);
	}
	.song-title {
		font-size: 1.5rem;
		margin-bottom: 1rem;
		color: #fff;
		font-weight: 800;
		line-height: 1.2;
		display: -webkit-box;
		-webkit-line-clamp: 2;
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
		font-size: 0.75rem;
		color: var(--neon-cyan);
		background: rgba(0, 243, 255, 0.05);
		padding: 4px 10px;
		border: 1px solid rgba(0, 243, 255, 0.2);
	}
	.video-id {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--text-muted);
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
		font-size: 0.85rem;
		color: #fff;
		font-family: var(--font-pixel);
	}
	.queue-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.queue-meta .label {
		font-size: 0.5rem;
		color: var(--text-dim);
		font-family: var(--font-mono);
	}
	.queue-meta .count {
		background: var(--neon-cyan);
		color: #000;
		padding: 1px 6px;
		font-size: 0.7rem;
		font-family: var(--font-mono);
		font-weight: 800;
	}
	.queue-content {
		flex: 1;
		overflow-y: auto;
		padding: 1rem;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}
	.queue-footer {
		padding: 1rem;
		border-top: 1px solid var(--glass-border);
		display: flex;
		justify-content: center;
		background: rgba(0,0,0,0.2);
	}
	.scroll-indicator {
		display: flex;
		gap: 6px;
	}
	.scroll-indicator .dot {
		width: 4px;
		height: 4px;
		background: var(--text-muted);
	}
	.scroll-indicator .dot.active {
		background: var(--neon-cyan);
		box-shadow: 0 0 5px var(--neon-cyan);
	}

	/* Layers */
	.toasts-layer {
		position: fixed;
		top: 2rem;
		right: 2rem;
		z-index: 2000;
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		pointer-events: none;
	}
	.fab-layer {
		position: fixed;
		bottom: 2.5rem;
		right: 2.5rem;
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