<script>
	import LandingPage from '$lib/components/LandingPage.svelte';

	let {
		open = false,
		onClose = () => {},
		metrics = {},
		showAdminHealth = false,
		adminHealthState = '',
		adminHealthError = false,
		adminHealthCtrl = false,
		adminHealthLeaseSec = 0,
		adminHealthTurn = 0,
		adminHealthSeq = 0
	} = $props();
</script>

{#if open}
	<div
		class="help-backdrop"
		role="button"
		tabindex="0"
		aria-label="Close help"
		onclick={(e) => {
			if (e.target === e.currentTarget) onClose();
		}}
		onkeydown={(e) => {
			if (e.key === 'Enter' || e.key === ' ') onClose();
		}}
	>
		<button class="help-close-fixed" onclick={() => onClose()} aria-label="Close help">
			<span class="close-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24" role="img" focusable="false">
					<path
						fill-rule="evenodd"
						clip-rule="evenodd"
						d="M6.21991 6.21479C6.51281 5.92189 6.98768 5.92189 7.28057 6.21479L17.7854 16.7196C18.0783 17.0125 18.0783 17.4874 17.7854 17.7803C17.4925 18.0732 17.0177 18.0732 16.7248 17.7803L6.21991 7.27545C5.92702 6.98255 5.92702 6.50768 6.21991 6.21479Z"
						class="close-icon-soft"
					/>
					<path
						fill-rule="evenodd"
						clip-rule="evenodd"
						d="M17.7853 6.21479C18.0782 6.50769 18.0782 6.98256 17.7853 7.27545L7.28038 17.7802C6.98749 18.0731 6.51261 18.0731 6.21972 17.7802C5.92683 17.4873 5.92683 17.0124 6.21973 16.7195L16.7247 6.21478C17.0176 5.92189 17.4924 5.9219 17.7853 6.21479Z"
						class="close-icon-main"
					/>
				</svg>
			</span>
		</button>
		<div class="help-modal" role="dialog" aria-modal="true" aria-label="How Rocola works">
			<div class="help-content">
				<LandingPage
					{metrics}
					{showAdminHealth}
					{adminHealthState}
					{adminHealthError}
					{adminHealthCtrl}
					{adminHealthLeaseSec}
					{adminHealthTurn}
					{adminHealthSeq}
				/>
			</div>
		</div>
	</div>
{/if}

<style>
	.help-backdrop {
		position: fixed;
		inset: 0;
		z-index: var(--layer-important);
		display: flex;
		align-items: stretch;
		justify-content: stretch;
		padding: 0;
		background: transparent;
	}
	.help-modal {
		width: 100dvw;
		height: 100dvh;
		max-height: none;
		overflow-x: auto;
		overflow-y: auto;
		padding: 0;
		display: flex;
		align-items: stretch;
		background: linear-gradient(
			42deg,
			color-mix(in srgb, var(--queue-fade-void) 96%, transparent) 63%,
			transparent
		);
		border-radius: 0;
		border: 0;
	}
	.help-content {
		width: 100%;
		min-height: 100%;
		display: flex;
		align-items: center;
		justify-content: center;
		padding-top: calc(56px + var(--size-3));
		padding-bottom: calc(var(--mobile-footer-h, 124px) + var(--size-3));
		padding-left: var(--size-5);
		padding-right: var(--size-5);
		box-sizing: border-box;
	}
	.help-close-fixed {
		background: transparent;
		border: 0;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 9px;
		position: fixed;
		top: calc(56px + var(--size-2));
		right: var(--size-4);
		z-index: calc(var(--layer-important) + 1);
	}
	.help-close-fixed .close-icon { width: 36px; height: 36px; display: inline-flex; }
	.help-close-fixed .close-icon svg { width: 100%; height: 100%; }
	.help-close-fixed .close-icon-soft {
		fill: #ff6b6b;
		transition: fill var(--transition-duration-1) ease, filter var(--transition-duration-1) ease;
	}
	.help-close-fixed .close-icon-main {
		fill: #8b1f1f;
		transition: fill var(--transition-duration-1) ease, filter var(--transition-duration-1) ease;
	}
	.help-close-fixed:hover .close-icon-soft { fill: #ff8a8a; filter: drop-shadow(0 0 6px rgba(255, 106, 106, 0.8)); }
	.help-close-fixed:hover .close-icon-main { fill: #b32020; filter: drop-shadow(0 0 8px rgba(179, 32, 32, 0.85)); }
	.help-close-fixed:active .close-icon-soft { fill: #ffb0b0; filter: drop-shadow(0 0 8px rgba(255, 106, 106, 0.95)); }
	.help-close-fixed:active .close-icon-main { fill: #d92b2b; filter: drop-shadow(0 0 10px rgba(217, 43, 43, 0.95)); }
	@media (max-width: 640px) {
		.help-content {
			min-height: auto;
			align-items: flex-start;
			padding-left: var(--size-2);
			padding-right: var(--size-2);
			padding-top: calc(56px + var(--size-2));
			padding-bottom: calc(var(--mobile-footer-h, 124px) + var(--size-2));
		}
		.help-close-fixed {
			right: var(--size-2);
			top: calc(56px + var(--size-1));
		}
	}
</style>
