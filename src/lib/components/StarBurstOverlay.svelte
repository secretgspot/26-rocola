<script>
	let { bursts = [] } = $props();
</script>

<div class="stars-overlay stars-overlay-remote" aria-hidden="true">
	{#each bursts as burst (burst.id)}
		{#if burst.fromBehind}
			<div class="burst" style={`left:${burst.x * 100}%;top:${burst.y * 100}%;`}>
				{#each burst.particles as p, idx (idx)}
					<span
						class="star from-behind"
						style={`--dx:${p.dx}px;--dy:${p.dy}px;--delay:${p.delay}ms;--dur:${p.dur}ms;--scale:${p.scale};--rot:${p.rot}deg;--size:${p.size || 46}px;`}
					></span>
				{/each}
			</div>
		{/if}
	{/each}
</div>

<div class="stars-overlay stars-overlay-local" aria-hidden="true">
	{#each bursts as burst (burst.id)}
		{#if !burst.fromBehind}
			<div class="burst" style={`left:${burst.x * 100}%;top:${burst.y * 100}%;`}>
				{#each burst.particles as p, idx (idx)}
					<span
						class="star"
						style={`--dx:${p.dx}px;--dy:${p.dy}px;--delay:${p.delay}ms;--dur:${p.dur}ms;--scale:${p.scale};--rot:${p.rot}deg;--size:${p.size || 46}px;`}
					></span>
				{/each}
			</div>
		{/if}
	{/each}
</div>

<style>
	.stars-overlay {
		position: fixed;
		inset: 0;
		pointer-events: none;
		overflow: hidden;
	}
	.stars-overlay-local {
		z-index: var(--layer-important);
	}
	/* Below FAB buttons so remote stars visibly emerge from behind controls. */
	.stars-overlay-remote {
		z-index: calc(var(--layer-5) - 1);
	}
	.burst {
		position: absolute;
		width: 0;
		height: 0;
	}
	.star {
		position: absolute;
		left: 0;
		top: 0;
		font-size: var(--size, 46px);
		transform: translate(-50%, -50%) scale(var(--scale, 1));
		opacity: 0;
		filter: drop-shadow(0 0 8px color-mix(in srgb, var(--tier-gold) 60%, transparent));
		animation: burst var(--dur, 900ms) ease-out forwards;
		animation-delay: var(--delay, 0ms);
	}
	.star::before {
		content: '\2B50';
	}
	.star.from-behind {
		opacity: 0.84;
		filter: drop-shadow(0 0 5px color-mix(in srgb, var(--tier-silver) 55%, transparent));
		animation-name: burstBehind;
	}
	@keyframes burst {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.92) rotate(0deg);
		}
		12% {
			opacity: 1;
			transform: translate(calc(-50% + var(--dx) * 0.2), calc(-50% + var(--dy) * 0.2)) scale(var(--scale)) rotate(var(--rot));
		}
		100% {
			opacity: 0;
			transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) scale(0.25) rotate(calc(var(--rot) * 2));
		}
	}
	@keyframes burstBehind {
		0% {
			opacity: 0;
			transform: translate(-50%, calc(-50% + 22px)) scale(0.68) rotate(0deg);
		}
		20% {
			opacity: 0.9;
			transform: translate(calc(-50% + var(--dx) * 0.14), calc(-50% + var(--dy) * 0.16 + 12px)) scale(var(--scale)) rotate(var(--rot));
		}
		100% {
			opacity: 0;
			transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy) + 10px)) scale(0.25) rotate(calc(var(--rot) * 2));
		}
	}
</style>

