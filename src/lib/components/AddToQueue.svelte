<script>
	import { createEventDispatcher } from 'svelte';
	import { addToast } from '$lib/client/stores.js';

	let url = '';
	let validating = false;
	let metadata = null;
	let error = '';

	const dispatch = createEventDispatcher();

	async function validate() {
		error = '';
		validating = true;
		try {
			const res = await fetch('/api/youtube/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) });
			const data = await res.json();
			if (!data.ok) {
				error = data.error || 'Invalid video';
				metadata = null;
			} else {
				metadata = data.metadata || { title: 'Unknown', thumbnail: '', channelTitle: '' };
				metadata.videoId = data.videoId;
			}
		} catch (e) {
			error = 'Validation failed';
			metadata = null;
		} finally {
			validating = false;
		}
	}

	async function submit() {
		if (!metadata?.videoId) return;
		const res = await fetch('/api/queue', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ videoId: metadata.videoId, metadata }) });
		const data = await res.json();
		if (data.ok) {
			url = '';
			metadata = null;
			addToast({ message: 'Queued song', level: 'success' });
			dispatch('queued');
		} else {
			error = data.error || 'Failed to add song';
		}
	}
</script>

<style>
	.controls { display:flex; gap: .5rem; align-items:center }
	input { flex:1 }
</style>

<div>
	<div class="controls">
		<input placeholder="YouTube url or id" bind:value={url} />
		<button on:click={validate} disabled={validating}>{validating ? 'Validating...' : 'Validate'}</button>
		{#if metadata}
			<button on:click={submit}>Add to queue</button>
		{/if}
		{#if import.meta.env.DEV}
			<button on:click={async () => {
				import('$lib/client/stores.js').then(async ({ queue, currentSong, devSeeded }) => {
					try {
						const res = await fetch('/api/debug/seed', { method: 'POST' });
						const data = await res.json();
						if (data.ok) {
							addToast({ message: `Seeded ${data.seeded} items, removed ${data.removed} bad seeds`, level: 'success' });
							devSeeded.set(true);
					// refresh current and queue (filter out current from upcoming list)
					const cRes = await fetch('/api/queue/current');
					const cData = await cRes.json();
					currentSong.set(cData.current || null);
					const qRes = await fetch('/api/queue');
					const qData = await qRes.json();
					const items = (qData.queue || []).map((r) => ({ ...r.left, song: r.right }));
					if (cData?.current) {
						const currentSongId = cData.current.songId ?? cData.current.id ?? cData.current.videoId;
						queue.set(items.filter((it) => (it.song?.id ?? it.songId ?? it.id) !== currentSongId));
					} else {
						queue.set(items);
					}
						} else {
							addToast({ message: data.error || 'Seed failed', level: 'warn' });
						}
					} catch (e) {
						addToast({ message: 'Seed failed', level: 'warn' });
					}
				});
			}}>Seed queue (dev)</button>
		{/if}
	</div>
	{#if error}
		<p style="color:salmon">{error}</p>
	{/if}
	{#if metadata}
		<div style="margin-top:.5rem">
			<strong>{metadata.title}</strong>
			<div>{metadata.channelTitle}</div>
		</div>
	{/if}
</div>