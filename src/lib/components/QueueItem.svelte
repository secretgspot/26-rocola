<script>
	export let item;

	// Determine tier for styling
	$: tier = (item.tier || item.tierName || 'free').toLowerCase();
</script>

<div class="item {tier}">
	<div class="thumb-placeholder">
		<!-- In a real app we'd use the thumbnail, but for now a simple icon or gradient -->
		<div class="icon">🎵</div>
	</div>
	
	<div class="meta">
		<div class="title" title={item.title}>{item.title}</div>
		<div class="sub">{item.channelTitle || 'Unknown Channel'}</div>
	</div>

	<div class="stats">
		{#if item.playsRemainingToday !== undefined}
			<div class="stat plays" title="Plays remaining today">
				<span class="val">{item.playsRemainingToday}</span>
				<span class="label">LEFT</span>
			</div>
		{/if}
		<div class="badge {tier}">
			{tier === 'free' ? 'F' : tier[0].toUpperCase()}
		</div>
	</div>
</div>

<style>
	.item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.6rem;
		border-radius: var(--radius-sm);
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid transparent;
		transition: all 0.2s ease;
		position: relative;
		overflow: hidden;
	}

	.item:hover {
		background: rgba(255, 255, 255, 0.06);
		transform: translateX(4px);
	}

	/* Tiers Borders */
	.item.free { border-color: rgba(255,255,255,0.1); }
	.item.silver { border-color: var(--tier-silver); box-shadow: 0 0 5px rgba(0, 243, 255, 0.2) inset; }
	.item.gold { border-color: var(--tier-gold); box-shadow: 0 0 5px rgba(255, 215, 0, 0.2) inset; }
	.item.platinum { border-color: var(--tier-platinum); box-shadow: 0 0 5px rgba(188, 19, 254, 0.2) inset; }

	.thumb-placeholder {
		width: 32px;
		height: 32px;
		background: rgba(0,0,0,0.3);
		border-radius: 4px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}
	.icon { font-size: 0.8rem; filter: grayscale(1); }

	.meta {
		flex: 1;
		min-width: 0; /* text overflow fix */
	}
	.title {
		font-family: var(--font-body);
		font-weight: 500;
		font-size: 0.9rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: var(--text-main);
	}
	.sub {
		font-size: 0.75rem;
		color: var(--text-dim);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.stats {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.stat {
		display: flex;
		flex-direction: column;
		align-items: center;
		line-height: 1;
	}
	.stat .val {
		font-family: var(--font-mono);
		font-size: 0.7rem;
		color: var(--text-main);
	}
	.stat .label {
		font-size: 0.5rem;
		color: var(--text-dim);
		margin-top: 2px;
	}

	.badge {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		width: 18px;
		height: 18px;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 4px;
		background: #333;
		color: #fff;
	}
	.badge.free { background: var(--tier-free); color: #000; }
	.badge.silver { background: var(--tier-silver); color: #000; box-shadow: 0 0 5px var(--tier-silver); }
	.badge.gold { background: var(--tier-gold); color: #000; box-shadow: 0 0 5px var(--tier-gold); }
	.badge.platinum { background: var(--tier-platinum); color: #fff; box-shadow: 0 0 8px var(--tier-platinum); }
</style>