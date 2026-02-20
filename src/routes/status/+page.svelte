<script>
	let { data } = $props();

	let status = $state(null);
	let error = $state('');
	let loading = $state(false);

	$effect(() => {
		if (!status && data?.initial) {
			status = data.initial;
		}
	});

	async function refreshStatus() {
		loading = true;
		try {
			const res = await fetch('/api/status');
			const json = await res.json().catch(() => ({}));
			if (res.ok && json?.ok) {
				status = json;
				error = '';
			} else {
				error = json?.error || `HTTP_${res.status}`;
			}
		} catch (e) {
			error = e?.message || 'network_error';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		if (typeof window === 'undefined') return;
		const timer = setInterval(refreshStatus, 3000);
		return () => clearInterval(timer);
	});
</script>

<main class="status-page">
	<header class="status-head">
		<h1>ROCOLA STATUS</h1>
		<button onclick={refreshStatus} disabled={loading}>
			{loading ? 'REFRESHING...' : 'REFRESH'}
		</button>
	</header>

	{#if error}
		<p class="error">ERROR: {error}</p>
	{/if}

	{#if status}
		<section class="grid">
			<article>
				<h2>Mode</h2>
				<p>{status.mode}</p>
			</article>
			<article>
				<h2>Queue</h2>
				<p>{status.queueLength}</p>
			</article>
			<article>
				<h2>Turn</h2>
				<p>{status.turn}</p>
			</article>
			<article>
				<h2>Station Lag</h2>
				<p>{status.station?.lagMs ?? '-'} ms</p>
			</article>
			<article>
				<h2>Controller</h2>
				<p>{status.controller?.active ? 'active' : 'inactive'}</p>
			</article>
			<article>
				<h2>Health</h2>
				<p>
					{status.health?.stalePlayback ? 'STALE_PLAYBACK' : 'playback_ok'}
					{status.health?.stationDelayed ? ' | station_delayed' : ''}
				</p>
			</article>
		</section>

		<section class="current">
			<h2>Current</h2>
			{#if status.current}
				<p>{status.current.title}</p>
				<p>ID: {status.current.videoId}</p>
				<p>elapsed/duration: {status.current.elapsedSec ?? '-'} / {status.current.durationSec ?? '-'}</p>
			{:else}
				<p>No active track</p>
			{/if}
		</section>
	{/if}
</main>

<style>
	.status-page {
		min-height: 100dvh;
		padding: var(--size-5);
		background: var(--bg-dark);
		color: var(--text-main);
		font-family: var(--font-mono);
	}
	.status-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--size-3);
	}
	.grid {
		margin-top: var(--size-4);
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
		gap: var(--size-3);
	}
	article,
	.current {
		border: 1px solid var(--border-main);
		padding: var(--size-3);
	}
	.error {
		color: var(--status-bad);
	}
</style>
