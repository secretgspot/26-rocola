<script>
	import { TIER_CONFIG, getTierConfig } from '$lib/config.js';
	import { fade, scale } from 'svelte/transition';
	import StripeCheckout from './StripeCheckout.svelte';
	import Icon from './Icon.svelte';

	let { onqueued, onstar, hideTrigger = false, hideStar = false, pulse = false, mode = 'center' } = $props();

	let url = $state('');
	let validating = $state(false);
	/** @type {any} */
	let metadata = $state(null);
	let error = $state('');
	let isOpen = $state(false);
	let stripeClientSecret = $state('');
	let stripeSessionId = $state('');
	let isProcessingPayment = $state(false);
	let selectedTier = $state('');
	let starBtnEl = $state();

	let activeTierConfig = $derived(getTierConfig(selectedTier));

	function open() {
		isOpen = true;
	}
	function close() {
		isOpen = false;
		// Let modal outro complete before resetting fields.
		setTimeout(reset, 220);
	}
	function reset() {
		url = '';
		metadata = null;
		error = '';
		stripeClientSecret = '';
		stripeSessionId = '';
		isProcessingPayment = false;
		selectedTier = '';
	}

	function cancelPayment() {
		stripeClientSecret = '';
		stripeSessionId = '';
		isProcessingPayment = false;
		selectedTier = '';
	}

	async function completePayment() {
		if (!stripeSessionId) {
			error = 'Missing checkout session';
			return;
		}
		try {
			const res = await fetch('/api/checkout/complete', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ sessionId: stripeSessionId })
			});
			const data = await res.json();
			if (!data.ok) {
				error = data.error || 'Payment finalization failed';
				return;
			}
			onqueued?.();
			close();
		} catch (e) {
			error = 'Payment finalization failed';
		}
	}

	async function validate() {
		error = '';
		validating = true;
		try {
			const res = await fetch('/api/youtube/validate', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url }) });
			const data = await res.json();
			if (!data.ok) {
				error = data.error || 'Invalid video';
				metadata = null;
			} else {
				const meta = data.metadata || { title: 'Unknown', thumbnail: '', channelTitle: '' };
				metadata = { ...meta, videoId: data.videoId };
			}
		} catch (e) {
			error = 'Validation failed';
			metadata = null;
		} finally {
			validating = false;
		}
	}

	async function submit(tier = 'free') {
		if (!metadata?.videoId) return;
		
		error = '';
		selectedTier = tier;
		const isPaid = tier !== 'free';
		
		if (isPaid) {
			isProcessingPayment = true;
			try {
				const payRes = await fetch('/api/checkout', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({ metadata, tier })
				});
				const payData = await payRes.json();
				if (payData.clientSecret) {
					stripeClientSecret = payData.clientSecret;
					stripeSessionId = payData.sessionId || '';
				} else {
					error = payData.error || 'Payment initialization failed';
					isProcessingPayment = false;
				}
			} catch (e) {
				error = 'Payment service unavailable';
				isProcessingPayment = false;
			}
		} else {
			const res = await fetch('/api/queue', { 
				method: 'POST', 
				headers: { 'content-type': 'application/json' }, 
				body: JSON.stringify({ videoId: metadata.videoId, metadata, tier }) 
			});
			
			const data = await res.json();
			if (data.ok) {
				onqueued?.();
				close();
			} else {
				error = data.error || 'Failed to add song';
			}
		}
	}

	function star() {
		const rect = starBtnEl?.getBoundingClientRect?.();
		const x = rect ? (rect.left + rect.width / 2) / window.innerWidth : 0.82;
		const y = rect ? (rect.top + rect.height / 2) / window.innerHeight : 0.76;
		onstar?.({ x, y });
	}
</script>

