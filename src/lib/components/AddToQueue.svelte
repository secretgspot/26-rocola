<script>
	import { addToast } from '$lib/client/stores.svelte.js';
	import { TIER_CONFIG } from '$lib/config.js';
	import { fade, fly } from 'svelte/transition';

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

<button class="fab" onclick={open} class:hidden={isOpen}>
	<div class="fab-inner">
		<span class="label">[ADD]</span>
		<span class="plus">+</span>
	</div>
</button>

{#if isOpen}
	<div class="modal-backdrop" onclick={(e) => e.target === e.currentTarget && close()} transition:fade={{duration: 100}}>
		<div class="modal-window" transition:fly={{y: 10, duration: 200}}>
			<header>
				<div class="header-main">
					<div class="icon-box">IN</div>
					<h3>INJECT_SEQUENCE</h3>
				</div>
				<button class="close-btn" onclick={close}>[CLOSE]</button>
			</header>

			<div class="modal-body">
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
							<button class="tier-card {t.id}" onclick={() => submit(t.id)}>
								<div class="tier-header">
									<span class="tier-name">[{t.label}]</span>
									<span class="tier-price">${t.price}</span>
								</div>
								<div class="tier-desc">{t.description}</div>
							</button>
						{/each}
					</div>
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
	.fab {
		width: var(--size-9);
		height: var(--size-9);
		background: var(--text-main);
		border: var(--border-size-1) solid var(--bg-dark);
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		z-index: var(--layer-5);
		transition: transform var(--transition-duration-1);
	}
	.fab-inner {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		color: var(--bg-dark);
	}
	.fab .label { font-size: var(--font-size-00); font-weight: var(--font-weight-8); }
	.fab .plus { font-size: var(--font-size-4); font-weight: var(--font-weight-7); line-height: 1; }
	.fab:hover { transform: scale(1.05); }
	.fab.hidden { opacity: 0; pointer-events: none; }

	.modal-backdrop {
		position: fixed;
		top: 0; left: 0; width: 100vw; height: 100vh;
		background: rgba(0, 0, 0, 0.9);
		z-index: var(--layer-important);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: var(--size-3);
	}

	.modal-window {
		width: 100%;
		max-width: 480px;
		background: var(--bg-panel);
		border: var(--border-size-1) solid var(--border-main);
		display: flex;
		flex-direction: column;
	}

	header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--size-3);
		border-bottom: var(--border-size-1) solid var(--border-main);
		background: var(--bg-alt);
	}
	.header-main { display: flex; align-items: center; gap: var(--size-3); }
	.icon-box { background: var(--text-main); color: var(--bg-dark); font-weight: var(--font-weight-8); font-size: var(--font-size-00); padding: 1px var(--size-1); }
	header h3 { font-size: var(--font-size-1); font-weight: var(--font-weight-8); margin: 0; }
	.close-btn { background: none; border: none; color: var(--text-muted); font-size: var(--font-size-0); cursor: pointer; font-weight: var(--font-weight-7); }
	.close-btn:hover { color: var(--text-main); }

	.modal-body { padding: var(--size-4); display: flex; flex-direction: column; gap: var(--size-4); }
	.input-container { display: flex; flex-direction: column; gap: var(--size-1); }
	.input-label { font-size: var(--font-size-00); color: var(--text-muted); font-weight: var(--font-weight-8); }
	.input-group { display: flex; gap: var(--size-2); }
	input { flex: 1; background: var(--bg-dark); border: var(--border-size-1) solid var(--border-main); padding: var(--size-2); color: var(--text-main); font-size: var(--font-size-1); font-family: var(--font-mono); }
	input:focus { outline: none; border-color: var(--text-main); }
	.btn-scan { font-weight: var(--font-weight-8); font-size: var(--font-size-1); padding: 0 var(--size-3); background: var(--bg-dark); border: var(--border-size-1) solid var(--border-main); color: var(--text-main); cursor: pointer; }
	.btn-scan:hover:not(:disabled) { background: var(--text-main); color: var(--bg-dark); }

	.error-msg { background: var(--bg-dark); border: var(--border-size-1) solid #ff4444; padding: var(--size-2); color: #ff4444; font-size: var(--font-size-0); display: flex; align-items: center; gap: var(--size-2); }
	.err-tag { font-weight: var(--font-weight-8); background: #ff4444; color: #fff; padding: 1px 3px; font-size: var(--font-size-00); }

	.preview-card { display: flex; gap: var(--size-3); background: var(--bg-alt); padding: var(--size-2); border: var(--border-size-1) solid var(--border-main); }
	.preview-thumb { width: 80px; height: 55px; border: var(--border-size-1) solid var(--border-dim); }
	.preview-thumb img { width: 100%; height: 100%; object-fit: cover; filter: grayscale(1); }
	.preview-info { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; }
	.preview-info h4 { font-size: var(--font-size-1); margin: 0 0 var(--size-1) 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
	.preview-info p { font-size: var(--font-size-0); color: var(--text-dim); margin: 0; }
	.vid-id { font-size: var(--font-size-00); color: var(--text-muted); }

	.tiers-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--size-2); }
	.tier-card { background: var(--bg-dark); border: var(--border-size-1) solid var(--border-main); padding: var(--size-3); cursor: pointer; text-align: left; transition: all var(--transition-duration-1); display: flex; flex-direction: column; gap: var(--size-1); }
	.tier-card:hover { background: var(--text-main); }
	.tier-card:hover .tier-name, .tier-card:hover .tier-price, .tier-card:hover .tier-desc { color: var(--bg-dark); }
	.tier-header { display: flex; justify-content: space-between; align-items: center; }
	.tier-name { font-size: var(--font-size-00); font-weight: var(--font-weight-8); color: var(--text-dim); }
	.tier-price { font-size: var(--font-size-1); font-weight: var(--font-weight-7); color: var(--text-main); }
	.tier-card.platinum .tier-price { color: var(--tier-platinum); }
	.tier-card.gold .tier-price { color: var(--tier-gold); }
	.tier-card.silver .tier-price { color: var(--tier-silver); }
	.tier-desc { font-size: 0.65rem; color: var(--text-muted); }

	.modal-footer { padding: var(--size-2) var(--size-3); background: var(--bg-dark); border-top: var(--border-size-1) solid var(--border-main); }
	.system-logs { font-size: var(--font-size-00); display: flex; flex-direction: column; gap: 1px; }
	.log-line { color: var(--text-muted); }
	.log-line.highlight { color: var(--text-dim); }
</style>