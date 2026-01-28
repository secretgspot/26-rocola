<script>
	/**
	 * @typedef {{
	 *  id: number|string,
	 *  title: string,
	 *  channelTitle?: string,
	 *  tierName?: string,
	 *  playsRemainingToday?: number
	 * }} QueueItem
	 */

	export let item;
</script>

<style>
	.item { display:flex; align-items:center; gap:0.75rem; padding:.6rem; border-radius:8px; background:var(--card-bg,#fff); box-shadow: 0 2px 6px rgba(0,0,0,0.04) }
	.meta { flex:1 }
	.title { font-weight:600 }
	.sub { font-size:0.85rem; color:var(--muted,#666) }
	.tier { font-size:0.75rem; padding:.2rem .5rem; border-radius:999px; background:rgba(0,0,0,0.05) }
	.item:hover { transform: translateY(-2px); transition: transform .14s ease }
</style>

<div class="item">
	<div class="meta">
		<div class="title">{item.title ?? item.song?.title}</div>
		<div class="sub">{item.channelTitle ?? item.song?.channelTitle ?? 'Unknown channel'}</div>
	</div>
	<div style="display:flex;align-items:center;gap:.6rem">
		{#if item.playsRemainingToday}
			<div class="sub">🕒 {item.playsRemainingToday}</div>
		{/if}
		{#if item.tierName}
			<div class="tier">{item.tierName}</div>
		{/if}
	</div>
</div>