{#if mode === 'center' && !isOpen && !hideTrigger}
	<p class="empty-queue-callout">Queue's asleep. Wake it with a banger.</p>
{/if}

<button
	class="fab"
	class:pulse
	class:fab-center={mode === 'center'}
	class:fab-near-queue={mode === 'nearQueue'}
	onclick={open}
	class:hidden={isOpen || hideTrigger}
>
	<Icon name="add" size={30} color="var(--fab-icon-color)" strokeWidth={1.9} />
</button>

<button
	class="fab fab-star"
	class:fab-center-star={mode === 'center'}
	class:fab-near-queue-star={mode === 'nearQueue'}
	onclick={star}
	class:hidden={isOpen || hideTrigger || hideStar}
	bind:this={starBtnEl}
	aria-label="Send star reaction"
>
	<Icon name="stars" size={24} color="var(--fab-icon-color)" strokeWidth={1.8} />
</button>

{#if isOpen}
	<div
		class="modal-backdrop"
		role="button"
		tabindex="0"
		aria-label="Close dialog"
		onclick={(e) => e.target === e.currentTarget && close()}
		onkeydown={(e) => {
			if (e.target !== e.currentTarget) return;
			if (e.key === 'Enter' || e.key === ' ') close();
		}}
		transition:fade={{duration: 100}}
	>
		<div
			class="modal-window"
			transition:scale={{start: 0.14, duration: 220, opacity: 0.15}}
		>
			<header>
				<div class="header-main" aria-hidden="true"></div>
				<button class="close-btn" onclick={close} aria-label="Close">
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
			</header>

			<div class="modal-body">
				{#if !stripeClientSecret}
					<div class="input-container">
						<div class="input-label">>> SOURCE_URL</div>
						<div class="input-group">
							<input 
								type="text" 
								placeholder="https://youtube.com/watch?v=..." 
								bind:value={url} 
								onkeydown={(e) => e.key === 'Enter' && validate()}
							/>
							<button class="btn-scan" onclick={validate} disabled={validating || !url}>
								{validating ? 'SCANNING...' : 'SCAN'}
							</button>
						</div>
					</div>

					{#if error}
						<div class="error-msg">
							<span class="err-tag">ERROR</span> {error}
						</div>
					{/if}
				{/if}

				{#if metadata}
					<div class="preview-card">
						<div class="preview-thumb">
							<img src={metadata.thumbnail} alt="" />
						</div>
						<div class="preview-info">
							<h4>{metadata.title}</h4>
							<p>{metadata.channelTitle}</p>
							<div class="vid-id">ID: {metadata.videoId}</div>
						</div>
					</div>

					<div class="tiers-grid">
						{#each Object.values(TIER_CONFIG).sort((a, b) => a.priority - b.priority) as t}
							<button 
								class="tier-card {t.id}" 
								class:active={selectedTier === t.id}
								onclick={() => submit(t.id)}
								disabled={isProcessingPayment && selectedTier === t.id}
							>
								<div class="tier-header">
									<span class="tier-name">[{t.label}]</span>
									<span class="tier-price">{t.price > 0 ? `$${t.price}` : 'FREE'}</span>
								</div>
								<div class="tier-desc">{t.description}</div>
							</button>
						{/each}
					</div>

					{#if stripeClientSecret}
						<div class="checkout-section">
							<div class="section-divider">
								<span>SECURE_PAYMENT_ZONE</span>
								<button class="btn-cancel-pay" onclick={cancelPayment}>[CANCEL_PAYMENT]</button>
							</div>
							<StripeCheckout 
								clientSecret={stripeClientSecret} 
								oncomplete={completePayment}
								oncancel={cancelPayment}
							/>
						</div>
					{/if}
				{/if}
			</div>
			
			<footer class="modal-footer">
				<div class="system-logs">
					<div class="log-line">> READY_FOR_INPUT</div>
					{#if validating}<div class="log-line highlight">> VALIDATING_SOURCE...</div>{/if}
					{#if metadata}<div class="log-line highlight">> SOURCE_VERIFIED: {metadata.videoId}</div>{/if}
				</div>
			</footer>
		</div>
	</div>
{/if}

<style>
	@layer add-layout, add-responsive, add-motion;

	@layer add-layout {
		.fab {
		position: fixed;
		width: var(--size-9);
		height: var(--size-9);
		background: var(--text-main);
		color: var(--bg-dark);
		--fab-icon-color: var(--bg-dark);
		border: 0;
		border-radius: 9px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: var(--layer-5);
		transition: transform var(--transition-duration-1), background var(--transition-duration-1), color var(--transition-duration-1);
		}
		.empty-queue-callout {
			position: fixed;
			left: 50%;
			top: 50%;
			transform: translate(-50%, calc(-50% - 74px));
			margin: 0;
			padding: 0 var(--size-2);
			font-size: var(--font-size-0);
			letter-spacing: 0.04em;
			text-transform: uppercase;
			color: color-mix(in srgb, var(--text-main) 86%, transparent);
			text-align: center;
			z-index: var(--layer-5);
			pointer-events: none;
			white-space: nowrap;
		}
		.fab-center {
			left: 50%;
			top: 50%;
		margin-left: calc(var(--size-9) / -2);
		margin-top: calc(var(--size-9) / -2);
	}
		.fab-near-queue {
			top: auto;
			right: var(--size-3);
			bottom: calc(120px + var(--size-3) - var(--size-9));
			margin: 0;
			transform: none;
		}
		.fab-center-star {
			left: calc(50% - var(--size-9) - var(--size-2));
			top: 50%;
			margin-left: calc(var(--size-9) / -2);
			margin-top: calc(var(--size-9) / -2);
		}
		.fab-near-queue-star {
			top: auto;
			right: calc(var(--size-3) + var(--size-9) + var(--size-2));
			bottom: calc(120px + var(--size-3) - var(--size-9));
			margin: 0;
			transform: none;
		}
		.fab-star {
			opacity: 0.86;
		}
		.fab-star:hover {
			transform: scale(1.06);
			opacity: 1;
		}
	:global([data-theme='light']) .fab {
		background: #000000;
		color: #ffffff;
		--fab-icon-color: #ffffff;
	}
	.fab:hover { transform: scale(1.04); }
	.fab.hidden { opacity: 0; pointer-events: none; }
	.fab.pulse {
		animation: fabPulse 1.4s ease-in-out infinite;
	}

	.modal-backdrop {
		position: fixed;
		top: 0; left: 0; width: 100vw; height: 100vh;
		background: var(--backdrop-veil);
		z-index: var(--layer-important);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--size-5);
		container-type: inline-size;
		container-name: add-modal;
	}

	.modal-window {
		width: 100%;
		max-width: 480px;
		background: transparent;
		border: 0;
		display: flex;
		flex-direction: column;
		max-height: calc(100dvh - var(--size-6));
		box-shadow: none;
		transform-origin: center center;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--size-3);
		border-bottom: 0;
		background: transparent;
		flex-shrink: 0;
	}
	.header-main { display: block; width: 1px; height: 1px; }
	.close-btn {
		background: transparent;
		border: 0;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		border-radius: 9px;
	}
	.close-btn .close-icon { width: 36px; height: 36px; display: inline-flex; }
	.close-btn .close-icon svg { width: 100%; height: 100%; }
	.close-btn .close-icon-soft {
		fill: #ff6b6b;
		transition: fill var(--transition-duration-1) ease, filter var(--transition-duration-1) ease;
	}
	.close-btn .close-icon-main {
		fill: #8b1f1f;
		transition: fill var(--transition-duration-1) ease, filter var(--transition-duration-1) ease;
	}
	.close-btn:hover .close-icon-soft { fill: #ff8a8a; filter: drop-shadow(0 0 6px rgba(255, 106, 106, 0.8)); }
	.close-btn:hover .close-icon-main { fill: #b32020; filter: drop-shadow(0 0 8px rgba(179, 32, 32, 0.85)); }
	.close-btn:active .close-icon-soft { fill: #ffb0b0; filter: drop-shadow(0 0 8px rgba(255, 106, 106, 0.95)); }
	.close-btn:active .close-icon-main { fill: #d92b2b; filter: drop-shadow(0 0 10px rgba(217, 43, 43, 0.95)); }

	.modal-body { padding: var(--size-4); display: flex; flex-direction: column; gap: var(--size-4); overflow-y: auto; }
	.modal-window button {
		color: var(--text-main);
		border-radius: 9px;
	}
		.input-container { display: flex; flex-direction: column; gap: var(--size-1); }
		.input-label { font-size: var(--font-size-00); color: var(--text-muted); font-weight: var(--font-weight-3); }
		.input-group { display: flex; gap: var(--size-2); }
		input { flex: 1; background: color-mix(in srgb, var(--bg-dark) 94%, transparent); border: 0; padding: var(--size-2); color: var(--text-main); font-size: var(--font-size-1); font-family: var(--font-monospace-code); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-main) 35%, transparent); }
		input:focus { outline: none; border-color: var(--text-main); }
		.btn-scan { font-weight: var(--font-weight-3); font-size: var(--font-size-1); padding: 0 var(--size-3); background: color-mix(in srgb, var(--bg-dark) 94%, transparent); border: 0; color: var(--text-main); cursor: pointer; box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-main) 35%, transparent); }
		.btn-scan:hover:not(:disabled) { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text-main) 75%, transparent); }

	.error-msg { background: var(--bg-dark); border: var(--border-size-1) solid #ff4444; padding: var(--size-2); color: #ff4444; font-size: var(--font-size-0); display: flex; align-items: center; gap: var(--size-2); }
		.err-tag { font-weight: var(--font-weight-4); background: #ff4444; color: #fff; padding: 1px 3px; font-size: var(--font-size-00); }

	.preview-card { display: flex; gap: var(--size-3); background: transparent; padding: var(--size-2); border: 0; }
	.preview-thumb { width: 80px; height: 55px; border: 0; }
	.preview-thumb img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1); }
	.preview-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
	.preview-info h4 { font-size: var(--font-size-1); color: var(--text-dim); margin: 0 0 var(--size-1) 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.preview-info p { font-size: var(--font-size-0); color: var(--text-dim); margin: 0; }
	.vid-id { font-size: var(--font-size-00); color: var(--text-muted); }

	.tiers-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--size-2); }
	.tier-card { background: transparent; border: 0; padding: var(--size-3); cursor: pointer; text-align: left; transition: all var(--transition-duration-1); display: flex; flex-direction: column; gap: var(--size-1); color: var(--text-main); border-radius: 9px; }
	.tier-card.active {
		background: transparent;
		border: 0;
		box-shadow:
			0 0 16px color-mix(in srgb, var(--border-bright) 65%, transparent);
		opacity: 1;
		filter: none;
	}
	.tier-card.active .tier-name, .tier-card.active .tier-price, .tier-card.active .tier-desc { color: var(--text-main); }
	.tier-card:hover { opacity: 1; filter: none; background: transparent; }
	.tier-card.free { box-shadow: inset 2px 0 0 var(--text-muted); }
	.tier-card.silver {
		--glow-color: var(--tier-silver);
		box-shadow:
			inset 2px 0 0 var(--tier-silver),
			0 0 5px color-mix(in srgb, var(--tier-silver) 40%, transparent);
		animation: tierPulseSilver 2.5s ease-in-out infinite;
	}
	.tier-card.gold {
		--glow-color: var(--tier-gold);
		box-shadow:
			inset 2px 0 0 var(--tier-gold),
			0 0 7px color-mix(in srgb, var(--tier-gold) 55%, transparent);
		animation: tierPulseGold 2.1s ease-in-out infinite;
	}
	.tier-card.platinum {
		--glow-color: #7de3ff;
		box-shadow:
			inset 2px 0 0 #7de3ff,
			0 0 18px color-mix(in srgb, #7de3ff 72%, transparent);
		animation: tierPulsePlatinum 1.8s ease-in-out infinite;
	}
	.tier-card.silver .tier-name,
	.tier-card.silver .tier-price { color: var(--tier-silver); }
	.tier-card.gold .tier-name,
	.tier-card.gold .tier-price { color: var(--tier-gold); }
	.tier-card.platinum .tier-name,
	.tier-card.platinum .tier-price { color: #7de3ff; }
	.tier-card.active.silver,
	.tier-card.active.gold,
	.tier-card.active.platinum,
	.tier-card.active.free {
		box-shadow:
			inset 2px 0 0 currentColor,
			0 0 18px color-mix(in srgb, var(--border-bright) 72%, transparent);
		opacity: 1;
		filter: none;
	}

	.modal-footer {
		padding: var(--size-2) var(--size-3);
		padding-bottom: calc(var(--size-2) + env(safe-area-inset-bottom, 0px));
		background: transparent;
		border-top: 0;
	}
	.system-logs { font-size: var(--font-size-00); display: flex; flex-direction: column; gap: 1px; }
	.log-line { color: var(--text-muted); }
	.log-line.highlight { color: var(--text-dim); }

	.checkout-section {
		display: flex;
		flex-direction: column;
		gap: var(--size-3);
		margin-top: var(--size-2);
	}
		.section-divider {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--size-3);
		font-size: var(--font-size-00);
		color: var(--text-muted);
			font-weight: var(--font-weight-3);
		border-bottom: 0;
		padding-bottom: var(--size-1);
	}
	.btn-cancel-pay {
		background: none;
		border: none;
		color: var(--text-muted);
		font-size: var(--font-size-00);
		cursor: pointer;
		padding: 0;
	}
	.btn-cancel-pay:hover {
		color: #ff4444;
	}

	@keyframes tierPulseSilver {
		0%, 100% { box-shadow: inset 2px 0 0 var(--tier-silver), 0 0 3px color-mix(in srgb, var(--tier-silver) 30%, transparent); }
		50% { box-shadow: inset 2px 0 0 var(--tier-silver), 0 0 6px color-mix(in srgb, var(--tier-silver) 55%, transparent); }
	}
	@keyframes tierPulseGold {
		0%, 100% { box-shadow: inset 2px 0 0 var(--tier-gold), 0 0 5px color-mix(in srgb, var(--tier-gold) 45%, transparent); }
		50% { box-shadow: inset 2px 0 0 var(--tier-gold), 0 0 9px color-mix(in srgb, var(--tier-gold) 70%, transparent); }
	}
	@keyframes tierPulsePlatinum {
		0%, 100% { box-shadow: inset 2px 0 0 #7de3ff, 0 0 14px color-mix(in srgb, #7de3ff 55%, transparent); }
		50% { box-shadow: inset 2px 0 0 #7de3ff, 0 0 26px color-mix(in srgb, #7de3ff 85%, transparent); }
	}
	@keyframes fabPulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.08); }
	}
	}

		@layer add-responsive {
			@media (max-width: 1023px) and (orientation: portrait) {
				.empty-queue-callout {
					top: 50%;
					bottom: auto;
					transform: translate(-50%, calc(-50% - 74px));
					white-space: nowrap;
					max-width: none;
				}
				.fab-center {
					left: 50%;
					top: 50%;
				right: auto;
				bottom: auto;
				margin-left: calc(var(--size-9) / -2);
				margin-top: calc(var(--size-9) / -2);
				transform: none;
			}
				.fab-near-queue {
			left: auto;
			top: auto;
			right: var(--size-3);
			bottom: calc(var(--mobile-footer-h, 124px) - 10px + env(safe-area-inset-bottom, 0px));
			margin: 0;
			transform: none;
		}
			.fab-center-star {
				left: calc(50% - var(--size-9) - var(--size-2));
				top: 50%;
				right: auto;
				bottom: auto;
				margin-left: calc(var(--size-9) / -2);
				margin-top: calc(var(--size-9) / -2);
				transform: none;
			}
			.fab-near-queue-star {
				left: auto;
				top: auto;
				right: calc(var(--size-3) + var(--size-9) + var(--size-2));
				bottom: calc(var(--mobile-footer-h, 124px) - 10px + env(safe-area-inset-bottom, 0px));
				margin: 0;
				transform: none;
			}
	}
		@media (max-width: 1023px) and (orientation: landscape) {
			.fab-near-queue {
				right: var(--size-3);
				bottom: calc(104px + var(--size-3) - var(--size-9));
			}
			.fab-near-queue-star {
				right: calc(var(--size-3) + var(--size-9) + var(--size-2));
				bottom: calc(104px + var(--size-3) - var(--size-9));
			}
		}
	@container add-modal (max-width: 640px) {
		.modal-backdrop {
			align-items: flex-end;
			justify-content: center;
			padding: var(--size-2);
			padding-bottom: calc(var(--size-2) + env(safe-area-inset-bottom, 0px));
		}
		.modal-window {
			max-width: 100%;
			max-height: calc(100dvh - var(--size-2) - env(safe-area-inset-bottom, 0px));
		}
	}
	}

</style>
