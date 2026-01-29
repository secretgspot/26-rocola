<script>
	import { fade, fly } from 'svelte/transition';
	export let message = '';
	export let level = 'info';

	const icons = {
		info: 'INF',
		success: 'OK',
		warn: 'WRN',
		error: 'ERR'
	};
</script>

<div class={`toast ${level}`} in:fly={{ x: 50, duration: 400 }} out:fade={{ duration: 200 }}>
	<div class="level-badge">{icons[level] || 'MSG'}</div>
	<div class="content">
		{#if typeof message === 'object'}
			<div class="msg-title">{message.title || 'NOTIFICATION'}</div>
			{#if message.message}<div class="msg-body">{message.message}</div>{/if}
		{:else}
			<div class="msg-body">{message}</div>
		{/if}
	</div>
	<div class="side-accent"></div>
</div>

<style>
	.toast {
		background: #02030a;
		border: 1px solid var(--glass-border);
		color: #fff;
		padding: 0;
		min-width: 280px;
		max-width: 400px;
		display: flex;
		position: relative;
		overflow: hidden;
		box-shadow: 0 10px 30px rgba(0,0,0,0.8);
	}

	.toast.info { border-left: 2px solid var(--neon-cyan); }
	.toast.success { border-left: 2px solid var(--neon-green); }
	.toast.warn { border-left: 2px solid var(--tier-gold); }
	.toast.error { border-left: 2px solid var(--neon-pink); }

	.level-badge {
		background: rgba(255,255,255,0.05);
		padding: 0.75rem;
		font-family: var(--font-pixel);
		font-size: 0.45rem;
		display: flex;
		align-items: center;
		justify-content: center;
		color: var(--text-dim);
		border-right: 1px solid var(--glass-border);
		min-width: 50px;
	}
	.info .level-badge { color: var(--neon-cyan); }
	.success .level-badge { color: var(--neon-green); }
	.warn .level-badge { color: var(--tier-gold); }
	.error .level-badge { color: var(--neon-pink); }
	
	.content { 
		flex: 1; 
		padding: 0.75rem 1rem;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	
	.msg-title {
		font-family: var(--font-display);
		font-size: 0.7rem;
		color: var(--text-dim);
		margin-bottom: 2px;
		letter-spacing: 0.1em;
	}
	.msg-body {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.side-accent {
		width: 4px;
		background: var(--glass-border);
		opacity: 0.5;
	}
	.toast:hover .side-accent {
		background: var(--neon-cyan);
		opacity: 1;
		box-shadow: 0 0 10px var(--neon-cyan);
	}
</style>