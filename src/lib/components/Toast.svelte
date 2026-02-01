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
		padding: var(--size-2) var(--size-3);
		font-family: var(--font-mono);
		font-size: var(--font-size-1);
		font-weight: var(--font-weight-6);
		animation: var(--animation-slide-in-right);
		min-width: 250px;
		pointer-events: auto;
		border: var(--border-size-1) solid var(--bg-dark);
	}

	.toast.error {
		background: #000;
		color: #ff4444;
		border: var(--border-size-1) solid #ff4444;
	}

	.toast-content {
		display: flex;
		align-items: center;
		gap: var(--size-3);
	}

	.level-tag {
		font-weight: var(--font-weight-8);
		font-size: var(--font-size-0);
	}
</style>
