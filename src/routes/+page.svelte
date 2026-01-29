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

	<!-- Main Grid -->
	<header class="top-bar glass-panel">
		<div class="logo">
			<span class="glitch" data-text="ROCOLA">ROCOLA</span>
		</div>
		<div class="status">
			<span class="live-dot"></span> LIVE
		</div>
	</header>

	<main class="player-zone glass-panel">
		{#if $currentSong}
			{#if $currentSong.videoId}
				<div class="video-wrapper">
					<VideoPlayer on:next={advance} />
				</div>
				<div class="now-playing-info">
					<h2 class="song-title">{$currentSong.title}</h2>
					<div class="channel-badge">{$currentSong.channelTitle}</div>
				</div>
			{:else}
				<div class="empty-state">
					<p>No playable song</p>
				</div>
			{/if}
		{:else}
							<div class="empty-state">
								<div class="pulse-ring"></div>
								<p class="glitch-text" data-text="SYSTEM IDLE">SYSTEM IDLE</p>
								<p class="sub-text">WAITING FOR SEQUENCE...</p>
							</div>		{/if}
	</main>

	<aside class="queue-zone glass-panel">
		<div class="queue-header">
			<h3>UP NEXT</h3>
			<span class="count">{$queue.length}</span>
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
		grid-template-rows: 60px 1fr 35%; /* Default mobile: Header / Player / Queue */
		gap: var(--gap, 1rem);
		padding: var(--gap, 1rem);
		box-sizing: border-box;
		position: relative;
	}

	@media (min-width: 768px) {
		.app-container {
			grid-template-rows: 60px 1fr 280px; /* Header / Player / Queue Fixed Height */
			max-width: 1200px;
			margin: 0 auto;
		}
	}
	
	@media (min-height: 800px) and (min-width: 1024px) {
		.app-container {
			grid-template-rows: 70px 1fr 30%; /* Taller screens get % split */
		}
	}

	/* Header */
	.top-bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 1.5rem;
		background: rgba(0,0,0,0.4);
		border-color: rgba(255,255,255,0.05);
	}
	.logo {
		font-family: var(--font-display);
		font-weight: 900;
		font-size: 1.5rem;
		letter-spacing: 0.1em;
		color: var(--neon-cyan);
		text-shadow: 0 0 10px rgba(0,243,255,0.4);
	}
	.status {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--neon-green);
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.live-dot {
		width: 8px;
		height: 8px;
		background: var(--neon-green);
		border-radius: 50%;
		box-shadow: 0 0 8px var(--neon-green);
		animation: pulse 2s infinite;
	}

	/* Player Zone */
	.player-zone {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		position: relative;
		border: 1px solid rgba(0,243,255,0.1);
		box-shadow: 0 0 20px rgba(0,0,0,0.3);
	}
	.video-wrapper {
		flex: 1;
		width: 100%;
		background: #000;
		position: relative;
	}
	.now-playing-info {
		padding: 1rem 1.5rem;
		background: linear-gradient(to top, rgba(0,0,0,0.8), transparent);
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		pointer-events: none;
	}
	.song-title {
		font-size: 1.2rem;
		text-shadow: 0 2px 4px rgba(0,0,0,0.8);
		margin-bottom: 0.25rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.channel-badge {
		display: inline-block;
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--neon-pink);
		background: rgba(255, 0, 110, 0.1);
		padding: 2px 6px;
		border-radius: 4px;
		border: 1px solid rgba(255, 0, 110, 0.3);
	}
	
	.empty-state {
		flex: 1;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--text-dim);
		font-family: var(--font-mono);
		gap: 0.5rem;
		background: radial-gradient(circle, rgba(0, 243, 255, 0.03) 0%, transparent 70%);
	}
	.pulse-ring {
		width: 60px;
		height: 60px;
		border: 2px solid var(--neon-cyan);
		border-radius: 50%;
		margin-bottom: 1rem;
		animation: ring-pulse 2s infinite;
		opacity: 0.5;
	}
	.glitch-text {
		font-size: 1rem;
		color: #fff;
		letter-spacing: 0.3em;
		position: relative;
	}
	.sub-text {
		font-size: 0.6rem;
		color: var(--neon-pink);
		opacity: 0.6;
	}

	@keyframes ring-pulse {
		0% { transform: scale(0.8); opacity: 0.5; }
		50% { transform: scale(1.2); opacity: 0.1; }
		100% { transform: scale(0.8); opacity: 0.5; }
	}

	/* Queue Zone */
	.queue-zone {
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}
	.queue-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--glass-border);
		display: flex;
		justify-content: space-between;
		align-items: center;
		background: rgba(0,0,0,0.2);
	}
	.queue-header h3 {
		font-size: 0.9rem;
		color: var(--text-dim);
	}
	.queue-header .count {
		background: var(--glass-border);
		padding: 2px 8px;
		border-radius: 10px;
		font-size: 0.7rem;
		font-family: var(--font-mono);
	}
	.queue-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem;
	}

	/* Layers */
	.toasts-layer {
		position: fixed;
		bottom: 2rem;
		right: 2rem;
		z-index: 2000;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		pointer-events: none;
	}
	.fab-layer {
		position: fixed;
		bottom: 2rem;
		right: 2rem; /* Aligned with toasts but handled by the component */
		z-index: 1000;
	}

	@keyframes pulse {
		0% { opacity: 1; }
		50% { opacity: 0.4; }
		100% { opacity: 1; }
	}
</style>