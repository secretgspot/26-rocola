<script>
	let { bursts = [] } = $props();
</script>

<div class="stars-overlay" aria-hidden="true">
	{#each bursts as burst (burst.id)}
		<div class="burst" style={`left:${burst.x * 100}%;top:${burst.y * 100}%;`}>
			{#each burst.particles as p, idx (idx)}
				<span
					class="star"
					style={`--dx:${p.dx}px;--dy:${p.dy}px;--delay:${p.delay}ms;--dur:${p.dur}ms;--scale:${p.scale};--rot:${p.rot}deg;`}
				></span>
			{/each}
		</div>
	{/each}
</div>

<style>
	.stars-overlay {
		position: fixed;
		inset: 0;
		z-index: var(--layer-important);
		pointer-events: none;
		overflow: hidden;
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
		font-size: 18px;
		transform: translate(-50%, -50%) scale(var(--scale, 1));
		opacity: 0;
		filter: drop-shadow(0 0 8px color-mix(in srgb, var(--tier-gold) 60%, transparent));
		animation: burst var(--dur, 900ms) ease-out forwards;
		animation-delay: var(--delay, 0ms);
	}
	.star::before {
		content: '\2B50';
	}
	@keyframes burst {
		0% {
			opacity: 0;
			transform: translate(-50%, -50%) scale(0.5) rotate(0deg);
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
</style>

