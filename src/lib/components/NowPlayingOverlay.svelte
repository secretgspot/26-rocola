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
			z-index: 3;
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
				padding: var(--size-3);
				flex-direction: column;
				align-items: flex-start;
				gap: var(--size-2);
				bottom: env(safe-area-inset-bottom, 0px);
				padding-bottom: calc(var(--size-3) + env(safe-area-inset-bottom, 0px));
			}
			.meta-stats {
				width: 100%;
				justify-content: space-between;
			}
			.meta-main .label {
				font-size: var(--font-size-00);
			}
			.meta-main .title {
				font-size: var(--font-size-fluid-1);
				line-height: 1.15;
				white-space: normal;
				display: -webkit-box;
				line-clamp: 2;
				-webkit-line-clamp: 2;
				-webkit-box-orient: vertical;
				overflow: hidden;
				text-overflow: unset;
				margin-bottom: var(--size-1);
			}
			.meta-footer {
				font-size: var(--font-size-00);
			}
		}
	}
</style>
