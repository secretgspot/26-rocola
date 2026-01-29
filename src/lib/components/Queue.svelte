<script>
	import { queue } from '$lib/client/stores.js';
	import QueueItem from '$lib/components/QueueItem.svelte';
	import { fly } from 'svelte/transition';
</script>

<div class="list">
	{#if $queue.length === 0}
		<div class="empty-queue">Queue is empty. Be the first!</div>
	{:else}
		{#each $queue as item (item.id)}
			<div in:fly={{ y: 10, duration: 200 }} class="item-wrapper">
				<QueueItem {item} />
			</div>
		{/each}
	{/if}
</div>

<style>
	.list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.empty-queue {
		text-align: center;
		padding: 2rem;
		color: var(--text-dim);
		font-family: var(--font-mono);
		font-size: 0.8rem;
		opacity: 0.7;
	}
</style>
