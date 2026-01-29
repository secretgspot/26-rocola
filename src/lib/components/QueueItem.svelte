<script>
	export let item;

	// Determine tier for styling
	$: tier = (item.tier || item.tierName || 'free').toLowerCase();
	
	// Format title: if it contains " - ", split it for better hierarchy
	$: titleParts = item.title.includes(' - ') ? item.title.split(' - ') : [item.title];
	$: artist = titleParts.length > 1 ? titleParts[0] : (item.channelTitle || 'Unknown Artist');
	$: track = titleParts.length > 1 ? titleParts.slice(1).join(' - ') : item.title;
</script>

<div class="item {tier}">
	<div class="rank-indicator">
		<div class="bar"></div>
	</div>
	
	<div class="thumb">
		{#if item.song?.thumbnail || item.thumbnail}
			<img src={item.song?.thumbnail || item.thumbnail} alt="" loading="lazy" />
		{:else}
			<div class="icon">🎵</div>
		{/if}
		<div class="tier-tag {tier}">{tier[0].toUpperCase()}</div>
	</div>
	
	<div class="meta">
		<div class="artist">{artist}</div>
		<div class="track" title={track}>{track}</div>
	</div>

	<div class="stats">
		{#if item.playsRemainingToday !== undefined}
			<div class="plays-badge">
				<span class="count">{item.playsRemainingToday}</span>
				<span class="label">PLAYS</span>
			</div>
		{/if}
	</div>
</div>

<style>
	.item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem;
		border-radius: 4px;
		background: linear-gradient(90deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%);
		border: 1px solid rgba(255,255,255,0.05);
		transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
		position: relative;
		overflow: hidden;
	}

	.item:hover {
		background: rgba(255, 255, 255, 0.07);
		border-color: rgba(255,255,255,0.15);
		transform: translateX(6px);
	}

	/* Rank Indicator Bar */
	.rank-indicator {
		width: 3px;
		height: 80%;
		background: rgba(255,255,255,0.1);
		border-radius: 2px;
	}
	.item.silver .rank-indicator { background: var(--tier-silver); box-shadow: 0 0 8px var(--tier-silver); }
	.item.gold .rank-indicator { background: var(--tier-gold); box-shadow: 0 0 8px var(--tier-gold); }
	.item.platinum .rank-indicator { background: var(--tier-platinum); box-shadow: 0 0 8px var(--tier-platinum); }

	.thumb {
		width: 50px;
		height: 38px;
		background: #000;
		border-radius: 2px;
		position: relative;
		flex-shrink: 0;
		overflow: hidden;
		border: 1px solid rgba(255,255,255,0.1);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.thumb .icon {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		font-size: 0.8rem;
		opacity: 0.5;
	}

	.tier-tag {
		position: absolute;
		bottom: 0;
		right: 0;
		font-family: var(--font-mono);
		font-size: 0.5rem;
		padding: 1px 3px;
		background: #333;
		color: #fff;
		border-top-left-radius: 2px;
	}
	.tier-tag.silver { background: var(--tier-silver); color: #000; }
	.tier-tag.gold { background: var(--tier-gold); color: #000; }
	.tier-tag.platinum { background: var(--tier-platinum); color: #fff; }

	.meta {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 1px;
	}
	.artist {
		font-family: var(--font-mono);
		font-size: 0.55rem;
		color: var(--neon-cyan);
		text-transform: uppercase;
		opacity: 0.8;
		letter-spacing: 0.05em;
	}
	.track {
		font-family: var(--font-display);
		font-size: 0.75rem;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.plays-badge {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: rgba(0,0,0,0.3);
		border: 1px solid rgba(255,255,255,0.05);
		padding: 2px 6px;
		border-radius: 4px;
		min-width: 32px;
	}
	.plays-badge .count {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		color: var(--text-main);
	}
	.plays-badge .label {
		font-size: 0.4rem;
		color: var(--text-dim);
		letter-spacing: 0.1em;
	}

	/* Tier specific glows */
	.item.platinum { background: linear-gradient(90deg, rgba(188, 19, 254, 0.08) 0%, transparent 100%); }
	.item.gold { background: linear-gradient(90deg, rgba(255, 215, 0, 0.05) 0%, transparent 100%); }
</style>
