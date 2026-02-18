<script>
	import { TIER_CONFIG } from '$lib/config.js';
	import { playerState } from '$lib/client/stores.svelte.js';

	const orderedTiers = Object.values(TIER_CONFIG).sort((a, b) => a.priority - b.priority);
	const queueDepth = $derived(playerState.queue.length);
	const viewers = $derived(playerState.clientCount || 1);
	const conn = $derived(playerState.connectionState || 'connecting');
	const syncMs = $derived(Math.round(Math.abs(playerState.clockOffsetSec || 0) * 1000));
	const quirkyQueueMood = $derived(
		queueDepth === 0
			? 'quiet line'
			: queueDepth < 6
				? 'warm queue'
				: queueDepth < 14
					? 'crowded lane'
					: 'high traffic'
	);
	const connectionHint = $derived(
		conn === 'connected'
			? 'stable'
			: conn === 'connecting'
				? 'handshaking'
				: conn === 'failed' || conn === 'disconnected'
					? 'degraded'
					: 'recovering'
	);
</script>

<section class="landing">
	<header class="hero">
		<p class="eyebrow">Live Shared Music</p>
		<h1>Post once.<br />Move the whole room.</h1>
		<p class="subhead">Rocola lets everyone hear one synchronized track at a time. Your submission becomes the next moment people remember.</p>
	</header>

	<div class="status-strip" aria-hidden="true">
		<span class="pill live">LIVE SYNC</span>
		<span class="pill free">FREE INCLUDED</span>
		<span class="pill premium">PREMIUM BOOST</span>
		<span class="pill fair">FAIR ROTATION</span>
	</div>

	<section class="telemetry" aria-label="Live stats">
		<div class="stat-card">
			<div class="k">ACTIVE</div>
			<div class="v">{viewers.toString().padStart(2, '0')}</div>
			<div class="n">watching / participating</div>
		</div>
		<div class="stat-card">
			<div class="k">QUEUE</div>
			<div class="v">{queueDepth.toString().padStart(2, '0')}</div>
			<div class="n">{quirkyQueueMood}</div>
		</div>
		<div class="stat-card">
			<div class="k">NETWORK</div>
			<div class="v">{conn.toUpperCase()}</div>
			<div class="n">{connectionHint}</div>
		</div>
		<div class="stat-card">
			<div class="k">SYNC OFFSET</div>
			<div class="v">{syncMs}ms</div>
			<div class="n">clock drift guard</div>
		</div>
	</section>

	<section class="story-grid">
		<article class="story s-try">
			<div class="glyph" aria-hidden="true">
				<svg viewBox="0 0 24 24"><path d="M4 12h16M12 4v16" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" /></svg>
			</div>
			<h2>Try It</h2>
			<p>Tap ADD. Paste a YouTube URL. Choose your tier. You are in.</p>
		</article>
		<article class="story s-flow">
			<div class="glyph" aria-hidden="true">
				<svg viewBox="0 0 24 24"><path d="M3 12h18M8 7l-5 5 5 5M16 7l5 5-5 5" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>
			</div>
			<h2>What Happens</h2>
			<p>Your song enters a fairness queue. Premium helps, free still gets heard.</p>
		</article>
		<article class="story s-pay">
			<div class="glyph" aria-hidden="true">
				<svg viewBox="0 0 24 24"><path d="M12 3v6m0 6v6M5.6 5.6l4.2 4.2m4.4 4.4 4.2 4.2M3 12h6m6 0h6M5.6 18.4l4.2-4.2m4.4-4.4 4.2-4.2" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" /></svg>
			</div>
			<h2>Why Pay</h2>
			<p>You pay for repetition and stronger pressure, not for deleting everyone else.</p>
		</article>
	</section>

	<section class="process">
		<h3>Process</h3>
		<div class="explain-grid">
			<article class="panel p1">
				<div class="head"><span class="dot">1</span><h4>Inject Source</h4></div>
				<p>Paste a YouTube URL and scan it. Rocola validates metadata before queueing.</p>
			</article>
			<article class="panel p2">
				<div class="head"><span class="dot">2</span><h4>Select Pressure</h4></div>
				<p>Choose Free for discovery or premium for stronger replay gravity.</p>
			</article>
			<article class="panel p3">
				<div class="head"><span class="dot">3</span><h4>Realtime Propagation</h4></div>
				<p>Your submission appears for everyone. Playback timeline remains synchronized.</p>
			</article>
			<article class="panel p4">
				<div class="head"><span class="dot">4</span><h4>Fair Rotation</h4></div>
				<p>Free songs keep cycling between premium entries so the system stays trusted.</p>
			</article>
		</div>
	</section>

	<section class="pricing">
		<h3>Spend</h3>
		<p class="spend-copy">You are not paying to erase the line. You are paying for stronger return probability.</p>
		<div class="tier-list">
			{#each orderedTiers as tier}
				<div class="tier {tier.id}">
					<div class="row">
						<span class="name">{tier.label.replaceAll('_', ' ')}</span>
						<span class="price">{tier.price === 0 ? 'FREE' : `$${tier.price}`}</span>
					</div>
					<p>{tier.dailyPlays} plays · every {tier.gap} turns</p>
				</div>
			{/each}
		</div>
	</section>

	<section class="faq">
		<h3>FAQ + Troubleshoot</h3>
		<div class="qa">
			<p><strong>Song skipped?</strong> Video may be zone restricted, age restricted, removed, private, or embed-disabled.</p>
			<p><strong>Refunds?</strong> No refunds for third-party YouTube restrictions or unavailable media.</p>
			<p><strong>Why did my premium not loop forever?</strong> Fairness rules force at least one free song between premium plays.</p>
			<p><strong>Can I add the same free song again?</strong> Free allows one identical song per day per user/IP.</p>
			<p><strong>Future telemetry?</strong> Packet jitter, reconnect count, media error buckets, and queue processing times are planned here.</p>
		</div>
	</section>

	<footer class="cta">
		<p class="lead">Watch the stream. Bend the stream.</p>
		<p class="copy">Start free now. Boost when you want your track to return.</p>
	</footer>
</section>

<style>
	.landing {
		display: flex;
		flex-direction: column;
		gap: clamp(1rem, 1.8vw, 2rem);
		min-width: 940px;
		padding-bottom: var(--size-2);
	}
	.hero {
		max-width: 72ch;
	}
	.eyebrow {
		margin: 0;
		font-family: var(--font-rounded-sans);
		font-size: var(--font-size-00);
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: var(--text-dim);
	}
	h1 {
		margin: var(--size-2) 0 0 0;
		font-family: var(--font-geometric-humanist);
		font-weight: var(--font-weight-3);
		font-size: clamp(2.3rem, 6.2vw, 5.2rem);
		line-height: 0.93;
		letter-spacing: -0.01em;
	}
	.subhead {
		margin: var(--size-3) 0 0 0;
		font-family: var(--font-neo-grotesque);
		font-size: var(--font-size-fluid-1);
		line-height: 1.42;
		color: var(--text-dim);
		max-width: 58ch;
	}
	.status-strip {
		display: flex;
		flex-wrap: wrap;
		gap: var(--size-1);
	}
	.pill {
		font-family: var(--font-rounded-sans);
		font-size: var(--font-size-00);
		letter-spacing: 0.09em;
		padding: 4px 8px;
		background: color-mix(in srgb, var(--bg-dark) 80%, transparent);
	}
	.pill.live { color: var(--status-good); }
	.pill.free { color: var(--text-dim); }
	.pill.premium { color: var(--tier-gold); }
	.pill.fair { color: var(--tier-silver); }
	.telemetry {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--size-2);
	}
	.stat-card {
		background: color-mix(in srgb, var(--bg-dark) 86%, transparent);
		padding: var(--size-2);
	}
	.stat-card .k {
		font-family: var(--font-rounded-sans);
		font-size: var(--font-size-00);
		letter-spacing: 0.1em;
		color: var(--text-dim);
	}
	.stat-card .v {
		font-family: var(--font-industrial);
		font-size: var(--font-size-2);
		line-height: 1.05;
	}
	.stat-card .n {
		font-family: var(--font-neo-grotesque);
		font-size: var(--font-size-00);
		color: var(--text-dim);
	}
	.story-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--size-2);
	}
	.story {
		background: linear-gradient(180deg, color-mix(in srgb, var(--bg-dark) 82%, transparent), color-mix(in srgb, var(--bg-dark) 92%, transparent));
		padding: var(--size-3);
		position: relative;
		overflow: hidden;
	}
	.story::before {
		content: "";
		position: absolute;
		left: 0;
		top: 0;
		height: 2px;
		width: 100%;
		background: color-mix(in srgb, var(--text-main) 34%, transparent);
	}
	.story.s-try::before { background: color-mix(in srgb, var(--status-good) 72%, transparent); }
	.story.s-flow::before { background: color-mix(in srgb, var(--tier-silver) 74%, transparent); }
	.story.s-pay::before { background: color-mix(in srgb, var(--tier-gold) 74%, transparent); }
	.story.s-pay .glyph {
		color: var(--tier-gold);
	}
	.glyph {
		width: 42px;
		height: 42px;
		display: inline-flex;
		margin-bottom: var(--size-1);
		color: var(--text-main);
	}
	.glyph svg {
		width: 100%;
		height: 100%;
	}
	.story h2 {
		margin: 0 0 var(--size-2) 0;
		font-family: var(--font-industrial);
		font-size: var(--font-size-1);
		letter-spacing: 0.04em;
	}
	.story p {
		margin: 0;
		font-family: var(--font-geometric-humanist);
		font-size: var(--font-size-0);
		line-height: 1.45;
		color: var(--text-dim);
	}
	.process h3,
	.pricing h3,
	.faq h3 {
		margin: 0 0 var(--size-2) 0;
		font-family: var(--font-industrial);
		font-size: var(--font-size-1);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.explain-grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--size-2);
	}
	.panel {
		background: color-mix(in srgb, var(--bg-dark) 88%, transparent);
		padding: var(--size-2);
	}
	.panel.p1 { box-shadow: inset 0 2px 0 color-mix(in srgb, var(--status-good) 62%, transparent); }
	.panel.p2 { box-shadow: inset 0 2px 0 color-mix(in srgb, var(--tier-silver) 62%, transparent); }
	.panel.p3 { box-shadow: inset 0 2px 0 color-mix(in srgb, var(--tier-gold) 62%, transparent); }
	.panel.p4 { box-shadow: inset 0 2px 0 color-mix(in srgb, var(--tier-platinum) 62%, transparent); }
	.head {
		display: flex;
		align-items: center;
		gap: var(--size-2);
		margin-bottom: var(--size-1);
	}
	.dot {
		width: 30px;
		height: 30px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		font-family: var(--font-industrial);
		font-size: var(--font-size-0);
		color: var(--text-main);
		background: color-mix(in srgb, var(--tier-platinum) 28%, transparent);
	}
	.panel h4 {
		margin: 0;
		font-family: var(--font-industrial);
		font-size: var(--font-size-0);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.panel p {
		margin: 0;
		font-family: var(--font-neo-grotesque);
		font-size: var(--font-size-0);
		color: var(--text-dim);
	}
	.spend-copy {
		margin: 0 0 var(--size-2) 0;
		font-family: var(--font-geometric-humanist);
		font-size: var(--font-size-0);
		color: var(--text-dim);
		max-width: 70ch;
	}
	.tier-list {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--size-2);
	}
	.tier {
		padding: var(--size-2);
		background: color-mix(in srgb, var(--bg-dark) 88%, transparent);
	}
	.tier p {
		margin: var(--size-1) 0 0 0;
		font-family: var(--font-monospace-code);
		font-size: var(--font-size-00);
		color: var(--text-dim);
		line-height: 1.4;
	}

	.row {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: var(--size-2);
	}
	.name {
		font-family: var(--font-monospace-code);
		font-size: var(--font-size-00);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.tier.free .name { color: var(--text-muted); }
	.tier.silver .name { color: var(--tier-silver); }
	.tier.gold .name { color: var(--tier-gold); }
	.tier.ultra .name { color: var(--tier-platinum); }
	.price {
		font-family: var(--font-industrial);
		font-size: var(--font-size-1);
	}
	.qa {
		display: grid;
		gap: var(--size-1);
	}
	.qa p {
		margin: 0;
		font-family: var(--font-neo-grotesque);
		font-size: var(--font-size-0);
		color: var(--text-dim);
	}
	.qa strong {
		color: var(--text-main);
		font-family: var(--font-rounded-sans);
		font-weight: var(--font-weight-6);
	}
	.cta {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.lead {
		margin: 0;
		font-family: var(--font-humanist);
		font-size: var(--font-size-fluid-2);
		font-weight: var(--font-weight-3);
	}
	.copy {
		margin: 0;
		font-family: var(--font-geometric-humanist);
		font-size: var(--font-size-0);
		color: var(--text-dim);
	}
	@media (max-width: 1100px) {
		.landing {
			min-width: 860px;
		}
		.telemetry,
		.explain-grid {
			grid-template-columns: 1fr 1fr;
		}
	}
</style>
