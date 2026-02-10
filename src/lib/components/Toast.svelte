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
		background: var(--bg-panel);
		color: var(--text-main);
		padding: var(--size-2) var(--size-3);
		font-family: var(--font-mono);
		font-size: var(--font-size-1);
		font-weight: var(--font-weight-6);
		animation: var(--animation-slide-in-right);
		min-width: 250px;
		pointer-events: auto;
		border: 0;
	}

	.toast.error {
		background: var(--bg-dark);
		color: #ffffff;
		border: 1px solid #ffffff;
	}

	.toast-content {
		display: flex;
		align-items: center;
		gap: var(--size-3);
	}

	.level-tag {
		font-weight: var(--font-weight-8);
		font-size: var(--font-size-0);
		letter-spacing: 0.1em;
	}
</style>
