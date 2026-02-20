<script>
	import Icon from '$lib/components/Icon.svelte';

	let {
		canControl = false,
		hasActiveQueuePlayback = false,
		theme = 'dark',
		helpOpen = false,
		connectionState = 'connecting',
		connectionTooltip = 'Realtime: connecting',
		clientCount = 0,
		queueCount = 0,
		seedPending = false,
		nextPending = false,
		clearPending = false,
		onAdvance = () => {},
		onSeed = () => {},
		onClear = () => {},
		onToggleTheme = () => {},
		onToggleHelp = () => {},
		showCtrlBadge = false
	} = $props();
</script>

<header class="top-bar">
	<div class="logo">
		<div class="live-dot {connectionState}" aria-hidden="true" title={connectionTooltip}></div>
		<span class="logo-text">ROCOLA</span>
		{#if showCtrlBadge}
			<span class="ctrl-badge" title="Active controller">CTRL</span>
		{/if}
	</div>
	<div class="header-meta">
		{#if canControl}
			<div class="admin-panel">
				{#if hasActiveQueuePlayback}
					<button
						class="btn-skip btn-next"
						onclick={() => onAdvance()}
						aria-label="Force advance to next song"
						aria-busy={nextPending}
						disabled={nextPending}
					>
						<Icon name="skip" size={25} color="currentColor" strokeWidth={1.8} />
					</button>
				{/if}
				<button
					class="btn-skip btn-seed"
					onclick={() => onSeed()}
					aria-label="Seed queue with test data"
					aria-busy={seedPending}
					disabled={seedPending}
				>
					<Icon name="seed" size={25} color="currentColor" strokeWidth={1.8} />
				</button>
				{#if hasActiveQueuePlayback}
					<button
						class="btn-skip btn-clear"
						onclick={() => onClear()}
						aria-label="Clear all seeded data"
						aria-busy={clearPending}
						disabled={clearPending}
					>
						<Icon name="clear" size={25} color="currentColor" strokeWidth={1.8} />
					</button>
				{/if}
			</div>
		{/if}
		<button class="theme-toggle btn-skip btn-theme" onclick={() => onToggleTheme()} aria-label="Toggle theme">
			<Icon name={theme === 'dark' ? 'dark' : 'light'} size={25} color="currentColor" strokeWidth={1.8} />
		</button>
		<button class="btn-skip btn-help" class:active={helpOpen} onclick={() => onToggleHelp()} aria-label="Help (H)">
			<Icon name="question" size={25} color="currentColor" strokeWidth={1.8} />
		</button>
		<div class="status">
			<span class="status-item" title="Connected clients">
				<Icon name="stations" size={21} color="currentColor" strokeWidth={1.8} />
			</span>
			<span class="count">{clientCount.toString().padStart(2, '0')}</span>
			<span class="queue-count" aria-label="Queue count" title="Songs waiting in queue">
				<Icon name="clients" size={21} color="currentColor" strokeWidth={1.8} />
				<span class="count">{queueCount.toString().padStart(2, '0')}</span>
			</span>
		</div>
	</div>
</header>

<style>
	.top-bar {
		height: 56px;
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0 var(--size-4);
		background: linear-gradient(
			180deg,
			color-mix(in srgb, var(--queue-fade-void) 96%, transparent) 0%,
			color-mix(in srgb, var(--queue-fade-void) 70%, transparent) 40%,
			transparent 100%
		);
		z-index: 10;
		letter-spacing: 0.08em;
		border-bottom: 0;
		text-transform: uppercase;
		pointer-events: auto;
		color: var(--text-main);
	}
	.logo {
		display: flex;
		align-items: center;
		gap: var(--size-1);
	}
	.logo-text {
		font-size: var(--font-size-0);
		font-weight: var(--font-weight-1);
		text-transform: uppercase;
		letter-spacing: 0;
	}
	.ctrl-badge {
		font-size: var(--font-size-00);
		letter-spacing: 0.08em;
		color: var(--status-good);
		opacity: 0.9;
	}
	.theme-toggle {
		background: transparent;
		border: 0;
		padding: 0;
		margin-left: var(--size-2);
		opacity: 0.6;
		transition: opacity var(--transition-duration-1) ease;
	}
	.theme-toggle:hover { opacity: 1; }
	.header-meta {
		display: flex;
		align-items: center;
		gap: var(--size-3);
	}
	.admin-panel {
		display: flex;
		align-items: center;
		gap: var(--size-2);
		background: color-mix(in srgb, var(--bg-dark) 92%, transparent);
		padding: 4px 8px;
		border-radius: 9px;
	}
	.status {
		font-size: var(--font-size-1);
		font-weight: var(--font-weight-3);
		display: flex;
		align-items: center;
		gap: var(--size-2);
		color: var(--text-dim);
		white-space: nowrap;
	}
	.status .status-item,
	.status .queue-count {
		display: inline-flex;
		align-items: center;
	}
	.status .count { color: var(--text-dim); letter-spacing: 0.12em; }
	.status .queue-count { gap: var(--size-1); }
	.status :global(.icon-root) {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 0;
		vertical-align: middle;
		flex: 0 0 auto;
	}
	.live-dot {
		width: var(--size-2);
		height: var(--size-2);
		background: var(--status-pending);
		box-shadow: 0 0 8px var(--hud-glow);
	}
	.live-dot.connected {
		background: var(--status-good);
		box-shadow: 0 0 10px color-mix(in srgb, var(--status-good) 60%, transparent);
	}
	.live-dot.failed,
	.live-dot.suspended,
	.live-dot.disconnected {
		background: var(--status-bad);
		box-shadow: 0 0 10px color-mix(in srgb, var(--status-bad) 60%, transparent);
	}
	.live-dot.connecting,
	.live-dot.closing,
	.live-dot.closed {
		background: var(--status-pending);
		animation: blink 1.2s infinite;
	}
	.btn-skip {
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: var(--font-size-2);
		padding: 0;
		border: 0;
		background: transparent;
		white-space: nowrap;
		line-height: 1;
		--icon-stroke-color: var(--text-main);
		--icon-stroke-width: 2;
		opacity: 0.6;
		transition: opacity var(--transition-duration-1) ease;
		color: var(--text-main);
	}
	.top-bar button {
		all: unset;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
	}
	.top-bar button:disabled {
		opacity: 0.3;
		cursor: not-allowed;
	}
	.btn-skip:hover {
		--icon-stroke-color: var(--border-bright);
		opacity: 1;
	}
	:global([data-theme='light']) .btn-skip,
	:global([data-theme='light']) .theme-toggle {
		opacity: 0.9;
		color: var(--text-main);
	}
	.btn-help.active {
		color: var(--text-main);
		opacity: 1;
		transform: scale(1.04);
	}
	.btn-help :global(svg path:first-child) {
		opacity: 0.45;
	}
	.btn-help :global(svg path:nth-child(n+2)) {
		opacity: 1;
	}
	.btn-help.active :global(svg path:first-child) {
		opacity: 1;
	}
	.btn-help.active :global(svg path:nth-child(n+2)) {
		opacity: 0.45;
	}
	@media (max-width: 480px) {
		.top-bar {
			padding: 0 var(--size-3);
		}
		.logo-text {
			font-size: var(--font-size-1);
		}
	}
	@media (prefers-reduced-motion: no-preference) {
		@keyframes blink {
			0%,
			100% {
				opacity: 1;
			}
			50% {
				opacity: 0;
			}
		}
	}
</style>
