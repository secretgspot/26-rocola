<script>
	let { message = '', level = 'info' } = $props();
</script>

<div class="toast {level}">
	<div class="toast-content">
		{#if level && level !== 'plain'}
			<span class="level-tag">[{level.toUpperCase()}]</span>
		{/if}
		<span class="message">{message}</span>
	</div>
</div>

<style>
		.toast {
			background: var(--bg-panel);
			color: var(--text-main);
			padding: 2px var(--size-3);
			font-family: var(--font-monospace-code);
			font-size: var(--font-size-0);
			font-weight: var(--font-weight-1);
			animation: toastDropIn 180ms ease-out both;
			min-width: 250px;
			pointer-events: auto;
			border: 0;
		}

		.toast.error {
			background: var(--bg-dark);
			color: #ffffff;
			border: 1px solid #ffffff;
		}
		.toast.plain {
			min-width: 0;
			width: fit-content;
		}

		.toast-content {
			display: flex;
			align-items: center;
			justify-content: flex-start;
			gap: var(--size-3);
		}
		.message { text-align: left; }

		.level-tag {
			font-weight: var(--font-weight-8);
			font-size: var(--font-size-0);
			letter-spacing: 0.1em;
		}

		@keyframes toastDropIn {
			from {
				opacity: 0;
				transform: translateY(-10px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}
	</style>
