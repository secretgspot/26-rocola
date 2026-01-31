<script>
	let { message = '', level = 'info' } = $props();
</script>

<div class="toast {level}">
	<div class="toast-content">
		<span class="level-tag">[{level.toUpperCase()}]</span>
		<span class="message">{message}</span>
	</div>
</div>

<style>
	.toast {
		background: var(--text-main);
		color: var(--bg-dark);
		padding: 0.75rem 1rem;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		font-weight: 600;
		animation: slide-in 0.2s ease-out;
		min-width: 250px;
		pointer-events: auto;
		border: 1px solid var(--bg-dark);
	}

	.toast.error {
		background: #000;
		color: #ff4444;
		border: 1px solid #ff4444;
	}

	.toast-content {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.level-tag {
		font-weight: 800;
		font-size: 0.7rem;
	}

	@keyframes slide-in {
		from { transform: translateX(20px); opacity: 0; }
		to { transform: translateX(0); opacity: 1; }
	}
</style>
