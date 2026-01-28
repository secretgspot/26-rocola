<script>
	import { queue } from '$lib/client/stores.js';
	import QueueItem from '$lib/components/QueueItem.svelte';
	import { derived } from 'svelte/store';
	import { fly } from 'svelte/transition';
	
	export let showCount = 3;
	let expanded = false;

	const shortList = derived(queue, ($q) => $q.slice(0, showCount));
</script>

<style>
	.queue-wrap { margin-top: .6rem }
	.header { display:flex; align-items:center; gap:.5rem }
	.expander { margin-left:auto; font-size:0.9rem }
	.list { margin-top:.5rem }
</style>

<div class="queue-wrap">
	<div class="header">
		<h3>Upcoming</h3>
		<div class="expander">{ $queue.length } total</div>
		<button class="expander" on:click={() => expanded = !expanded}>{expanded ? 'Show less' : `Show all`}</button>
	</div>
	<div class="list">
		{#if expanded}
			{#each $queue as item (item.id)}
				<div in:fly={{ y: 6, duration: 180 }} style="margin-bottom:.35rem"><QueueItem {item} /></div>
			{/each}
		{:else}
			{#each $shortList as item (item.id)}
				<div in:fly={{ y: 6, duration: 180 }} style="margin-bottom:.35rem"><QueueItem {item} /></div>
			{/each}
		{/if}
	</div>
</div>