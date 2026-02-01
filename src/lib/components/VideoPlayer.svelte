<script>
	import { untrack } from 'svelte';
	import { createPlayer } from '$lib/client/youtube-player';
	import { playerState, addToast } from '$lib/client/stores.svelte.js';

	let { onnext, ontimeupdate, onstatsupdate } = $props();

	let el = $state();
	/** @type {any} */
	let player = $state(null);
	let playbackProgress = $state(0);
	
	/** @type {string | null} */
	let lastLoadedVideoId = $state(null);
	/** @type {number | null} */
	let lastStartedAt = $state(null);

	// Get the "official" server-side elapsed time
	function getServerElapsed() {
		if (playerState.currentSong?.startedAt) {
			const now = Date.now() / 1000;
			const elapsed = now - playerState.currentSong.startedAt;
			return elapsed > 0 ? elapsed : 0;
		}
		return 0;
	}

	$effect(() => {
		if (!el) return;
		
		/** @type {any} */
		let p;
		const initialVideoId = untrack(() => playerState.currentSong?.videoId);
		const seekTo = untrack(() => getServerElapsed());
		
		createPlayer(el.id, { 
			videoId: initialVideoId,
			onStateChange: (e) => {
				// 0 = Ended, 1 = Playing, 2 = Paused, 3 = Buffering, 5 = Cued
				if (e.data === 0) {
					// Native player end - strictly fallback, we rely on server time mostly
					onnext?.();
				}
				if (e.data === 1) {
					// When switching to Playing, sync if we drifted too much or were paused
					const current = p.getCurrentTime();
					const correct = getServerElapsed();
					if (Math.abs(current - correct) > 2) {
						console.log('[VideoPlayer] Syncing playback to server time', { current, correct });
						p.seek(correct);
					}
				}
			},
			onError: (e) => {
				addToast({ message: `ERROR: PLAYBACK_FAILED`, level: 'error' });
				onnext?.();
			}
		}).then(res => {
			p = res;
			player = res;
			if (initialVideoId) {
				lastLoadedVideoId = initialVideoId;
				lastStartedAt = untrack(() => playerState.currentSong?.startedAt ?? null);
				if (seekTo > 0) p.seek(seekTo);
				p.play();
			}
		});

		return () => { p?.destroy(); };
	});

	$effect(() => {
		const current = playerState.currentSong;
		if (!player || !current?.videoId) return;

		const isNewVideo = current.videoId !== lastLoadedVideoId;
		const isNewStart = current.startedAt && current.startedAt !== lastStartedAt;

		if (isNewVideo || isNewStart) {
			const seekTo = getServerElapsed();
			if (isNewVideo) {
				player.load(current.videoId, true);
				if (seekTo > 2) player.seek(seekTo);
			} else if (isNewStart) {
				// Song restarted or time shifted
				player.seek(seekTo);
				player.play();
			}
			lastLoadedVideoId = current.videoId;
			lastStartedAt = current.startedAt ?? null;
			playbackProgress = 0;
		}
	});

	$effect(() => {
		// Main loop: Update progress bar based on SERVER time, not player time
		// This ensures bar keeps moving even if paused.
		const interval = setInterval(() => {
			if (!player || !playerState.currentSong) return;

			// Determine duration: Player is most accurate, fallback to metadata
			let duration = 0;
			const raw = player._raw;
			if (raw && typeof raw.getDuration === 'function') {
				duration = raw.getDuration();
			}
			if ((!duration || duration === 0) && playerState.currentSong.duration) {
				duration = playerState.currentSong.duration;
			}

			if (duration > 0) {
				const elapsed = getServerElapsed();
				playbackProgress = (elapsed / duration) * 100;
				
				// Clamp to 100%
				if (playbackProgress > 100) playbackProgress = 100;
				
				ontimeupdate?.({ progress: playbackProgress });

				// Emit real stats
				if (typeof player.getLoadedFraction === 'function') {
					const loaded = Math.round(player.getLoadedFraction() * 100);
					const quality = player.getPlaybackQuality();
					
					// Map quality to approximate bitrate (kbps)
					const qualityMap = {
						'highres': 35000,
						'hd2160': 25000,
						'hd1440': 12000,
						'hd1080': 5000,
						'hd720': 2500,
						'large': 1500,
						'medium': 800,
						'small': 400,
						'tiny': 200,
						'default': 1500
					};
					const baseBtr = qualityMap[quality] || 1500;
					// Add a little jitter for realism
					const btr = baseBtr + Math.floor(Math.random() * (baseBtr * 0.1));
					
					onstatsupdate?.({
						buffer: loaded,
						bitrate: btr
					});
				}

				// Auto-advance if we've exceeded duration (Server-side logic simulation)
				if (elapsed >= duration) {
					console.log('[VideoPlayer] Song duration exceeded (server time), requesting next...');
					// Avoid spamming next if already ending?
					// The parent handles caching/dedup via onnext if needed, or we just call it.
					onnext?.();
				}
			}
		}, 200); // Faster update for smoother UI
		return () => clearInterval(interval);
	});
