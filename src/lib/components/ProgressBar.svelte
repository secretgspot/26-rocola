<script>
	let { progress = 0 } = $props();
</script>

<div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.round(progress)}>
	<div class="fill" style="width: {progress}%"></div>
</div>

<style>
	.progress-bar {
		height: var(--size-2);
		width: 100%;
		overflow: hidden;
	}
	.progress-bar .fill {
		height: 100%;
		background: var(--text-main);
	}
</style>

