<script>
	import { TIER_CONFIG } from '$lib/config.js';
	import { playerState } from '$lib/client/stores.svelte.js';

	const tiers = Object.values(TIER_CONFIG).sort((a, b) => a.priority - b.priority);
	const activeUsers = $derived(playerState.clientCount || 1);
	const queueDepth = $derived(playerState.queue.length);
	const connection = $derived((playerState.connectionState || 'connecting').toUpperCase());
	const driftMs = $derived(Math.round(Math.abs(playerState.clockOffsetSec || 0) * 1000));
</script>

<section class="lp-alt">
	<header class="masthead">
		<div class="kicker">ROCOLA LIVE CONTROL</div>
		<h1>
			One link.<br />
			Whole room.
		</h1>
		<p>Submit a video. It enters one shared timeline for everyone. Start free. Upgrade for replay gravity.</p>
	</header>

	<section class="top-grid">
		<article class="panel panel-stats">
			<h2>Live Signal</h2>
			<div class="metric"><span>ACTIVE</span><strong>{activeUsers.toString().padStart(2, '0')}</strong></div>
			<div class="metric"><span>QUEUE</span><strong>{queueDepth.toString().padStart(2, '0')}</strong></div>
			<div class="metric"><span>NETWORK</span><strong>{connection}</strong></div>
			<div class="metric"><span>SYNC</span><strong>{driftMs}ms</strong></div>
		</article>

		<article class="panel panel-value">
			<h2>Why users pay</h2>
			<ul>
				<li>More replays per submission</li>
				<li>Higher queue pressure, still fair</li>
				<li>Realtime visibility to all listeners</li>
			</ul>
		</article>
	</section>

	<section class="strip strip-process">
		<h3>Process</h3>
		<div class="steps">
			<div><b>01</b><p>Paste YouTube URL</p><small>validate metadata</small></div>
			<div><b>02</b><p>Choose tier</p><small>free or paid boost</small></div>
			<div><b>03</b><p>Queue updates live</p><small>all users see it</small></div>
			<div><b>04</b><p>Playback stays synced</p><small>one timeline</small></div>
		</div>
	</section>

	<section class="strip strip-pricing">
		<h3>Spending</h3>
		<p class="caption">You buy recurrence and placement pressure, not suppression.</p>
		<div class="pricing">
			{#each tiers as t}
				<div class="tier {t.id}">
					<div class="row">
						<span>{t.label.replaceAll('_', ' ')}</span>
						<strong>{t.price === 0 ? 'FREE' : `$${t.price}`}</strong>
					</div>
					<small>{t.dailyPlays} plays · every {t.gap} turns</small>
				</div>
			{/each}
		</div>
	</section>

	<section class="strip strip-faq">
		<h3>FAQ + Troubleshoot</h3>
		<div class="faq">
			<p><strong>Skipped video?</strong> Region lock, age lock, private/deleted, or embed-disabled source.</p>
			<p><strong>Refunds?</strong> No refunds for third-party playback restrictions.</p>
			<p><strong>Premium loop forever?</strong> No. Free songs are inserted between premium plays.</p>
			<p><strong>Free repeat same track?</strong> Limited to once per day per user/IP.</p>
		</div>
	</section>

	<footer class="final">
		<h3>Watch the stream. Bend the stream.</h3>
		<p>Try free first, then upgrade when you want your submission to come back more often.</p>
	</footer>
</section>

<style>
	.lp-alt {
		display: grid;
		gap: clamp(1rem, 2vw, 2.2rem);
		min-width: 920px;
		padding: var(--size-2) 0 var(--size-3);
	}

	.masthead {
		background:
			linear-gradient(120deg, color-mix(in srgb, var(--tier-gold) 24%, var(--bg-dark)) 0%, transparent 55%),
			linear-gradient(300deg, color-mix(in srgb, var(--tier-platinum) 24%, var(--bg-dark)) 0%, transparent 60%);
		padding: var(--size-4);
	}
	.kicker {
		font-family: var(--font-rounded-sans);
		font-size: var(--font-size-00);
		letter-spacing: 0.12em;
		color: var(--text-dim);
	}
	.masthead h1 {
		margin: var(--size-2) 0 0;
		font-family: var(--font-geometric-humanist);
		font-size: clamp(2.4rem, 6.6vw, 6rem);
		font-weight: var(--font-weight-3);
		line-height: 0.9;
	}
	.masthead p {
		margin: var(--size-3) 0 0;
		font-family: var(--font-neo-grotesque);
		font-size: var(--font-size-fluid-1);
		color: var(--text-dim);
		max-width: 56ch;
	}

	.top-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--size-2);
	}
	.panel {
		padding: var(--size-3);
	}
	.panel h2 {
		margin: 0 0 var(--size-2);
		font-family: var(--font-industrial);
		font-size: var(--font-size-1);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}
	.panel-stats {
		background: linear-gradient(160deg, color-mix(in srgb, var(--tier-platinum) 20%, var(--bg-dark)), color-mix(in srgb, var(--bg-dark) 86%, transparent));
	}
	.metric {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		margin-bottom: var(--size-1);
		font-family: var(--font-monospace-code);
		font-size: var(--font-size-00);
	}
	.metric strong {
		font-family: var(--font-industrial);
		font-size: var(--font-size-2);
	}
	.panel-value {
		background: linear-gradient(160deg, color-mix(in srgb, var(--tier-gold) 22%, var(--bg-dark)), color-mix(in srgb, var(--bg-dark) 86%, transparent));
	}
	.panel-value ul {
		margin: 0;
		padding-inline-start: var(--size-4);
		display: grid;
		gap: var(--size-1);
	}
	.panel-value li {
		font-family: var(--font-geometric-humanist);
		font-size: var(--font-size-0);
		color: var(--text-main);
	}

	.strip {
		padding: var(--size-3);
		background: color-mix(in srgb, var(--bg-dark) 86%, transparent);
	}
	.strip h3 {
		margin: 0 0 var(--size-2);
		font-family: var(--font-industrial);
		font-size: var(--font-size-1);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.strip-process { box-shadow: inset 0 2px 0 color-mix(in srgb, var(--status-good) 65%, transparent); }
	.strip-pricing { box-shadow: inset 0 2px 0 color-mix(in srgb, var(--tier-gold) 65%, transparent); }
	.strip-faq { box-shadow: inset 0 2px 0 color-mix(in srgb, var(--tier-silver) 65%, transparent); }

	.steps {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--size-2);
	}
	.steps > div {
		background: color-mix(in srgb, var(--bg-dark) 90%, transparent);
		padding: var(--size-2);
		display: grid;
		gap: 4px;
	}
	.steps b {
		font-family: var(--font-industrial);
		font-size: var(--font-size-0);
		color: var(--tier-platinum);
	}
	.steps p {
		margin: 0;
		font-family: var(--font-neo-grotesque);
		font-size: var(--font-size-0);
	}
	.steps small {
		font-family: var(--font-monospace-code);
		font-size: var(--font-size-00);
		color: var(--text-dim);
	}

	.caption {
		margin: 0 0 var(--size-2);
		font-family: var(--font-geometric-humanist);
		color: var(--text-dim);
	}
	.pricing {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: var(--size-2);
	}
	.tier {
		padding: var(--size-2);
		background: color-mix(in srgb, var(--bg-dark) 90%, transparent);
	}
	.row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: var(--size-2);
		font-family: var(--font-monospace-code);
		font-size: var(--font-size-00);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}
	.row strong {
		font-family: var(--font-industrial);
		font-size: var(--font-size-1);
	}
	.tier small {
		display: block;
		margin-top: var(--size-1);
		font-family: var(--font-monospace-code);
		font-size: var(--font-size-00);
		color: var(--text-dim);
	}
	.tier.free .row span { color: var(--text-muted); }
	.tier.silver .row span { color: var(--tier-silver); }
	.tier.gold .row span { color: var(--tier-gold); }
	.tier.platinum .row span { color: var(--tier-platinum); }

	.faq {
		display: grid;
		gap: var(--size-1);
	}
	.faq p {
		margin: 0;
		padding: var(--size-2);
		background: color-mix(in srgb, var(--bg-dark) 90%, transparent);
		font-family: var(--font-neo-grotesque);
		font-size: var(--font-size-0);
		color: var(--text-dim);
	}
	.faq strong {
		color: var(--text-main);
		font-family: var(--font-rounded-sans);
	}

	.final {
		padding: var(--size-3);
		background:
			linear-gradient(120deg, color-mix(in srgb, var(--tier-platinum) 16%, var(--bg-dark)) 0%, transparent 56%),
			color-mix(in srgb, var(--bg-dark) 86%, transparent);
	}
	.final h3 {
		margin: 0;
		font-family: var(--font-humanist);
		font-size: var(--font-size-fluid-2);
	}
	.final p {
		margin: var(--size-1) 0 0;
		font-family: var(--font-geometric-humanist);
		font-size: var(--font-size-0);
		color: var(--text-dim);
	}

	@media (max-width: 1120px) {
		.lp-alt { min-width: 860px; }
		.top-grid,
		.steps,
		.pricing { grid-template-columns: 1fr 1fr; }
	}
</style>
