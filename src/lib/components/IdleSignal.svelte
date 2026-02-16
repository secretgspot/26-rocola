<div class="idle-signal" role="img" aria-label="System idle">
	<svg viewBox="0 0 160 160" focusable="false">
		<circle class="ring ring-1" cx="80" cy="80" r="22" />
		<circle class="ring ring-2" cx="80" cy="80" r="40" />
		<circle class="ring ring-3" cx="80" cy="80" r="58" />
		<circle class="core" cx="80" cy="80" r="4" />
		<g class="sweep">
			<line x1="80" y1="80" x2="80" y2="20" class="sweep-line" />
		</g>
	</svg>
</div>

<style>
	.idle-signal {
		width: clamp(96px, 18vw, 168px);
		height: clamp(96px, 18vw, 168px);
		color: var(--text-dim);
		opacity: 0.9;
	}

	svg {
		width: 100%;
		height: 100%;
		fill: none;
	}

	.ring,
	.sweep-line {
		stroke: currentColor;
		stroke-width: 1.6;
	}

	.ring {
		animation: pulse 2.2s ease-in-out infinite;
	}

	.ring-2 {
		animation-delay: 180ms;
	}

	.ring-3 {
		animation-delay: 360ms;
	}

	.core {
		fill: currentColor;
		animation: blink 1.2s ease-in-out infinite;
	}

	.sweep {
		transform-origin: 80px 80px;
		animation: spin 2.8s linear infinite;
	}

	@keyframes pulse {
		0%, 100% { opacity: 0.35; }
		50% { opacity: 0.95; }
	}

	@keyframes blink {
		0%, 100% { opacity: 0.5; }
		50% { opacity: 1; }
	}

	@keyframes spin {
		from { transform: rotate(0deg); }
		to { transform: rotate(360deg); }
	}
</style>
