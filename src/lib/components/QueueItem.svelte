<script>
	export let item;

	// Determine tier for styling
	$: tier = (item.tier || item.tierName || 'free').toLowerCase();
	
	// Format title: if it contains " - ", split it for better hierarchy
	$: titleParts = item.title.includes(' - ') ? item.title.split(' - ') : [item.title];
	$: artist = titleParts.length > 1 ? titleParts[0] : (item.channelTitle || 'Unknown Artist');
	$: track = titleParts.length > 1 ? titleParts.slice(1).join(' - ') : item.title;
</script>

<div class="item {tier} glitch-hover">
	<div class="status-indicator"></div>
	
	<div class="thumb-container">
		<div class="thumb">
			{#if item.song?.thumbnail || item.thumbnail}
				<img src={item.song?.thumbnail || item.thumbnail} alt="" loading="lazy" />
			{:else}
				<div class="icon">SYS_NODATA</div>
			{/if}
			<div class="tier-tag {tier}">{tier.toUpperCase()}</div>
		</div>
		<div class="scanline"></div>
	</div>
	
	<div class="meta">
		<div class="artist-row">
			<span class="artist">{artist}</span>
			<span class="separator">//</span>
		</div>
		<div class="track" title={track}>{track}</div>
	</div>

	<div class="stats">
		{#if item.playsRemainingToday !== undefined}
			<div class="plays-badge">
				<span class="label">RMN:</span>
				<span class="count">{item.playsRemainingToday}</span>
			</div>
		{/if}
		<div class="entry-id">#{item.id?.toString().slice(-4) || '0000'}</div>
	</div>
</div>

<style>
	.item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid var(--glass-border);
		transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
		position: relative;
		overflow: hidden;
	}

	.item:hover {
		background: rgba(0, 243, 255, 0.05);
		border-color: var(--neon-cyan);
		box-shadow: inset 0 0 15px rgba(0, 243, 255, 0.1);
		transform: translateX(4px);
	}

	.status-indicator {
		width: 2px;
		height: 30px;
		background: var(--text-muted);
		transition: all 0.3s;
	}
	.item:hover .status-indicator {
		background: var(--neon-cyan);
		box-shadow: 0 0 10px var(--neon-cyan);
		height: 40px;
	}
	.item.silver .status-indicator { background: var(--tier-silver); }
	.item.gold .status-indicator { background: var(--tier-gold); }
	.item.platinum .status-indicator { background: var(--tier-platinum); }

	.thumb-container {
		position: relative;
		width: 60px;
		height: 45px;
		flex-shrink: 0;
	}
	.thumb {
		width: 100%;
		height: 100%;
		background: #000;
		position: relative;
		overflow: hidden;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
		opacity: 0.8;
		transition: opacity 0.3s;
	}
	.item:hover img { opacity: 1; }

	.thumb .icon {
		display: flex;
		align-items: center;
		justify-content: center;
		height: 100%;
		font-family: var(--font-mono);
		font-size: 0.4rem;
		color: var(--text-muted);
	}

	.tier-tag {
		position: absolute;
		top: 0;
		left: 0;
		font-family: var(--font-pixel);
		font-size: 0.4rem;
		padding: 2px 4px;
		background: rgba(0,0,0,0.8);
		color: #fff;
		z-index: 10;
		border-bottom-right-radius: 4px;
	}
	.tier-tag.silver { color: var(--tier-silver); }
	.tier-tag.gold { color: var(--tier-gold); }
	.tier-tag.platinum { color: var(--tier-platinum); }

	.scanline {
		position: absolute;
		top: 0; left: 0; width: 100%; height: 100%;
		background: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.2) 50%);
		background-size: 100% 4px;
		pointer-events: none;
		z-index: 5;
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
		gap: 0.5rem;
	}
	.artist {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		color: var(--text-dim);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
	.separator {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--neon-cyan);
		opacity: 0.5;
	}
	.track {
		font-family: var(--font-display);
		font-size: 0.85rem;
		font-weight: 600;
		color: #fff;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		letter-spacing: 0.02em;
	}

	.stats {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: 4px;
	}
	.plays-badge {
		display: flex;
		align-items: center;
		gap: 4px;
		background: rgba(0,0,0,0.4);
		padding: 2px 6px;
		border: 1px solid rgba(255,255,255,0.05);
	}
	.plays-badge .label {
		font-family: var(--font-mono);
		font-size: 0.5rem;
		color: var(--text-muted);
	}
	.plays-badge .count {
		font-family: var(--font-pixel);
		font-size: 0.5rem;
		color: var(--neon-green);
	}
	.entry-id {
		font-family: var(--font-mono);
		font-size: 0.5rem;
		color: var(--text-muted);
		opacity: 0.5;
	}

	/* Tier specific accents */
	.item.platinum { background: linear-gradient(90deg, rgba(188, 19, 254, 0.05) 0%, transparent 100%); }
	.item.gold { background: linear-gradient(90deg, rgba(251, 191, 36, 0.05) 0%, transparent 100%); }
</style>
