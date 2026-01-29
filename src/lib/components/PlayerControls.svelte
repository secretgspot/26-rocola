<script>
	import { onDestroy } from 'svelte';
	import { createPlayer } from '$lib/client/youtube-player';
	import { playerState } from '$lib/client/stores.svelte.js';

	let { onnext } = $props();
	let playerController = $state(null);
	let playerEl = $state();

	$effect(() => {
		if (playerEl && !playerController) {
			createPlayer(playerEl.id, {
				videoId: playerState.currentSong?.videoId || ''
			}).then(p => {
				playerController = p;
			});
		}
		return () => playerController?.destroy?.();
	});

	$effect(() => {
		if (playerController) {
			if (playerState.currentSong && playerState.currentSong.videoId) {
				playerController.load(playerState.currentSong.videoId);
			} else {
				playerController.stop();
			}
		}
	});

	function play() { playerController?.play(); }
	function pause() { playerController?.pause(); }
	function next() { onnext?.(); }
	function seek(delta) {
		if (!playerController) return;
		const current = typeof playerController._raw?.getCurrentTime === 'function' ? playerController._raw.getCurrentTime() : 0;
		playerController.seek(current + delta);
	}
</script>

<style>
	.controls { display:flex; gap:.5rem; align-items:center }
	button { padding:.5rem .65rem; border-radius:6px; border:0; color:#fff; cursor: pointer; }
	button.ghost { background:transparent; border:1px solid rgba(255,255,255,0.06); color:inherit }
</style>

<div>
	<div bind:this={playerEl} id="yt-player-controls" style="width:100%; max-width:720px; height:360px; margin-bottom:.6rem"></div>
	<div class="controls">
		<button onclick={play}>▶ Play</button>
		<button onclick={pause} class="ghost">⏸ Pause</button>
		<button onclick={() => seek(-10)} class="ghost">⏪ -10s</button>
		<button onclick={() => seek(10)} class="ghost">+10s ⏩</button>
		<button onclick={next} style="margin-left:auto">Next ⏭</button>
	</div>
</div>