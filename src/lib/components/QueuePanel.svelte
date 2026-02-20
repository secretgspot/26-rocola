<script>
	import Queue from '$lib/components/Queue.svelte';

	let { visible = false, isMobileViewport = false, items = [], currentTurn = 0 } = $props();
</script>

{#if items.length > 0}
	<aside class="queue-zone min-w-0" class:visible={visible || isMobileViewport}>
		<div class="queue-content">
			<Queue {items} {currentTurn} />
		</div>
	</aside>
{/if}

<style>
	.queue-zone {
		position: absolute;
		top: 120px;
		bottom: 120px;
		right: 0;
		left: auto;
		width: min(340px, 34vw);
		display: flex;
		flex-direction: column;
		justify-content: center;
		min-width: 0;
		z-index: 2;
		pointer-events: none;
		background: transparent;
		opacity: 0;
		transform: translateX(14px);
		transition: opacity 180ms ease, transform 180ms ease;
		will-change: opacity, transform;
	}
	.queue-zone.visible {
		opacity: 1;
		transform: translateX(0);
		pointer-events: auto;
	}
	.queue-content {
		flex: 1 1 auto;
		height: 100%;
		max-height: 100%;
		overflow-y: auto;
		overflow-x: visible;
		position: relative;
		pointer-events: auto;
		align-content: center;
		background: linear-gradient(270deg, color-mix(in srgb, var(--bg-dark) 84%, transparent), transparent);
		transition: background 180ms ease;
		will-change: background;
	}
	.queue-zone.visible .queue-content {
		background: linear-gradient(270deg, color-mix(in srgb, var(--bg-dark) 88%, transparent), transparent);
	}
	@container viewport (min-width: 1440px) {
		.queue-zone {
			width: min(360px, 30vw);
		}
	}
	@media (max-width: 1023px) and (orientation: portrait) {
		.queue-zone {
			width: 100%;
			left: 0;
			right: 0;
			top: 50dvh;
			bottom: var(--mobile-footer-h);
			height: auto;
			justify-content: flex-start;
			background: transparent;
		}
		.queue-content {
			flex: 1 1 auto;
			height: 100%;
			max-height: none;
			background: color-mix(in srgb, var(--bg-dark) 90%, transparent);
		}
		.queue-zone.visible .queue-content {
			background: color-mix(in srgb, var(--bg-dark) 92%, transparent);
		}
	}
	@media (max-width: 1023px) and (orientation: landscape) {
		.queue-zone {
			width: min(340px, 40vw);
			top: 88px;
			bottom: 104px;
			left: auto;
			right: 0;
			justify-content: center;
		}
		.queue-content {
			height: 100%;
			max-height: 100%;
			background: linear-gradient(270deg, color-mix(in srgb, var(--bg-dark) 92%, transparent), transparent);
		}
		.queue-zone.visible .queue-content {
			background: linear-gradient(270deg, var(--bg-dark), transparent);
		}
	}
</style>

