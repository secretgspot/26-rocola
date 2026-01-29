<script>
	import { fade, fly } from 'svelte/transition';
	export let message = '';
	export let level = 'info';

	const icons = {
		info: 'ℹ️',
		success: '✅',
		warn: '⚠️',
		error: '❌'
	};
</script>

<div class={`toast ${level}`} in:fly={{ x: 50, duration: 300 }} out:fade={{ duration: 200 }}>
	<div class="icon">{icons[level] || '📢'}</div>
	<div class="content">
		{#if typeof message === 'object'}
			<div class="msg-title">{message.title || 'Notification'}</div>
			{#if message.message}<div class="msg-body">{message.message}</div>{/if}
		{:else}
			<div class="msg-body">{message}</div>
		{/if}
	</div>
	<div class="scan-line"></div>
</div>

<style>
	.toast {
		background: rgba(10, 14, 39, 0.95);
		border: 1px solid rgba(255,255,255,0.1);
		color: #fff;
		padding: 0.75rem 1rem;
		border-radius: 4px; /* blockier look */
		box-shadow: 0 4px 20px rgba(0,0,0,0.6);
		min-width: 250px;
		max-width: 350px;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		position: relative;
		overflow: hidden;
		backdrop-filter: blur(8px);
	}

	.toast.info { border-left: 3px solid var(--neon-cyan); box-shadow: -2px 0 10px rgba(0,243,255,0.2); }
	.toast.success { border-left: 3px solid var(--neon-green); box-shadow: -2px 0 10px rgba(10,255,10,0.2); }
	.toast.warn { border-left: 3px solid var(--tier-gold); box-shadow: -2px 0 10px rgba(255,215,0,0.2); }
	.toast.error { border-left: 3px solid var(--neon-pink); box-shadow: -2px 0 10px rgba(255,0,110,0.2); }

	.icon { font-size: 1.2rem; }
	
	.content { flex: 1; }
	
	.msg-title {
		font-family: var(--font-display);
		font-size: 0.8rem;
		color: var(--text-dim);
		margin-bottom: 2px;
	}
	.msg-body {
		font-family: var(--font-body);
		font-size: 0.9rem;
	}

	.scan-line {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 2px;
		background: rgba(255,255,255,0.1);
		animation: scan 2s linear infinite;
	}
	
	@keyframes scan {
		0% { transform: translateY(-100%); }
		100% { transform: translateY(500%); }
	}
</style>