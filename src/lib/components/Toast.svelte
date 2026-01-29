<script>
	let { message = '', level = 'info' } = $props();
</script>

<div class="toast {level}">
	<div class="toast-content">
		<span class="indicator"></span>
		<span class="message">{message}</span>
	</div>
</div>

<style>
	.toast {
		background: rgba(0, 0, 0, 0.9);
		border-left: 3px solid var(--neon-cyan);
		color: #fff;
		padding: 0.75rem 1.25rem;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
		animation: slide-in 0.3s ease-out;
		min-width: 200px;
		pointer-events: auto;
		border: 1px solid var(--glass-border);
	}

	.toast.success { border-left-color: var(--neon-green); }
	.toast.warn { border-left-color: var(--tier-gold); }
	.toast.error { border-left-color: var(--neon-pink); }

	.toast-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.indicator {
		width: 6px;
		height: 6px;
		background: var(--neon-cyan);
		border-radius: 50%;
		box-shadow: 0 0 8px var(--neon-cyan);
	}
	.success .indicator { background: var(--neon-green); box-shadow: 0 0 8px var(--neon-green); }
	.warn .indicator { background: var(--tier-gold); box-shadow: 0 0 8px var(--tier-gold); }
	.error .indicator { background: var(--neon-pink); box-shadow: 0 0 8px var(--neon-pink); }

	@keyframes slide-in {
		from { transform: translateX(100%); opacity: 0; }
		to { transform: translateX(0); opacity: 1; }
	}
</style>
