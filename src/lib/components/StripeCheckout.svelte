<script module>
	// Shared singleton state across all component instances
	let stripe = null;
	let currentLock = Promise.resolve();
	let activeInstance = null;
</script>

<script>
	import { onMount, onDestroy, tick } from 'svelte';

	/** @type {{ clientSecret: string, oncomplete: () => void, oncancel: () => void }} */
	let { clientSecret, oncomplete, oncancel } = $props();

	let isMounted = $state(false);
	let isDestroyed = false;
	const uid = Math.random().toString(36).slice(2, 9);

	async function init(secret) {
		if (!secret) return;
		
		console.debug(`[Stripe] Init requested for ${uid}`);

		// Acquire lock
		const previous = currentLock;
		let resolve;
		currentLock = new Promise(r => resolve = r);
		
		try {
			await previous;
			if (isDestroyed) return;

			// Ensure DOM is updated so the container exists
			await tick();

			if (!stripe) {
				// @ts-ignore
				if (typeof Stripe === 'undefined') {
					console.error('[Stripe] Stripe.js global not found');
					return;
				}
				// @ts-ignore
				stripe = Stripe(import.meta.env.VITE_PUBLIC_STRIPE_KEY || '');
			}

			// 1. Force cleanup
			if (activeInstance) {
				console.debug(`[Stripe] Destroying existing instance`);
				try { 
					activeInstance.destroy(); 
					await new Promise(r => setTimeout(r, 50));
				} catch (e) { /* ignore */ }
				activeInstance = null;
			}

			// 2. Locate container
			const container = document.getElementById(`checkout-${uid}`);
			if (!container) {
				console.error(`[Stripe] Container checkout-${uid} missing`);
				return;
			}
			container.innerHTML = '';

			// 3. Initialize
			console.debug(`[Stripe] Calling initEmbeddedCheckout`);
			// @ts-ignore
			const instance = await stripe.initEmbeddedCheckout({ clientSecret: secret });
			
			if (isDestroyed) {
				instance.destroy();
				return;
			}

			activeInstance = instance;
			instance.mount(`#checkout-${uid}`);
			isMounted = true;
			console.debug(`[Stripe] Mounted ${uid}`);
		} catch (err) {
			console.error(`[Stripe] Error in ${uid}:`, err);
		} finally {
			resolve();
		}
	}

	$effect(() => {
		if (clientSecret) {
			isMounted = false;
			init(clientSecret);
		}
	});

	onDestroy(() => {
		isDestroyed = true;
		console.debug(`[Stripe] Component ${uid} destroyed`);
	});
</script>

<div class="stripe-container">
	<div class="checkout-wrapper">
		{#if !isMounted}
			<div class="loading">INITIALIZING_SECURE_CHANNEL...</div>
		{/if}
		<div id="checkout-{uid}"></div>
	</div>
</div>

<style>
	.stripe-container {
		background: var(--bg-dark);
		display: flex;
		flex-direction: column;
		min-height: 300px;
	}
	.checkout-wrapper {
		position: relative;
		flex: 1;
	}
	.loading {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: var(--text-dim);
		font-size: var(--font-size-0);
		animation: var(--animation-pulse);
	}
</style>
