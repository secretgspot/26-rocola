<script>
	import QueueItem from '$lib/components/QueueItem.svelte';
	import { fly } from 'svelte/transition';

	let { items = [], currentTurn = 0, emptyMessage = 'Queue is empty. Be the first!' } = $props();
</script>

<div class="list">
	{#if items.length === 0}
		<div class="empty-queue">{emptyMessage}</div>
	{:else}
		{#each items as item (item.id)}
			<div in:fly={{ y: 10, duration: 200 }} class="item-wrapper">
				<QueueItem {item} {currentTurn} />
			</div>
		{/each}
	{/if}
</div>

<style>
	.list {
		display: flex;
		flex-direction: column;
		gap: 0;
		padding: var(--size-2) var(--size-4) var(--size-2) var(--size-3);
		width: 100%;
		min-width: 0;
	}
	.empty-queue {
		text-align: center;
		padding: var(--size-5);
		color: var(--text-dim);
		font-family: var(--font-monospace-code);
		font-size: var(--font-size-1);
		opacity: 0.7;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}
</style>