</script>

<div class="video-container">
	<div id="yt-player-video" bind:this={el} class="yt-embed"></div>
	
	{#if player && playerState.currentSong && lastLoadedVideoId === null}
		<div class="autoplay-overlay">
			<div class="overlay-content">
				<p>SYSTEM_READY</p>
				<button onclick={() => { 
					if (!player || !playerState.currentSong) return;
					player.play(); 
					const seekTo = getServerElapsed();
					if (seekTo > 0) player.seek(seekTo);
					lastLoadedVideoId = playerState.currentSong.videoId; 
					lastStartedAt = playerState.currentSong.startedAt ?? null;
				}}>
					[INITIALIZE]
				</button>
			</div>
		</div>
	{/if}

	<div class="frame-accents">
		<div class="accent tl"></div>
		<div class="accent tr"></div>
		<div class="accent bl"></div>
		<div class="accent br"></div>
	</div>
</div>

<style>
	.video-container { width: 100%; height: 100%; position: relative; background: #000; overflow: hidden; }
	.yt-embed { width: 100%; height: 100%; transform: scale(1.02); filter: grayscale(1) contrast(1.1); }
	.video-container:hover .yt-embed { filter: none; }

	.autoplay-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: var(--bg-dark); display: flex; align-items: center; justify-content: center; z-index: var(--layer-important); }
	.overlay-content { display: flex; flex-direction: column; align-items: center; gap: var(--size-3); }
	.overlay-content p { color: var(--text-muted); font-size: var(--font-size-1); font-weight: var(--font-weight-8); }
	
	.autoplay-overlay button { 
		background: var(--text-main); 
		color: var(--bg-dark); 
		padding: var(--size-3) var(--size-5); 
		font-weight: var(--font-weight-8); 
		font-size: var(--font-size-2); 
		cursor: pointer; 
		border: var(--border-size-1) solid var(--bg-dark);
		font-family: var(--font-mono);
	}
	.autoplay-overlay button:hover { 
		background: var(--bg-dark); 
		color: var(--text-main); 
		border-color: var(--text-main);
	}

	.frame-accents { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: var(--layer-1); }
	.frame-accents .accent { position: absolute; width: var(--size-3); height: var(--size-3); border: var(--border-size-1) solid var(--text-muted); opacity: 0.5; }
	.tl { top: var(--size-3); left: var(--size-3); border-right: 0; border-bottom: 0; }
	.tr { top: var(--size-3); right: var(--size-3); border-left: 0; border-bottom: 0; }
	.bl { bottom: var(--size-3); left: var(--size-3); border-right: 0; border-top: 0; }
	.br { bottom: var(--size-3); right: var(--size-3); border-left: 0; border-top: 0; }
</style>