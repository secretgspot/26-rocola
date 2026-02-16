<script>
	import ProgressBar from '$lib/components/ProgressBar.svelte';

	let {
		song = null,
		bitrate = 0,
		buffer = 0,
		progress = 0
	} = $props();
</script>

{#if song}
	<footer class="metadata-tray">
		<div class="meta-main min-w-0">
			<span class="label text-muted">// NOW_PLAYING</span>
			<h2 class="title">{song.title}</h2>
			<div class="meta-footer text-dim">
				<span class="channel">{song.channelTitle}</span>
				<span class="divider">|</span>
				<span class="vid-id">{song.videoId}</span>
			</div>
		</div>
		<div class="meta-stats">
			{#if song.tier && song.tier !== 'free'}
				<div class="stat">
					<span class="s-label">REM</span>
					<span class="s-val">{song.playsRemainingToday}</span>
				</div>
			{/if}
			<div class="stat">
				<span class="s-label">BTR</span>
				<span class="s-val">{bitrate}</span>
			</div>
			<div class="stat">
				<span class="s-label">BUF</span>
				<span class="s-val">{buffer}%</span>
			</div>
		</div>
		<div class="progress-slot">
			<ProgressBar {progress} />
		</div>
	</footer>
{/if}

<style>
	@layer components {
		.metadata-tray {
			padding: var(--size-3) var(--size-4);
			position: absolute;
			left: 0;
			right: 0;
			bottom: 0;
			display: flex;
			justify-content: space-between;
			align-items: flex-end;
			gap: var(--size-5);
			pointer-events: none;
			container-type: inline-size;
			container-name: overlay;
			z-index: 10;
			background: linear-gradient(
				0deg,
				color-mix(in srgb, var(--queue-fade-void) 96%, transparent) 0%,
				color-mix(in srgb, var(--queue-fade-void) 70%, transparent) 40%,
				transparent 100%
			);
		}

		.meta-main {
			flex: 1;
			min-width: 0;
		}
		.meta-main .label {
			font-size: var(--font-size-00);
			font-weight: var(--font-weight-8);
			display: block;
			margin-bottom: var(--size-1);
			letter-spacing: 0.1em;
			text-transform: uppercase;
		}
		.meta-main .title {
			font-size: var(--font-size-fluid-2);
			font-weight: var(--font-weight-9);
			line-height: var(--font-lineheight-1);
			margin-bottom: var(--size-2);
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.meta-footer {
			font-size: var(--font-size-0);
			font-weight: var(--font-weight-7);
			display: flex;
			gap: var(--size-3);
			overflow: hidden;
		}
		.meta-footer span {
			white-space: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;
		}
		.meta-stats {
			display: flex;
			gap: var(--size-3);
			flex-shrink: 0;
		}
		.stat {
			display: flex;
			flex-direction: column;
			align-items: flex-end;
		}
		.s-label {
			font-size: var(--font-size-00);
			color: var(--text-muted);
			font-weight: var(--font-weight-9);
		}
		.s-val {
			font-size: var(--font-size-0);
			font-weight: var(--font-weight-8);
		}

		.progress-slot {
			width: 100%;
			position: absolute;
			left: 0;
			right: 0;
			bottom: 0;
		}
	}

	@layer responsive {
		@container overlay (max-width: 1023px) {
			.meta-main .title {
				font-size: var(--font-size-fluid-1);
			}
			.meta-main .label,
			.meta-footer {
				font-size: var(--font-size-fluid-0);
			}
		}

		@container overlay (max-width: 480px) {
			.metadata-tray {
				padding: var(--size-2) var(--size-2);
				display: grid;
				grid-template-columns: minmax(0, 1fr) auto;
				grid-template-rows: auto auto;
				align-items: end;
				column-gap: var(--size-2);
				row-gap: 2px;
				min-height: var(--mobile-footer-h, 124px);
				bottom: env(safe-area-inset-bottom, 0px);
				padding-bottom: calc(var(--size-2) + env(safe-area-inset-bottom, 0px));
			}
			.meta-main {
				width: 100%;
				grid-column: 1;
				grid-row: 1 / span 2;
				align-self: center;
			}
			.meta-stats {
				width: auto;
				grid-column: 2;
				grid-row: 1 / span 2;
				justify-content: flex-end;
				gap: var(--size-1);
				margin-top: 0;
			}
			.meta-main .label {
				font-size: clamp(0.56rem, 2vw, 0.68rem);
				margin-bottom: 1px;
			}
			.meta-main .title {
				font-size: clamp(0.82rem, 3.4vw, 1rem);
				line-height: 1.12;
				color: var(--text-main);
				white-space: nowrap;
				display: block;
				overflow: hidden;
				text-overflow: ellipsis;
				margin-bottom: 2px;
			}
			.meta-footer {
				font-size: clamp(0.62rem, 2.6vw, 0.76rem);
				gap: var(--size-1);
			}
			.s-label,
			.s-val { font-size: clamp(0.62rem, 2.6vw, 0.76rem); }
		}

		@container overlay (max-width: 390px) {
			.vid-id,
			.divider {
				display: none;
			}
		}
	}
</style>
