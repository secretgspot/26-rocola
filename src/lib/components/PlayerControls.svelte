<script>
	import { createEventDispatcher, onMount } from 'svelte';
	import { createPlayer } from '$lib/client/youtube-player';
	import { get } from 'svelte/store';
	import { currentSong } from '$lib/client/stores';

	const dispatch = createEventDispatcher();
	let playerController = null;
	let playerEl;

	onMount(async () => {
		playerController = await createPlayer(playerEl.id, {
			videoId: get(currentSong)?.videoId || ''
		});
	});

	$: if (playerController) {
		if ($currentSong && $currentSong.videoId) {
			playerController.load($currentSong.videoId);
		} else {
			playerController.stop();
		}
	}

	function play() { playerController?.play(); }
	function pause() { playerController?.pause(); }
	function next() { dispatch('next'); }
	function seek(delta) {
		if (!playerController) return;
		const current = typeof playerController._raw?.getCurrentTime === 'function' ? playerController._raw.getCurrentTime() : 0;
		playerController.seek(current + delta);
	}
</script>

<style>
	.controls { display:flex; gap:.5rem; align-items:center }
	button { padding:.5rem .65rem; border-radius:6px; border:0; background:var(--accent,#2b8aee); color:#fff }
	button.ghost { background:transparent; border:1px solid rgba(0,0,0,0.08); color:inherit }
</style>

<div>
	<div bind:this={playerEl} id="yt-player" style="width:100%; max-width:720px; height:360px; margin-bottom:.6rem"></div>
	<div class="controls">
		<button on:click={play}>▶ Play</button>
		<button on:click={pause} class="ghost">⏸ Pause</button>
		<button on:click={() => seek(-10)} class="ghost">⏪ -10s</button>
		<button on:click={() => seek(10)} class="ghost">+10s ⏩</button>
		<button on:click={next} style="margin-left:auto">Next ⏭</button>
	</div>
</div>
