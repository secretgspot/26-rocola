<script>
	import { addToast } from '$lib/client/stores.svelte.js';
	import { TIER_CONFIG } from '$lib/config.js';
	import { fade, scale, fly } from 'svelte/transition';

	let { onqueued } = $props();

	let url = $state('');
	let validating = $state(false);
	/** @type {any} */
	let metadata = $state(null);
	let error = $state('');
	let isOpen = $state(false);

	function open() { isOpen = true; }
	function close() { isOpen = false; reset(); }
	function reset() {
		url = '';
		metadata = null;
		error = '';
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
</script>

<!-- FAB -->
<button class="fab glitch-hover" onclick={open} class:hidden={isOpen}>
	<div class="fab-inner">
		<span class="label">ADD_TRACK</span>
		<span class="plus">+</span>
	</div>
	<div class="fab-rings">
		<div class="ring"></div>
		<div class="ring"></div>
	</div>
</button>

<!-- Modal Overlay -->
{#if isOpen}
	<div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && close()} transition:fade={{duration: 300}}>
		<div class="modal-window glass-panel" transition:fly={{y: 20, duration: 400, opacity: 0}}>
			<div class="corner-label">TX_TERMINAL</div>
			<header>
				<div class="header-main">
					<div class="icon-box">IN</div>
					<h3>INJECT SEQUENCE</h3>
				</div>
				<button class="close-btn" onclick={close}>[ X ]</button>
			</header>

			<div class="modal-body">
				<div class="input-container">
					<div class="input-label">YT_SOURCE_URL</div>
					<div class="input-group">
						<input 
							type="text" 
							placeholder="https://youtube.com/watch?v=..." 
							bind:value={url} 
							onkeydown={(e) => e.key === 'Enter' && validate()}
						/>
						<button class="btn-scan" onclick={validate} disabled={validating || !url}>
							<div class="scan-line" class:scanning={validating}></div>
							{validating ? 'SCANNING...' : 'SCAN'}
						</button>
					</div>
				</div>

				{#if error}
					<div class="error-msg" in:fly={{y: -10}}>
						<span class="err-tag">ERROR</span> {error}
					</div>
				{/if}

				{#if metadata}
					<div class="preview-card" in:scale={{start: 0.95, duration: 300}}>
						<div class="preview-thumb">
							<img src={metadata.thumbnail} alt="" />
							<div class="thumb-overlay"></div>
						</div>
						<div class="preview-info">
							<h4>{metadata.title}</h4>
							<p>{metadata.channelTitle}</p>
							<div class="vid-id">ID: {metadata.videoId}</div>
						</div>
					</div>

					<div class="tiers-grid">
						{#each Object.values(TIER_CONFIG).sort((a, b) => a.priority - b.priority) as t}
							<button class="tier-card {t.id}" onclick={() => submit(t.id)}>
								<div class="tier-header">
									<span class="tier-name">{t.label}</span>
									<span class="tier-price">${t.price}</span>
								</div>
								<div class="tier-desc">{t.description}</div>
								<div class="tier-bar" style="background-color: {t.color}"></div>
							</button>
						{/each}
					</div>
				{/if}
			</div>
			
			<footer class="modal-footer">
				<div class="system-logs">
					<div class="log-line">READY FOR INPUT...</div>
					{#if validating}<div class="log-line green">VALIDATING SOURCE...</div>{/if}
					{#if metadata}<div class="log-line cyan">SOURCE VERIFIED: {metadata.videoId}</div>{/if}
				</div>
			</footer>
		</div>
	</div>
{/if}

<style>
	/* FAB */
	.fab {
		width: 64px;
		height: 64px;
		background: #000;
		border: 1px solid var(--neon-cyan);
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.3s;
		z-index: 1000;
	}
	.fab-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 5;
	}
	.fab .label {
		font-family: var(--font-pixel);
		font-size: 0.35rem;
		color: var(--neon-cyan);
		margin-bottom: 2px;
	}
	.fab .plus {
		font-size: 1.5rem;
		color: #fff;
		line-height: 1;
		font-weight: 200;
	}
	
	.fab:hover {
		box-shadow: 0 0 20px rgba(0, 243, 255, 0.4);
		transform: scale(1.05);
	}
	.fab:hover .plus {
		transform: rotate(90deg);
		color: var(--neon-cyan);
	}
	
	.fab-rings .ring {
		position: absolute;
		top: 50%; left: 50%;
		width: 100%; height: 100%;
		border: 1px solid var(--neon-cyan);
		transform: translate(-50%, -50%);
		pointer-events: none;
		opacity: 0.3;
	}
	.fab:hover .ring:nth-child(1) { animation: ring-pulse 2s infinite; }
	.fab:hover .ring:nth-child(2) { animation: ring-pulse 2s infinite 1s; }

	.fab.hidden {
		opacity: 0;
		transform: scale(0.5) rotate(-90deg);
		pointer-events: none;
	}

	@keyframes ring-pulse {
		0% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
		100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
	}

	/* Modal */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(2, 3, 10, 0.9);
		backdrop-filter: blur(8px);
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		box-sizing: border-box;
	}

	.modal-window {
		width: 100%;
		max-width: 550px;
		background: #050714;
		border: 1px solid var(--glass-border);
		box-shadow: 0 0 60px rgba(0, 243, 255, 0.1);
		display: flex;
		flex-direction: column;
		position: relative;
	}

	@media (max-width: 480px) {
		.modal-window {
			max-height: 90vh;
			overflow-y: auto;
		}
	}
	
	.corner-label {
		position: absolute;
		top: -10px;
		left: 20px;
		background: var(--neon-cyan);
		color: #000;
		font-family: var(--font-pixel);
		font-size: 0.45rem;
		padding: 2px 6px;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid var(--glass-border);
		background: rgba(255,255,255,0.02);
	}
	@media (max-width: 480px) {
		header {
			padding: 1rem;
		}
	}
	.header-main {
		display: flex;
		align-items: center;
		gap: 1rem;
	}
	.icon-box {
		background: var(--neon-cyan);
		color: #000;
		font-family: var(--font-pixel);
		font-size: 0.6rem;
		padding: 4px 6px;
	}
	header h3 {
		color: #fff;
		font-size: 1rem;
		letter-spacing: 0.2em;
	}
	@media (max-width: 480px) {
		header h3 {
			font-size: 0.8rem;
		}
	}
	.close-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		font-family: var(--font-mono);
		font-size: 0.7rem;
		cursor: pointer;
	}
	.close-btn:hover { color: var(--neon-pink); }

	.modal-body {
		padding: 2rem;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	@media (max-width: 480px) {
		.modal-body {
			padding: 1rem;
			gap: 1.5rem;
		}
	}

	/* Inputs */
	.input-container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	.input-label {
		font-family: var(--font-pixel);
		font-size: 0.45rem;
		color: var(--text-dim);
	}
	.input-group {
		display: flex;
		gap: 0.5rem;
	}
	@media (max-width: 400px) {
		.input-group {
			flex-direction: column;
		}
	}
	input {
		flex: 1;
		background: rgba(0,0,0,0.5);
		border: 1px solid var(--glass-border);
		padding: 1rem;
		color: #fff;
		font-family: var(--font-mono);
		font-size: 0.85rem;
		border-radius: 0;
		min-width: 0;
	}
	input:focus {
		outline: none;
		border-color: var(--neon-cyan);
		box-shadow: 0 0 15px rgba(0, 243, 255, 0.15);
	}
	.btn-scan {
		background: #000;
		border: 1px solid var(--neon-cyan);
		color: var(--neon-cyan);
		font-family: var(--font-display);
		font-weight: 700;
		padding: 0 1.5rem;
		cursor: pointer;
		position: relative;
		overflow: hidden;
		transition: all 0.2s;
		white-space: nowrap;
	}
	@media (max-width: 400px) {
		.btn-scan {
			padding: 0.75rem;
		}
	}
	.btn-scan:hover:not(:disabled) {
		background: var(--neon-cyan);
		color: #000;
	}
	.btn-scan:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
	.scan-line {
		position: absolute;
		top: 0; left: 0; width: 100%; height: 2px;
		background: var(--neon-cyan);
		opacity: 0;
	}
	.scan-line.scanning {
		opacity: 1;
		animation: scan-anim 1s linear infinite;
	}
	@keyframes scan-anim {
		0% { top: 0; }
		100% { top: 100%; }
	}

	.error-msg {
		background: rgba(255, 0, 0, 0.05);
		border-left: 2px solid #ff4444;
		padding: 0.75rem;
		color: #ff4444;
		font-family: var(--font-mono);
		font-size: 0.75rem;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.err-tag {
		font-family: var(--font-pixel);
		font-size: 0.5rem;
		background: #ff4444;
		color: #fff;
		padding: 2px 4px;
	}

	/* Preview */
	.preview-card {
		display: flex;
		gap: 1.5rem;
		background: rgba(255,255,255,0.02);
		padding: 1rem;
		border: 1px solid var(--glass-border);
	}
	@media (max-width: 480px) {
		.preview-card {
			flex-direction: column;
			gap: 1rem;
		}
		.preview-thumb {
			width: 100%;
			height: 120px;
		}
	}
	.preview-thumb {
		width: 120px;
		height: 80px;
		position: relative;
		flex-shrink: 0;
	}
	.preview-thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.thumb-overlay {
		position: absolute;
		top: 0; left: 0; width: 100%; height: 100%;
		background: linear-gradient(rgba(0, 243, 255, 0.1), transparent);
		pointer-events: none;
	}
	.preview-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	.preview-info h4 {
		font-size: 0.95rem;
		margin-bottom: 0.5rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		color: #fff;
	}
	.preview-info p {
		font-family: var(--font-mono);
		font-size: 0.75rem;
		color: var(--neon-cyan);
		margin: 0;
	}
	.vid-id {
		font-family: var(--font-mono);
		font-size: 0.6rem;
		color: var(--text-muted);
		margin-top: 4px;
	}

	/* Tiers */
	.tiers-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}
	@media (max-width: 400px) {
		.tiers-grid {
			grid-template-columns: 1fr;
		}
	}
	.tier-card {
		background: rgba(255,255,255,0.01);
		border: 1px solid var(--glass-border);
		padding: 1.25rem;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		transition: all 0.2s;
		text-align: left;
		position: relative;
	}
	@media (max-width: 480px) {
		.tier-card {
			padding: 1rem;
		}
	}

	.tier-card:hover:not(.disabled) {
		background: rgba(255,255,255,0.04);
		border-color: var(--neon-cyan);
		transform: translateY(-2px);
	}
	.tier-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	.tier-name {
		font-family: var(--font-pixel);
		font-size: 0.55rem;
		color: var(--text-dim);
	}
	.tier-card.free .tier-name { color: var(--text-dim); }
	.tier-card.silver .tier-name { color: var(--tier-silver); }
	.tier-card.gold .tier-name { color: var(--tier-gold); }
	.tier-card.platinum .tier-name { color: var(--tier-platinum); }

	.tier-price {
		font-family: var(--font-mono);
		font-size: 0.85rem;
		color: #fff;
	}
	.tier-desc {
		font-family: var(--font-mono);
		font-size: 0.65rem;
		color: var(--text-muted);
	}
	.tier-bar {
		height: 2px;
		width: 100%;
		background: var(--glass-border);
		margin-top: 4px;
	}
	.tier-card:hover .tier-bar { background: var(--neon-cyan); box-shadow: 0 0 5px var(--neon-cyan); }

	.tier-card.disabled {
		opacity: 0.3;
		cursor: not-allowed;
		filter: grayscale(1);
	}
	
	.modal-footer {
		padding: 1rem 1.5rem;
		background: #000;
		border-top: 1px solid var(--glass-border);
	}
	.system-logs {
		font-family: var(--font-mono);
		font-size: 0.55rem;
		display: flex;
		flex-direction: column;
		gap: 2px;
	}
	.log-line { color: var(--text-muted); }
	.log-line.green { color: var(--neon-green); }
	.log-line.cyan { color: var(--neon-cyan); }

</style>
