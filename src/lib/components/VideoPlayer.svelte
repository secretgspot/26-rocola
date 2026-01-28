<script>
	import { onMount, onDestroy, createEventDispatcher } from 'svelte';
	import { createPlayer } from '$lib/client/youtube-player';
	import { currentSong, previousSong } from '$lib/client/stores.js';
	import { get } from 'svelte/store';

	let el;
	let player = null;
	let isFullscreen = false;

	const dispatch = createEventDispatcher();

	onMount(async () => {
		// lazy create player
		player = await createPlayer(el.id, { videoId: get(currentSong)?.videoId });

		// auto-play whenever currentSong changes
		$currentSong = get(currentSong);
		$previousSong = get(previousSong);
	});

	$: if (player) {
		const cs = get(currentSong);
		if (cs?.videoId) {
			player.load(cs.videoId, true);
			// attempt to play (may be blocked by autoplay policies)
			try { player.play(); } catch (e) { /* ignore */ }
		}
	}

	function next() {
		dispatch('next');
	}

	function toggleFullscreen() {
		if (!document.fullscreenElement) {
			el.requestFullscreen().then(() => isFullscreen = true).catch(() => {});
		} else {
			document.exitFullscreen().then(() => isFullscreen = false).catch(() => {});
		}
	}

	onDestroy(() => {
		player?.destroy?.();
	});
</script>

<style>
	.video-wrap { height: 69vh; display:flex; flex-direction:column; gap:.5rem; align-items:center; justify-content:center; background:var(--video-bg,#000) }
	.player-frame { width:100%; height:100%; display:flex; align-items:center; justify-content:center }
	.controls { display:flex; gap:.5rem; align-items:center }
	.prev { opacity:.9; font-size:0.95rem; color:var(--muted,#ccc) }
</style>

<div class="video-wrap">
	{#if $previousSong}
		<div class="prev">Previous: {$previousSong.title} — {$previousSong.channelTitle}</div>
	{/if}
	<div class="player-frame">
		<div id="yt-player-video" bind:this={el} style="width:100%; height:100%; max-width:1280px;"></div>
	</div>
	<div class="controls">
		<button on:click={next}>Next (dev)</button>
		<button on:click={toggleFullscreen}>{isFullscreen ? 'Exit full' : 'Fullscreen'}</button>
	</div>
</div>