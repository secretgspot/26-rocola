<script module>
	/** @type {any} */
	let stripePromise = null;
	let globalLock = Promise.resolve();
	/** @type {any} */
	let activeInstance = null;
</script>

<script>
	import { onDestroy, tick } from 'svelte';

	/** @type {{ clientSecret: string, oncomplete: () => void, oncancel: () => void }} */
	let { clientSecret, oncomplete, oncancel } = $props();

	let isMounted = $state(false);
	/** @type {string} */
	let error = $state('');
	let isDestroyed = false;
	const uid = Math.random().toString(36).slice(2, 9);
	/** @type {string | null} */
	let lastSecret = null;
	let currentGeneration = 0;

	/**
	 * @param {string} secret
	 */
	async function init(secret) {
		if (!secret || secret === lastSecret) return;
		lastSecret = secret;
		const myGeneration = ++currentGeneration;
		
		console.debug(`[Stripe] Init request #${myGeneration} for ${uid}`);

		// Serialized global queue
		const previousLock = globalLock;
		let resolveLock;
		globalLock = new Promise(r => resolveLock = r);
		
		try {
			await previousLock;
			
			if (isDestroyed || myGeneration !== currentGeneration) {
				console.debug(`[Stripe] Aborting #${myGeneration}`);
				return;
			}

			await tick();
			error = '';

			if (!stripePromise) {
				// @ts-ignore
				if (typeof Stripe === 'undefined') throw new Error('Stripe.js not found in window');
				// @ts-ignore
				stripePromise = Stripe(import.meta.env.VITE_PUBLIC_STRIPE_KEY || '');
			}
			const stripe = stripePromise;

			if (activeInstance) {
				console.debug(`[Stripe] Destroying existing instance before #${myGeneration}`);
				try {
					activeInstance.destroy();
					await new Promise(r => setTimeout(r, 300));
				} catch (e) {
					console.warn('[Stripe] Cleanup warning:', e);
				}
				activeInstance = null;
			}

			const container = document.getElementById(`checkout-${uid}`);
			if (!container) return;
			container.innerHTML = '';

			console.debug(`[Stripe] Creating instance #${myGeneration}`);
			// @ts-ignore
			const instance = await stripe.initEmbeddedCheckout({ clientSecret: secret });
			
			if (isDestroyed || myGeneration !== currentGeneration) {
				console.debug(`[Stripe] Discarding instance #${myGeneration}`);
				instance.destroy();
				return;
			}

			activeInstance = instance;
			instance.mount(`#checkout-${uid}`);
			isMounted = true;
			console.debug(`[Stripe] Mounted instance #${myGeneration} successfully`);
		} catch (/** @type {any} */ err) {
			console.error(`[Stripe] Error in #${myGeneration}:`, err);
			error = err?.message || 'Payment engine failure';
			isMounted = false;
		} finally {
			if (resolveLock) resolveLock();
		}
	}

	$effect(() => {
		if (clientSecret) {
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
		{#if error}
			<div class="error-state">
				<p class="text-muted">// GATEWAY_FAILURE</p>
				<p class="error-msg">{error}</p>
				<button class="btn-retry" onclick={() => { lastSecret = null; init(clientSecret); }}>[RETRY_CONNECTION]</button>
			</div>
		{:else if !isMounted}
			<div class="loading">HANDSHAKING_WITH_STRIPE...</div>
		{/if}
		<div id="checkout-{uid}" class:hidden={!isMounted || !!error}></div>
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
		top: 0; left: 0; right: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		height: 200px;
		color: var(--text-dim);
		font-size: var(--font-size-0);
		animation: var(--animation-pulse);
	}
	.error-state {
		padding: var(--size-4);
		display: flex;
		flex-direction: column;
		gap: var(--size-3);
		align-items: center;
		text-align: center;
	}
	.error-msg { color: #ff4444; font-size: var(--font-size-0); }
	.btn-retry { font-size: var(--font-size-00); margin-top: var(--size-2); }
	.hidden { display: none; }
</style>
