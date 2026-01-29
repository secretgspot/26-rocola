<script>
	import { onDestroy } from 'svelte';
	import { createPlayer } from '$lib/client/youtube-player';
	import { playerState, addToast } from '$lib/client/stores.svelte.js';

	let { onnext, ontimeupdate } = $props();

	let el = $state();
	let player = $state(null);
	let progress = $state(0);
	let duration = $state(0);
	let currentTime = $state(0);
	/** @type {any} */
	let progressInterval = $state();

	$effect(() => {
		if (el && !player) {
			createPlayer(el.id, { 
				videoId: playerState.currentSong?.videoId,
				onStateChange: (e) => {
					// YT.PlayerState.ENDED is 0
					if (e.data === 0) {
						onnext?.();
					}
				},
				onError: (e) => {
					const errorMsgs = {
						2: 'Invalid parameter',
						5: 'HTML5 player error',
						100: 'Video not found/removed',
						101: 'Embed blocked by owner',
						150: 'Embed blocked by owner'
					};
					// @ts-ignore
					const msg = errorMsgs[e.data] || 'Playback error';
					addToast({ message: `Skipping: ${msg}`, level: 'warn' });
					onnext?.();
				}
			}).then(p => {
				player = p;
				// Auto play if we have a song
				if (playerState.currentSong?.videoId) {
					player.load(playerState.currentSong.videoId, true);
				}
			});
		}

		// Start progress tracking
		progressInterval = setInterval(() => {
			if (player && typeof player._raw?.getCurrentTime === 'function') {
				currentTime = player.getCurrentTime();
				duration = player._raw.getDuration() || 0;
				if (duration > 0) {
					progress = (currentTime / duration) * 100;
					ontimeupdate?.({ progress });
				}
			}
		}, 500);

		return () => {
			clearInterval(progressInterval);
			player?.destroy?.();
		};
	});

	// React to song changes
	$effect(() => {
		if (player && playerState.currentSong?.videoId) {
			player.load(playerState.currentSong.videoId, true);
		}
	});
</script>

<div class="video-container">
	<div id="yt-player-video" bind:this={el} class="yt-embed"></div>
	
	<div class="corner-accents">
		<div class="accent top-left"></div>
		<div class="accent top-right"></div>
		<div class="accent bottom-left"></div>
		<div class="accent bottom-right"></div>
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

	.corner-accents {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		pointer-events: none;
		z-index: 10;
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
</style>