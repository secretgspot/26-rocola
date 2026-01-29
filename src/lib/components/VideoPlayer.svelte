<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { createPlayer } from '$lib/client/youtube-player';
	import { currentSong, previousSong } from '$lib/client/stores.js';
	import { get } from 'svelte/store';
	import { fade, fly } from 'svelte/transition';

	let el;
	let player = null;
	let progress = 0;
	let duration = 0;
	let currentTime = 0;
	let progressInterval;

	// 'Live' decoder stats simulation
	let bitrate = 4500;
	let latency = 42;
	let buffer = 100;
	let statsInterval;

	const dispatch = createEventDispatcher();

	onMount(async () => {
		// lazy create player
		player = await createPlayer(el.id, { 
			videoId: get(currentSong)?.videoId,
			onStateChange: (e) => {
				// YT.PlayerState.ENDED is 0
				if (e.data === 0) {
					next();
				}
			}
		});

		// Start progress tracking
		progressInterval = setInterval(() => {
			if (player && typeof player._raw?.getCurrentTime === 'function') {
				currentTime = player.getCurrentTime();
				duration = player._raw.getDuration() || 0;
				if (duration > 0) {
					progress = (currentTime / duration) * 100;
				}
			}
		}, 500);

		// Start stats simulation
		statsInterval = setInterval(() => {
			bitrate = 4200 + Math.floor(Math.random() * 600);
			latency = 35 + Math.floor(Math.random() * 15);
			buffer = 95 + Math.floor(Math.random() * 5);
		}, 2000);
	});

	$: if (player && $currentSong?.videoId) {
		player.load($currentSong.videoId, true);
	}

	function next() { dispatch('next'); }

	onDestroy(() => {
		player?.destroy?.();
		clearInterval(progressInterval);
		clearInterval(statsInterval);
	});
</script>

<div class="video-container">
	<div id="yt-player-video" bind:this={el} class="yt-embed"></div>
	
	<!-- Overlay Controls (appear on hover) -->
	<div class="controls-overlay">
		<div class="overlay-top">
			<div class="stream-info">
				<div class="live-indicator">
					<div class="dot"></div>
					<span>SIGNAL_STABLE</span>
				</div>
				{#if $previousSong}
					<div class="prev-song" in:fly={{x: -20}}>
						<span class="label">LAST_SEQUENCE:</span>
						<span class="val">{$previousSong.title}</span>
					</div>
				{/if}
			</div>
			
			<div class="actions">
				{#if import.meta.env.DEV}
					<button class="btn-action dev" on:click={next} title="Force Next (Dev)">
						<span class="icon">>></span>
						<span class="text">SKIP_BUFFER</span>
					</button>
				{/if}
			</div>
		</div>

		<div class="overlay-bottom">
			<div class="decoder-stats">
				<div class="stat">BITRATE: {bitrate}kbps</div>
				<div class="stat">LATENCY: {latency}ms</div>
				<div class="stat">BUFFER: {buffer}%</div>
			</div>
			<div class="playback-bar">
				<div class="progress-fill" style="width: {progress}%"></div>
			</div>
		</div>

		<div class="corner-accents">
			<div class="accent top-left"></div>
			<div class="accent top-right"></div>
			<div class="accent bottom-left"></div>
			<div class="accent bottom-right"></div>
		</div>
	</div>
</div>

<style>
	.video-container {
		width: 100%;
		height: 100%;
		position: relative;
		background: #000;
		overflow: hidden;
	}

	.yt-embed {
		width: 100%;
		height: 100%;
		transform: scale(1.01); /* Hide potential YT borders */
	}

	.controls-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		padding: 1.5rem;
		box-sizing: border-box;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		opacity: 0;
		transition: all 0.4s cubic-bezier(0.23, 1, 0.32, 1);
		background: radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.6) 100%);
		pointer-events: none;
		z-index: 10;
	}

	.video-container:hover .controls-overlay {
		opacity: 1;
		pointer-events: auto;
	}

	.overlay-top {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		z-index: 5;
	}

	.stream-info {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.live-indicator {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(0,0,0,0.7);
		padding: 4px 8px;
		border-left: 2px solid var(--neon-green);
	}
	.live-indicator .dot {
		width: 6px;
		height: 6px;
		background: var(--neon-green);
		border-radius: 50%;
		box-shadow: 0 0 5px var(--neon-green);
		animation: pulse 1s infinite;
	}
	.live-indicator span {
		font-family: var(--font-pixel);
		font-size: 0.45rem;
		color: var(--neon-green);
		letter-spacing: 0.1em;
	}

	.prev-song {
		background: rgba(0,0,0,0.7);
		padding: 6px 10px;
		border-left: 2px solid var(--text-muted);
		max-width: 300px;
	}
	.prev-song .label {
		display: block;
		font-family: var(--font-pixel);
		font-size: 0.35rem;
		color: var(--text-dim);
		margin-bottom: 2px;
	}
	.prev-song .val {
		display: block;
		font-family: var(--font-mono);
		font-size: 0.65rem;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.actions {
		display: flex;
		gap: 1rem;
	}

	.btn-action {
		background: rgba(0,0,0,0.8);
		border: 1px solid var(--glass-border);
		color: #fff;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 1rem;
		cursor: pointer;
		transition: all 0.2s;
	}
	.btn-action .icon {
		font-family: var(--font-mono);
		font-weight: 700;
		color: var(--neon-cyan);
	}
	.btn-action .text {
		font-family: var(--font-pixel);
		font-size: 0.45rem;
		letter-spacing: 0.1em;
	}
	.btn-action:hover {
		border-color: var(--neon-cyan);
		box-shadow: 0 0 15px rgba(0, 243, 255, 0.2);
		transform: translateY(-2px);
	}
	.btn-action.dev {
		border-color: var(--tier-gold);
	}
	.btn-action.dev:hover {
		background: var(--tier-gold);
		color: #000;
	}
	.btn-action.dev:hover .icon { color: #000; }

	.overlay-bottom {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		z-index: 5;
	}
	.decoder-stats {
		display: flex;
		gap: 1.5rem;
		font-family: var(--font-mono);
		font-size: 0.5rem;
		color: var(--text-muted);
		background: rgba(0,0,0,0.5);
		padding: 4px 10px;
		width: max-content;
	}
	.playback-bar {
		width: 100%;
		height: 2px;
		background: rgba(255,255,255,0.1);
		position: relative;
	}
	.playback-bar .progress-fill {
		position: absolute;
		top: 0; left: 0; height: 100%;
		background: var(--neon-cyan);
		box-shadow: 0 0 10px var(--neon-cyan);
		transition: width 0.5s linear;
	}

	.corner-accents {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
	}

	.corner-accents .accent {
		position: absolute;
		width: 20px;
		height: 20px;
		border: 1px solid var(--neon-cyan);
		opacity: 0.4;
	}
	.accent.top-left { top: 1rem; left: 1rem; border-right: 0; border-bottom: 0; }
	.accent.top-right { top: 1rem; right: 1rem; border-left: 0; border-bottom: 0; }
	.accent.bottom-left { bottom: 1rem; left: 1rem; border-right: 0; border-top: 0; }
	.accent.bottom-right { bottom: 1rem; right: 1rem; border-left: 0; border-top: 0; }

	@keyframes pulse {
		0% { opacity: 1; }
		50% { opacity: 0.4; }
		100% { opacity: 1; }
	}
</style>
