<script>
	import { TIER_CONFIG } from '$lib/config.js';
	import { playerState } from '$lib/client/stores.svelte.js';

	const tiers = Object.values(TIER_CONFIG).sort((a, b) => a.priority - b.priority);
	const activeUsers = $derived(playerState.clientCount || 1);
	const queueDepth = $derived(playerState.queue.length);
	const connection = $derived((playerState.connectionState || 'connecting').toUpperCase());
	const driftMs = $derived(Math.round(Math.abs(playerState.clockOffsetSec || 0) * 1000));
	const syncP95 = $derived(playerState.syncStats?.driftP95Ms || 0);
	const hardSync = $derived(playerState.syncStats?.hardSyncCount || 0);
	const transitions = $derived(playerState.syncStats?.transitionCount || 0);
	const transitionLag = $derived(playerState.syncStats?.lastTransitionLatencyMs || 0);
	const currentTitle = $derived(playerState.currentSong?.title || 'Waiting for next drop');
</script>

<section class="landing">
	<header class="hero">
		<p class="eyebrow">LIVE VIDEO STATION</p>
		<h1>Anyone can watch.<br />Anyone can steer.</h1>
		<p class="lead">
			Rocola is a shared playlist timeline. Submit a YouTube link, choose how hard it should
			push, and watch it play for everyone at the same time.
		</p>
	</header>

	<section class="live-strip" aria-label="Live status">
		<div class="metric">
			<span>ACTIVE</span>
			<strong>{activeUsers.toString().padStart(2, '0')}</strong>
		</div>
		<div class="metric">
			<span>QUEUE</span>
			<strong>{queueDepth.toString().padStart(2, '0')}</strong>
		</div>
		<div class="metric">
			<span>LINK</span>
			<strong>{connection}</strong>
		</div>
		<div class="metric">
			<span>SYNC</span>
			<strong>{driftMs}ms</strong>
		</div>
		<div class="metric">
			<span>P95</span>
			<strong>{syncP95}ms</strong>
		</div>
		<div class="metric">
			<span>HARD</span>
			<strong>{hardSync}</strong>
		</div>
		<div class="metric">
			<span>XFADE</span>
			<strong>{transitions}/{transitionLag}ms</strong>
		</div>
		<div class="metric now">
			<span>NOW</span>
			<strong>{currentTitle}</strong>
		</div>
	</section>

	<section class="story-grid">
		<article class="story">
			<h2>How it works</h2>
			<p>Paste URL.</p>
			<p>Pick a tier.</p>
			<p>Join one global queue.</p>
			<p>Playback stays synchronized across clients.</p>
		</article>
		<article class="story">
			<h2>Why spend</h2>
			<p>Free is fair and visible.</p>
			<p>Paid increases replay frequency.</p>
			<p>No tier can lock the station forever.</p>
			<p>At least one free song plays between premium songs.</p>
		</article>
		<article class="story">
			<h2>What to expect</h2>
			<p>Queue updates in realtime.</p>
			<p>Everyone sees reactions and position shifts.</p>
			<p>Your song can be skipped if YouTube blocks embed/region/age.</p>
			<p>No refunds for third-party playback restrictions.</p>
		</article>
	</section>

	<section class="pricing" aria-label="Tier pricing">
		<h2>Tiers</h2>
		<div class="tiers">
			{#each tiers as t}
				<div class="tier {t.id}">
					<div class="top">
						<span class="name">{t.label.replaceAll('_', ' ')}</span>
						<strong>{t.price === 0 ? 'FREE' : `$${t.price}`}</strong>
					</div>
					<p>{t.dailyPlays} plays · minimum {t.gap} turns between repeats</p>
				</div>
			{/each}
		</div>
	</section>

	<section class="faq" aria-label="FAQ">
		<h2>Fast answers</h2>
		<div class="qa">
			<p><strong>Can I submit free more than once?</strong> Yes, if each free URL is different that day.</p>
			<p><strong>Can I repeat the same URL?</strong> Free: once/day. Paid: allowed.</p>
			<p><strong>Why was a song skipped?</strong> Region lock, age lock, private/deleted, embed disabled.</p>
			<p><strong>Will premium dominate forever?</strong> No. Fairness rules force free tracks between premium runs.</p>
		</div>
	</section>
</section>

<style>
	.landing {
		display: grid;
		gap: clamp(1rem, 1.6vw, 1.6rem);
		width: min(100%, 1240px);
		min-width: 0;
		padding: var(--size-2) var(--size-2) var(--size-4);
		--lp-fg: var(--text-main);
		--lp-muted: var(--text-dim);
		--lp-line: color-mix(in srgb, var(--text-main) 20%, transparent);
		--lp-line-soft: color-mix(in srgb, var(--text-main) 16%, transparent);
		color: var(--lp-fg);
		container-type: inline-size;
		container-name: landing;
	}

	.hero {
		display: grid;
		gap: var(--size-2);
	}
	.eyebrow {
		margin: 0;
		font-family: var(--font-industrial);
		font-size: var(--font-size-00);
		letter-spacing: 0.11em;
		color: var(--lp-muted);
	}
	.hero h1 {
		margin: 0;
		font-family: var(--font-geometric-humanist);
		font-size: clamp(2rem, 5.2vw, 4.4rem);
		font-weight: var(--font-weight-3);
		line-height: 0.94;
		text-wrap: balance;
	}
	.lead {
		margin: 0;
		max-width: 66ch;
		font-family: var(--font-humanist);
		font-size: var(--font-size-2);
		color: var(--lp-muted);
	}

	.live-strip {
		display: grid;
		grid-template-columns: repeat(7, minmax(0, auto)) 1fr;
		gap: var(--size-2);
		padding: var(--size-2) 0;
		border-top: 1px solid var(--lp-line);
		border-bottom: 1px solid var(--lp-line);
	}
	.metric {
		display: grid;
		gap: 2px;
		min-width: 110px;
	}
	.metric span {
		font-family: var(--font-monospace-code);
		font-size: var(--font-size-00);
		color: var(--lp-muted);
		letter-spacing: 0.08em;
	}
	.metric strong {
		font-family: var(--font-industrial);
		font-size: var(--font-size-3);
		font-weight: var(--font-weight-4);
		line-height: 1;
	}
	.metric.now {
		min-width: 0;
	}
	.metric.now strong {
		font-family: var(--font-neo-grotesque);
		font-size: var(--font-size-1);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.story-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--size-3);
	}
	.story {
		display: grid;
		gap: 6px;
		padding: var(--size-2) 0;
		border-top: 1px solid var(--lp-line-soft);
	}
	.story h2 {
		margin: 0 0 var(--size-1);
		font-family: var(--font-rounded-sans);
		font-size: var(--font-size-2);
		font-weight: var(--font-weight-4);
	}
	.story p {
		margin: 0;
		font-family: var(--font-humanist);
		font-size: var(--font-size-1);
		color: var(--lp-muted);
	}

	.pricing {
		display: grid;
		gap: var(--size-2);
	}
	.pricing h2,
	.faq h2 {
		margin: 0;
		font-family: var(--font-rounded-sans);
		font-size: var(--font-size-2);
		font-weight: var(--font-weight-4);
	}
	.tiers {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--size-2);
	}
	.tier {
		padding: var(--size-2);
		border: 1px solid var(--lp-line);
		border-radius: 9px;
		background: transparent;
	}
	.tier .top {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--size-1);
		margin-bottom: var(--size-1);
	}
	.tier .name {
		font-family: var(--font-monospace-code);
		font-size: var(--font-size-00);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
	.tier strong {
		font-family: var(--font-industrial);
		font-size: var(--font-size-2);
	}
	.tier p {
		margin: 0;
		font-family: var(--font-humanist);
		font-size: var(--font-size-0);
		color: var(--lp-muted);
	}
	.tier.free .name {
		color: var(--text-muted);
	}
	.tier.silver .name {
		color: var(--tier-silver);
	}
	.tier.gold .name {
		color: var(--tier-gold);
	}
	.tier.platinum .name {
		color: var(--tier-platinum);
	}

	.faq {
		display: grid;
		gap: var(--size-2);
	}
	.qa {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--size-2);
	}
	.qa p {
		margin: 0;
		padding: var(--size-2);
		border: 1px solid var(--lp-line-soft);
		border-radius: 9px;
		font-family: var(--font-humanist);
		font-size: var(--font-size-0);
		color: var(--lp-muted);
	}
	.qa strong {
		display: block;
		margin-bottom: 3px;
		color: var(--text-main);
		font-family: var(--font-rounded-sans);
		font-size: var(--font-size-1);
	}

	@container landing (max-width: 1120px) {
		.live-strip {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
		.metric.now {
			grid-column: 1 / -1;
		}
		.story-grid {
			grid-template-columns: 1fr 1fr;
		}
		.tiers {
			grid-template-columns: 1fr 1fr;
		}
		.qa {
			grid-template-columns: 1fr;
		}
	}

	:global([data-theme='light']) .landing {
		--lp-fg: #f5f7fb;
		--lp-muted: #cfd6df;
		--lp-line: color-mix(in srgb, #ffffff 38%, transparent);
		--lp-line-soft: color-mix(in srgb, #ffffff 28%, transparent);
	}

	@container landing (max-width: 760px) {
		.landing {
			padding-inline: var(--size-1);
		}
		.hero h1 {
			font-size: clamp(1.5rem, 8.2cqi, 2.4rem);
			line-height: 1;
		}
		.lead {
			font-size: var(--font-size-1);
		}
		.live-strip {
			grid-template-columns: 1fr 1fr;
			gap: var(--size-1);
		}
		.metric {
			min-width: 0;
		}
		.metric strong {
			font-size: var(--font-size-2);
		}
		.metric.now {
			grid-column: 1 / -1;
		}
		.story-grid {
			grid-template-columns: 1fr;
			gap: var(--size-2);
		}
		.story h2,
		.pricing h2,
		.faq h2 {
			font-size: var(--font-size-1);
		}
		.story p {
			font-size: var(--font-size-0);
		}
		.tiers {
			grid-template-columns: 1fr;
		}
		.qa {
			grid-template-columns: 1fr;
		}
	}

	@media (max-width: 640px) {
		.landing {
			padding-top: var(--size-1);
			padding-bottom: var(--size-2);
		}
		.metric strong {
			font-size: var(--font-size-1);
		}
	}

	@media (max-height: 760px) {
		.landing {
			gap: var(--size-2);
		}
		.hero {
			gap: var(--size-1);
		}
		.story {
			padding-block: var(--size-1);
		}
	}
</style>
