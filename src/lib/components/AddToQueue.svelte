<script>
	import { createEventDispatcher } from 'svelte';
	import { addToast } from '$lib/client/stores.js';
	import { fade, scale } from 'svelte/transition';

	let url = '';
	let validating = false;
	let metadata = null;
	let error = '';
	let isOpen = false;

	const dispatch = createEventDispatcher();

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
				metadata = data.metadata || { title: 'Unknown', thumbnail: '', channelTitle: '' };
				metadata.videoId = data.videoId;
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
		
		// For now only free is real
		if (tier !== 'free') {
			addToast({ message: 'Paid tiers coming soon!', level: 'info' });
			return; 
		}

		const res = await fetch('/api/queue', { 
			method: 'POST', 
			headers: { 'content-type': 'application/json' }, 
			body: JSON.stringify({ videoId: metadata.videoId, metadata, tier }) 
		});
		
		const data = await res.json();
		if (data.ok) {
			addToast({ message: 'Song added to queue', level: 'success' });
			dispatch('queued');
			close();
		} else {
			error = data.error || 'Failed to add song';
		}
	}
</script>

<!-- FAB -->
<button class="fab" on:click={open} class:hidden={isOpen}>
	<span class="plus">+</span>
</button>

<!-- Modal Overlay -->
{#if isOpen}
	<div class="modal-backdrop" on:click|self={close} transition:fade={{duration: 200}}>
		<div class="modal-window glass-panel" transition:scale={{duration: 250, start: 0.9}}>
			<header>
				<h3>ADD SONG</h3>
				<button class="close-btn" on:click={close}>×</button>
			</header>

			<div class="modal-body">
				<div class="input-group">
					<input 
						type="text" 
						placeholder="Paste YouTube URL..." 
						bind:value={url} 
						on:keydown={(e) => e.key === 'Enter' && validate()}
					/>
					<button class="btn-neon" on:click={validate} disabled={validating || !url}>
						{validating ? 'SCANNING...' : 'SCAN'}
					</button>
				</div>

				{#if error}
					<div class="error-msg">⚠️ {error}</div>
				{/if}

				{#if metadata}
					<div class="preview-card" in:fade>
						<div class="preview-thumb" style="background-image: url({metadata.thumbnail})"></div>
						<div class="preview-info">
							<h4>{metadata.title}</h4>
							<p>{metadata.channelTitle}</p>
						</div>
					</div>

					<div class="tiers-grid">
						<button class="tier-card free" on:click={() => submit('free')}>
							<div class="tier-name">FREE</div>
							<div class="tier-price">$0</div>
						</button>
						<button class="tier-card silver disabled">
							<div class="tier-name">SILVER</div>
							<div class="tier-price">$2</div>
						</button>
						<button class="tier-card gold disabled">
							<div class="tier-name">GOLD</div>
							<div class="tier-price">$5</div>
						</button>
						<button class="tier-card platinum disabled">
							<div class="tier-name">PLATINUM</div>
							<div class="tier-price">$10</div>
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}

<style>
	/* FAB */
	.fab {
		width: 56px;
		height: 56px;
		border-radius: 50%;
		background: var(--neon-cyan);
		border: none;
		box-shadow: 0 0 20px rgba(0, 243, 255, 0.4);
		color: #000;
		font-size: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: transform 0.2s, opacity 0.2s;
		z-index: 1000;
	}
	.fab:hover {
		transform: scale(1.1) rotate(90deg);
		box-shadow: 0 0 30px rgba(0, 243, 255, 0.6);
	}
	.fab.hidden {
		opacity: 0;
		pointer-events: none;
	}
	.plus {
		margin-top: -4px; /* optical adjustment */
	}

	/* Modal */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		background: rgba(0,0,0,0.8);
		backdrop-filter: blur(4px);
		z-index: 2000;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		box-sizing: border-box;
	}

	.modal-window {
		width: 100%;
		max-width: 500px;
		background: #0a0e27;
		border: 1px solid var(--neon-cyan);
		box-shadow: 0 0 40px rgba(0, 243, 255, 0.1);
		display: flex;
		flex-direction: column;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		border-bottom: 1px solid rgba(255,255,255,0.1);
		background: rgba(0,243,255,0.05);
	}
	header h3 {
		color: var(--neon-cyan);
		font-size: 1rem;
	}
	.close-btn {
		background: none;
		border: none;
		color: var(--text-dim);
		font-size: 1.5rem;
		cursor: pointer;
		line-height: 1;
	}
	.close-btn:hover { color: #fff; }

	.modal-body {
		padding: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	/* Inputs */
	.input-group {
		display: flex;
		gap: 0.5rem;
	}
	input {
		flex: 1;
		background: rgba(0,0,0,0.3);
		border: 1px solid rgba(255,255,255,0.2);
		padding: 0.75rem;
		color: #fff;
		font-family: var(--font-mono);
		font-size: 0.8rem;
		border-radius: 4px;
	}
	input:focus {
		outline: none;
		border-color: var(--neon-cyan);
		box-shadow: 0 0 10px rgba(0, 243, 255, 0.2);
	}
	.btn-neon {
		background: rgba(0, 243, 255, 0.1);
		border: 1px solid var(--neon-cyan);
		color: var(--neon-cyan);
		font-family: var(--font-display);
		padding: 0 1rem;
		cursor: pointer;
		border-radius: 4px;
		transition: all 0.2s;
	}
	.btn-neon:hover:not(:disabled) {
		background: var(--neon-cyan);
		color: #000;
		box-shadow: 0 0 15px rgba(0, 243, 255, 0.4);
	}
	.btn-neon:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.error-msg {
		color: #ff4444;
		font-family: var(--font-mono);
		font-size: 0.7rem;
	}

	/* Preview */
	.preview-card {
		display: flex;
		gap: 1rem;
		background: rgba(255,255,255,0.05);
		padding: 0.75rem;
		border-radius: 8px;
	}
	.preview-thumb {
		width: 80px;
		height: 60px;
		background-size: cover;
		background-position: center;
		border-radius: 4px;
		background-color: #000;
	}
	.preview-info {
		flex: 1;
		min-width: 0;
	}
	.preview-info h4 {
		font-size: 0.9rem;
		margin-bottom: 0.25rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.preview-info p {
		font-size: 0.75rem;
		color: var(--text-dim);
		margin: 0;
	}

	/* Tiers */
	.tiers-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
	.tier-card {
		background: rgba(255,255,255,0.03);
		border: 1px solid transparent;
		padding: 1rem;
		border-radius: 8px;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		transition: all 0.2s;
	}
	.tier-card:hover:not(.disabled) {
		transform: translateY(-2px);
	}
	.tier-card.free { border-color: var(--text-dim); }
	.tier-card.free:hover { background: rgba(255,255,255,0.1); }
	
	.tier-card.silver { border-color: var(--tier-silver); }
	.tier-card.gold { border-color: var(--tier-gold); }
	.tier-card.platinum { border-color: var(--tier-platinum); }

	.tier-card.disabled {
		opacity: 0.4;
		cursor: not-allowed;
		filter: grayscale(1);
	}

	.tier-name {
		font-family: var(--font-display);
		font-size: 0.8rem;
		margin-bottom: 0.25rem;
		color: #fff;
	}
	.tier-price {
		font-family: var(--font-mono);
		font-size: 0.9rem;
		color: var(--text-dim);
	}
	
	.dev-actions {
		display: flex;
		justify-content: center;
	}
	.btn-text {
		background: none;
		border: none;
		color: var(--text-dim);
		font-family: var(--font-mono);
		font-size: 0.6rem;
		cursor: pointer;
		opacity: 0.5;
	}
	.btn-text:hover { opacity: 1; }

</style>
