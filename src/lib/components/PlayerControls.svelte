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
	.controls { display:flex; gap: var(--size-2); align-items:center; padding: var(--size-2); }
	button { padding: var(--size-2) var(--size-3); border-radius: 0; border: var(--border-size-1) solid var(--border-main); background: var(--bg-dark); color: var(--text-main); cursor: pointer; font-size: var(--font-size-0); font-weight: var(--font-weight-7); }
	button:hover { background: var(--text-main); color: var(--bg-dark); border-color: var(--text-main); }
	button.ghost { background:transparent; border: var(--border-size-1) solid var(--border-dim); color: var(--text-dim); }
	button.ghost:hover { color: var(--text-main); border-color: var(--text-main); }
</style>

<div>
	<div bind:this={playerEl} id="yt-player-controls" style="width:100%; max-width:720px; height:360px; margin-bottom: var(--size-2); border: var(--border-size-1) solid var(--border-main);"></div>
	<div class="controls">
		<button onclick={play}>▶ PLAY</button>
		<button onclick={pause} class="ghost">⏸ PAUSE</button>
		<button onclick={() => seek(-10)} class="ghost">⏪ -10S</button>
		<button onclick={() => seek(10)} class="ghost">+10S ⏩</button>
		<button onclick={next} style="margin-left:auto">NEXT ⏭</button>
	</div>
</div>