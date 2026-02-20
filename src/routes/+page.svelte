<script>
	import {
		playerState,
		initRealtime,
		addToast,
		refreshQueue
	} from '$lib/client/stores.svelte.js';
	import { createStationPageState } from '$lib/client/station-page-state.svelte.js';
	import Toast from '$lib/components/Toast.svelte';
	import QueuePanel from '$lib/components/QueuePanel.svelte';
	import AddToQueue from '$lib/components/AddToQueue.svelte';
	import VideoPlayer from '$lib/components/VideoPlayer.svelte';
	import NowPlayingOverlay from '$lib/components/NowPlayingOverlay.svelte';
	import StationHeader from '$lib/components/StationHeader.svelte';
	import HelpOverlay from '$lib/components/HelpOverlay.svelte';
	import StarBurstOverlay from '$lib/components/StarBurstOverlay.svelte';

	let { data } = $props();
	const page = createStationPageState({ getData: () => data, playerState, addToast, refreshQueue });

	$effect(() => {
		initRealtime();
	});

	$effect(() => {
		page.initTheme();
	});

	$effect(() => page.startViewportSync());
	$effect(() => page.startControllerSync());
	$effect(() => page.startAdminHealthSync());
	$effect(() => page.startShortcuts());
	$effect(() => page.syncHelpQueueVisibility());
	$effect(() => page.syncQueueLengthVisibility());
	$effect(() => page.disposeQueueReveal);
	$effect(() => page.startTickLoop());
</script>

<div
	class="app-container"
	role="presentation"
	onpointerenter={page.handleQueuePointerEnter}
	onpointermove={page.handleQueuePointerMove}
	onpointerleave={page.handleQueuePointerLeave}
	ontouchstart={page.handleQueueTouchReveal}
>
	<div class="toasts-layer">
		{#each playerState.toasts as t (t.id)}
			<Toast message={t.message} level={t.level} />
		{/each}
	</div>

	<StationHeader
		canControl={page.canControl}
		hasActiveQueuePlayback={page.hasActiveQueuePlayback}
		theme={page.theme}
		helpOpen={page.helpOpen}
		connectionState={page.connectionState}
		connectionTooltip={page.connectionTooltip}
		clientCount={playerState.clientCount}
		queueCount={playerState.queue.length}
		seedPending={page.seedPending}
		nextPending={page.nextPending}
		clearPending={page.clearPending}
		onAdvance={page.advance}
		onSeed={page.seedQueue}
		onClear={page.clearQueue}
		onToggleTheme={page.toggleTheme}
		onToggleHelp={page.toggleHelp}
		showCtrlBadge={page.canControl}
	/>

	<main class="video-layer min-w-0">
		{#if page.isInitializing}
			<div class="empty-state"></div>
		{:else if playerState.currentSong}
			<svelte:boundary onerror={(e) => console.error('Playback Error:', e)}>
				{#snippet failed(error, reset)}
					<div class="empty-state">
						<p class="text-muted">// ERROR: PLAYER_CRASHED</p>
						<button onclick={reset}>[REBOOT_PLAYER]</button>
						<button onclick={page.advance}>[FORCE_SKIP]</button>
					</div>
				{/snippet}
				<VideoPlayer
					currentSong={playerState.currentSong}
					clockOffsetSec={playerState.clockOffsetSec}
					onnext={page.advance}
					onendedsignal={page.endedPlayback}
					ontimeupdate={page.handleTimeUpdate}
					onstatsupdate={page.handleStatsUpdate}
					onplaystate={page.handlePlayState}
					ondebug={page.writePlaybackDebug}
					onlocalblockstate={page.handleLocalBlockState}
					onrefreshqueue={refreshQueue}
					ontoast={(toast) => addToast(toast)}
					canControl={page.canDrivePlayback}
					onsynctelemetry={page.handleSyncTelemetry} />
			</svelte:boundary>
		{:else}
			<div class="empty-state">
			</div>
		{/if}
	</main>

	<QueuePanel
		visible={page.queueVisible}
		isMobileViewport={page.isMobileViewport}
		items={playerState.queue}
		currentTurn={playerState.currentTurn}
	/>

	<NowPlayingOverlay
		song={playerState.currentSong}
		bitrate={page.bitrate}
		buffer={page.buffer}
		progress={page.playbackProgress}
		localBlocked={page.localPlaybackBlocked}
	/>

	{#if !page.isInitializing}
		<AddToQueue
			onqueued={refreshQueue}
			onstar={page.star}
			hideTrigger={page.isVideoPaused}
			hideStar={page.hideStarButton}
			pulse={page.isIdleState}
			mode={page.isIdleState ? 'center' : 'nearQueue'}
		/>
	{/if}
	<StarBurstOverlay bursts={playerState.starBursts} />

	<HelpOverlay
		open={page.helpOpen}
		onClose={page.closeHelp}
		metrics={page.landingMetrics}
		showAdminHealth={page.showAdminHealth}
		adminHealthState={page.adminHealthState}
		adminHealthError={page.adminHealthError}
		adminHealthCtrl={page.adminHealthCtrl}
		adminHealthLeaseSec={page.adminHealthLeaseSec}
		adminHealthTurn={page.adminHealthTurn}
		adminHealthSeq={page.adminHealthSeq}
	/>
	</div>

<style>
	@layer page-layout, page-motion, page-responsive;

	@layer page-layout {
		.app-container {
			display: flex;
			flex-direction: column;
			height: 100vh;
			height: 100dvh;
			width: 100vw;
			background: transparent;
			overflow: hidden;
			position: relative;
			container-type: inline-size;
			container-name: viewport;
			--mobile-footer-h: 124px;
		}

		.video-layer {
			position: fixed;
			inset: 0;
			z-index: 1;
			width: 100dvw;
			height: 100dvh;
			background: transparent;
			display: block;
		}

		.empty-state {
			position: absolute;
			inset: 0;
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: var(--size-3);
			z-index: var(--layer-2);
		}

		.toasts-layer {
			position: fixed;
			top: calc(56px + var(--size-2));
			left: var(--size-4);
			transform: none;
			z-index: 2;
			padding: 0;
			display: flex;
			flex-direction: column;
			gap: 2px;
			pointer-events: none;
			align-items: flex-start;
		}
	}

	@layer page-motion {
	}

	@layer page-responsive {
		@media (max-width: 1023px) and (orientation: portrait) {
			.video-layer {
				top: 0;
				left: 0;
				right: 0;
				bottom: auto;
				height: 50dvh;
			}
			.toasts-layer {
				top: calc(56px + var(--size-1));
				left: var(--size-3);
				transform: none;
				padding: 0;
			}
		}
	}
</style>




