<script>
	import { onMount } from 'svelte';
	import { queue, currentSong, previousSong, devSeeded, toasts, initRealtime, addToast } from '$lib/client/stores.js';
	import Toast from '$lib/components/Toast.svelte';
	import Queue from '$lib/components/Queue.svelte';
	import AddToQueue from '$lib/components/AddToQueue.svelte';
	import VideoPlayer from '$lib/components/VideoPlayer.svelte';
	import { fly } from 'svelte/transition';

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
		// if server returned next, update client stores immediately
		if (data.next) {
			// save previous then set the current immediately
			previousSong.set($currentSong);
			currentSong.set(data.next);
			// refresh queue from server snapshot (best-effort), excluding the now playing
			try {
				const qRes = await fetch('/api/queue');
				const qData = await qRes.json();
				const items = (qData.queue || []).map((r) => ({ ...r.left, song: r.right }));
				// filter out items that are not playable and exclude the now-playing
				const currentSongId = data.next.songId ?? data.next.id ?? data.next.videoId;
				const filtered = items.filter((it) => {
					const playsLeft = it.playsRemainingToday ?? it.song?.playsRemainingToday ?? 1;
					const available = (it.song?.isAvailable ?? 1) === 1;
					const id = it.song?.id ?? it.songId ?? it.id;
					return playsLeft > 0 && available && id !== currentSongId;
				});
				if (import.meta.env.DEV && !$devSeeded) {
					queue.set([]);
				} else {
					queue.set(filtered);
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

<style>
	:global(html, body, #svelte) { height: 100%; }

	/* Layout */
	.container { padding: 1.25rem; min-height:100vh; min-width:100vw; box-sizing:border-box; display:flex; flex-direction:column }
	.main-area { display:flex; flex-direction:column; gap: .8rem }
	.player { min-height: 69vh }
	.side { margin-top: .6rem }

	/* Controls & queue */
	.controls { display:flex; gap: .5rem; align-items:center }
	.queue { margin-top: 1rem }
	.queue-item { padding: .5rem; border-bottom: 1px solid #222 }

	/* Toasts */
	.toasts { position: fixed; right: 1rem; bottom: 1rem; display:flex; flex-direction:column; gap:.5rem; z-index:1000 }
	.toast { background: rgba(0,0,0,0.8); color: #fff; padding: .5rem 1rem; border-radius: 6px; box-shadow: 0 6px 20px rgba(0,0,0,0.6) }
	.toast.info { border-left: 4px solid #00d9ff }
	.toast.success { border-left: 4px solid #7CFC00 }
	.toast.warn { border-left: 4px solid #ffae42 }
</style>

<div class="container">
	<h1>Rocola — Minimal Player</h1>
	<div class="main-area">
	<!-- Toasts -->
	<div class="toasts">
		{#each $toasts as t (t.id)}
			<Toast message={t.message} level={t.level} />
		{/each}
	</div>

	<div class="player">
		{#if $currentSong}
			{#if $currentSong.videoId}
				<VideoPlayer on:next={advance} />
				<div style="margin-top:.5rem">
					<h3>{$currentSong.title}</h3>
					<div>{$currentSong.channelTitle}</div>
				</div>
			{:else}
				<p>No playable song</p>
			{/if}
		{:else}
			<p>Queue is empty</p>
		{/if}
	</div>
	</div>

	<div class="side">
		<AddToQueue />
		<Queue />
	</div>
</div>
