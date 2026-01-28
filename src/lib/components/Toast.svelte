<script>
	import { fade, fly } from 'svelte/transition';
	export let message = '';
	export let level = 'info';
</script>

<style>
	.toast { background: rgba(0,0,0,0.9); color: #fff; padding: .6rem 1rem; border-radius: 8px; box-shadow: 0 8px 30px rgba(0,0,0,0.6); min-width: 220px }
	.toast.info { border-left: 4px solid #00d9ff }
	.toast.success { border-left: 4px solid #7CFC00 }
	.toast.warn { border-left: 4px solid #ffae42 }
</style>

<div class={`toast ${level}`} in:fly={{ x: 40, duration: 220 }} out:fade>{typeof message === 'object' ? (message.title ?? message.message ?? JSON.stringify(message)) : message}</div>
