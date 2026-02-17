<script>
	import { playerState } from '$lib/client/stores.svelte.js';
	import { getTierConfig } from '$lib/config.js';
	let { item } = $props();

	// Determine tier for styling
	let tier = $derived((item.tier || item.tierName || 'free').toLowerCase());

	// Format title: if it contains " - ", split it for better hierarchy
	let displayTitle = $derived(item.title || item.song?.title || 'Untitled');
	let titleParts = $derived(
		displayTitle.includes(' - ') ? displayTitle.split(' - ') : [displayTitle],
	);
	let artist = $derived(
		titleParts.length > 1
			? titleParts[0]
			: item.channelTitle || item.song?.channelTitle || 'Unknown Artist',
	);
	let track = $derived(
		titleParts.length > 1 ? titleParts.slice(1).join(' - ') : displayTitle,
	);

	// Cooldown logic
	let tierConfig = $derived(getTierConfig(tier));
	let gap = $derived(tierConfig.gap);
	let nextEligible = $derived((item.lastPlayedTurn || 0) + gap);
	let isCooldown = $derived(playerState.currentTurn < nextEligible);
	let turnsToReady = $derived(nextEligible - playerState.currentTurn);
</script>

<div class="item {tier}" class:cooldown={isCooldown}>
	<div class="thumb-container">
		<div class="thumb">
			{#if item.song?.thumbnail || item.thumbnail}
				<img src={item.song?.thumbnail || item.thumbnail} alt="" loading="lazy" />
			{:else}
				<div class="icon">[NO_IMG]</div>
			{/if}
		</div>
	</div>

	<div class="meta">
		<div class="artist-row">
			<span class="artist">{artist}</span>
			{#if isCooldown}
				<span class="cooldown-tag">CD:{turnsToReady}</span>
			{/if}
		</div>
		<div class="track" title={track}>{track}</div>
	</div>

	<div class="stats">
		{#if item.playsRemainingToday !== undefined}
			<div class="plays-badge">
				<span class="label">RMN:</span>
				<span class="count">{item.playsRemainingToday.toString().padStart(2, '0')}</span>
			</div>
		{/if}
		<div class="entry-id">{tier.toUpperCase()}</div>
	</div>
</div>

<style>
	.item {
		display: flex;
		align-items: center;
		gap: var(--size-3);
		padding: var(--size-2) var(--size-3);
		background: transparent;
		border: 0;
		transition: background var(--transition-duration-1) ease, color var(--transition-duration-1) ease;
		position: relative;
		min-width: 0;
	}

	.item:hover {
		background: color-mix(in srgb, var(--text-main) 6%, transparent);
	}

		.item:hover .artist,
		.item:hover .track,
		.item:hover .entry-id,
		.item:hover .plays-badge .label,
		.item:hover .plays-badge .count,
	.item:hover .cooldown-tag {
		color: inherit;
	}

	.item:hover .thumb {
		border-color: var(--border-main);
	}

	.thumb-container {
		position: relative;
		width: 50px;
		height: 38px;
		flex-shrink: 0;
	}
	.thumb {
		width: 100%;
		height: 100%;
		background: var(--bg-dark);
		position: relative;
		overflow: hidden;
		border: 0;
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.8;
		filter: grayscale(1);
	}
	.item:hover img {
		opacity: 1;
		filter: grayscale(1) contrast(1.2);
	}

	.thumb .icon {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		font-size: var(--font-size-00);
		color: var(--text-muted);
	}

	.meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.artist-row {
		display: flex;
		align-items: center;
		gap: var(--size-2);
	}
	.artist {
		font-size: var(--font-size-00);
		color: var(--text-dim);
		text-transform: uppercase;
		font-weight: var(--font-weight-4);
		letter-spacing: 0.12em;
	}
	.track {
		font-size: var(--font-size-0);
		font-weight: var(--font-weight-7);
		color: var(--text-main);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		text-transform: uppercase;
	}

	.cooldown-tag {
		font-size: var(--font-size-00);
		font-weight: var(--font-weight-8);
		color: var(--text-muted);
		border: 0;
		padding: 0 var(--size-1);
		letter-spacing: 0.08em;
	}

	.item.cooldown {
		opacity: 0.5;
	}

	.stats {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--size-1);
	}
	.plays-badge {
		display: flex;
		align-items: center;
		gap: var(--size-1);
	}
	.plays-badge .label {
		font-size: var(--font-size-00);
		color: var(--text-muted);
	}
	.plays-badge .count {
		font-size: var(--font-size-0);
		font-weight: var(--font-weight-8);
		color: var(--text-dim);
	}
	.entry-id {
		font-size: var(--font-size-00);
		color: var(--text-muted);
		letter-spacing: 0.12em;
	}
	.item.free .entry-id { color: var(--text-muted); }
	.item.silver .entry-id {
		color: var(--tier-silver);
	}
	.item.gold .entry-id { color: var(--tier-gold); }
	.item.platinum .entry-id { color: #7de3ff; }

	/* Tier specific accents */
	.item.free .track {
		color: var(--text-dim);
		font-weight: var(--font-weight-5);
	}
	.item.platinum .track {
		color: #7de3ff;
	}
	.item.gold .track {
		font-style: italic;
		color: var(--tier-gold);
	}
	.item.silver .track {
		color: var(--tier-silver);
	}
</style>
