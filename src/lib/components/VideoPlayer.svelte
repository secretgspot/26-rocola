<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { createPlayer } from '$lib/client/youtube-player';
	import { currentSong, previousSong } from '$lib/client/stores.js';
	import { get } from 'svelte/store';

	let el;
	let player = null;

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
	});

	$: if (player && $currentSong?.videoId) {
		player.load($currentSong.videoId, true);
	}

	function next() { dispatch('next'); }

	onDestroy(() => {
		player?.destroy?.();
	});
</script>

<div class="video-container">
	<div id="yt-player-video" bind:this={el} class="yt-embed"></div>
	
	<!-- Overlay Controls (appear on hover) -->
	<div class="controls-overlay">
		<div class="info-bar">
			{#if $previousSong}
				<div class="prev-song">
					<span class="label">PREVIOUS:</span>
					<span class="val">{$previousSong.title}</span>
				</div>
			{/if}
		</div>
		<div class="actions">
			{#if import.meta.env.DEV}
				<button class="btn-icon warn" on:click={next} title="Force Next (Dev)">
					[ >> ]
				</button>
			{/if}
		</div>
	</div>
</div>

<style>
	.video-container {
		width: 100%;
		height: 100%;
		position: relative;
		background: #000;
	}

	.yt-embed {
		width: 100%;
		height: 100%;
	}

	.controls-overlay {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		padding: 1rem;
		box-sizing: border-box;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		opacity: 0;
		transition: opacity 0.3s;
		background: linear-gradient(to bottom, rgba(0,0,0,0.8), transparent 40%);
		pointer-events: none;
	}

	.video-container:hover .controls-overlay {
		opacity: 1;
		pointer-events: auto;
	}

	.info-bar {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: rgba(255,255,255,0.7);
	}
	.prev-song .label { color: var(--text-dim); margin-right: 0.5rem; }
	.prev-song .val { color: #fff; }

	.actions {
		display: flex;
		gap: 0.5rem;
	}

	.btn-icon {
		background: rgba(0,0,0,0.5);
		border: 1px solid rgba(255,255,255,0.2);
		color: #fff;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		padding: 0.5rem;
		cursor: pointer;
		border-radius: 4px;
	}
	.btn-icon:hover {
		background: rgba(255,255,255,0.1);
		border-color: #fff;
	}
	.btn-icon.warn {
		color: var(--tier-gold);
		border-color: var(--tier-gold);
	}
	.btn-icon.warn:hover {
		background: rgba(255, 215, 0, 0.1);
	}
</style>
