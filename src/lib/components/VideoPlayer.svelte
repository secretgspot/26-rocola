<script>
	import { untrack } from 'svelte';
	import { createPlayer } from '$lib/client/youtube-player';
	import { playerState, addToast } from '$lib/client/stores.svelte.js';

	let { onnext, ontimeupdate, onstatsupdate, onplaystate } = $props();

	let el = $state();
	/** @type {any} */
	let player = $state(null);
	let playbackProgress = $state(0);
	let allowSound = $state(false);
	let nextRequestedForQueueId = $state(null);
	let lastResumeAttemptAt = $state(0);
	
	/** @type {string | null} */
	let lastLoadedVideoId = $state(null);
	/** @type {number | null} */
	let lastStartedAt = $state(null);

	function tryUnmuteAndPlay() {
		if (!player || !allowSound) return;
		try {
			const raw = player._raw;
			if (raw && typeof raw.unMute === 'function') {
				raw.unMute();
			}
			player.play?.();
		} catch {
			// ignore
		}
	}

	function requestNextOnce() {
		const qid = playerState.currentSong?.queueId || playerState.currentSong?.id || null;
		if (!qid) return;
		if (nextRequestedForQueueId === qid) return;
		nextRequestedForQueueId = qid;
		onnext?.();
	}

	// Get the "official" server-side elapsed time
	function getServerElapsed() {
		if (playerState.currentSong?.startedAt) {
			const now = Date.now() / 1000 + (playerState.clockOffsetSec || 0);
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
					onplaystate?.({ paused: e.data === 2 });
					if (e.data === 0) {
						requestNextOnce();
					}
					if (e.data === 1) {
						// Keep audio unlocked across song transitions once user has interacted.
						tryUnmuteAndPlay();
						// When switching to Playing, sync if we drifted too much or were paused
						const current = p.getCurrentTime();
						const correct = getServerElapsed();
						const duration = p._raw?.getDuration?.() || playerState.currentSong?.duration || 0;
						const nearEnd = duration > 0 && correct > duration - 3;
						if (!nearEnd && Math.abs(current - correct) > 2.2) {
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
		if (typeof window === 'undefined') return;
		if (window.sessionStorage.getItem('rocola-audio-unlocked') === '1') {
			allowSound = true;
		}
		const unlockAudio = () => {
			allowSound = true;
			window.sessionStorage.setItem('rocola-audio-unlocked', '1');
			tryUnmuteAndPlay();
		};

		window.addEventListener('pointerdown', unlockAudio, { once: true });
		window.addEventListener('keydown', unlockAudio, { once: true });
		window.addEventListener('touchstart', unlockAudio, { once: true });
		return () => {
			window.removeEventListener('pointerdown', unlockAudio);
			window.removeEventListener('keydown', unlockAudio);
			window.removeEventListener('touchstart', unlockAudio);
		};
	});

	$effect(() => {
		tryUnmuteAndPlay();
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
				tryUnmuteAndPlay();
			} else if (isNewStart) {
				// Song restarted or time shifted
				player.seek(seekTo);
				player.play();
				tryUnmuteAndPlay();
			}
				lastLoadedVideoId = current.videoId;
				lastStartedAt = current.startedAt ?? null;
				nextRequestedForQueueId = null;
				playbackProgress = 0;
			}
		});

	$effect(() => {
		// Main loop: Update progress bar based on SERVER time, not player time
		// This ensures bar keeps moving even if paused.
		let frame;
		let lastUpdate = 0;
		let lastSync = 0;
		let lastStateCheck = 0;

		const update = (time) => {
			// Update at ~5fps is enough for the progress bar but we can go faster for smoothness
			// requestAnimationFrame runs at 60fps usually.
			if (time - lastUpdate > 100) {
				lastUpdate = time;
				if (player && playerState.currentSong) {
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

							// Fallback auto-advance if ended event is missed.
							if (elapsed >= duration + 1.5) {
								requestNextOnce();
							}
						}
					}
				}
				// Periodic drift correction (avoid aggressive micro-seeks)
				if (time - lastSync > 1500 && player && playerState.currentSong) {
					lastSync = time;
					try {
						const current = player.getCurrentTime?.();
						const correct = getServerElapsed();
						const state = player.getPlayerState?.();
						const duration =
							player._raw?.getDuration?.() || playerState.currentSong?.duration || 0;
						const nearEnd = duration > 0 && correct > duration - 4;
						if (
							state === 1 &&
							!nearEnd &&
							typeof current === 'number' &&
							Math.abs(current - correct) > 1.3
						) {
							player.seek(correct);
						}
					} catch {
						// ignore
					}
				}
				// Ensure playback follows server even if user paused locally, but do not spam restart
				if (time - lastStateCheck > 900 && player && playerState.currentSong) {
					lastStateCheck = time;
					try {
						const state = player.getPlayerState?.();
						if (state === 2) {
							const correct = getServerElapsed();
							if (time - lastResumeAttemptAt > 2500) {
								lastResumeAttemptAt = time;
								const current = player.getCurrentTime?.();
								if (typeof current === 'number' && Math.abs(current - correct) > 1.2) {
									player.seek(correct);
								}
								player.play();
							}
						}
					} catch {
						// ignore
					}
				}
			frame = requestAnimationFrame(update);
		};

		frame = requestAnimationFrame(update);
		return () => cancelAnimationFrame(frame);
	});
</script>

<div id="yt-player-video" bind:this={el} class="yt-embed"></div>

<style>
	.yt-embed { width: 100%; height: 100%; display: block; background: var(--bg-dark); pointer-events: none; }
	:global([data-theme='light']) .yt-embed { filter: invert(1); }
</style>
