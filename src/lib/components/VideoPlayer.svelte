<script>
	import { untrack } from 'svelte';
	import { createPlayer } from '$lib/client/youtube-player';
	import { playerState, addToast } from '$lib/client/stores.svelte.js';

	let { onnext, ontimeupdate, onstatsupdate, onplaystate, onsynctelemetry, onendedsignal, canControl = false } = $props();

	let el = $state();
	/** @type {any} */
	let player = $state(null);
	let playbackProgress = $state(0);
	let allowSound = $state(false);
	let nextRequestedForQueueId = $state(null);
	let lastResumeAttemptAt = $state(0);
	let lastTransitionKey = $state(null);
	let transitionAtMs = $state(0);
	let pendingJoinSeekTo = $state(null);
	let transitionPlaybackReportedForKey = $state(null);
	let telemetryLastEmitAtMs = $state(0);
	let driftSamples = $state([]);
	let microSyncCount = $state(0);
	let hardSyncCount = $state(0);
	let transitionCount = $state(0);
	let lastTransitionLatencyMs = $state(0);
	let lastSeekAtMs = $state(0);
	let lastErrorQueueId = $state(null);
	
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

	function clamp(value, min, max) {
		return Math.max(min, Math.min(max, value));
	}

	function nowMs() {
		if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
			return performance.now();
		}
		return Date.now();
	}

	function percentile(values, p) {
		if (!values.length) return 0;
		const sorted = [...values].sort((a, b) => a - b);
		const idx = Math.max(0, Math.min(sorted.length - 1, Math.round((sorted.length - 1) * p)));
		return sorted[idx];
	}

	function pushDriftSample(absDriftSec) {
		const ms = Math.max(0, Math.round(absDriftSec * 1000));
		driftSamples = [...driftSamples.slice(-119), ms];
	}

	function emitSyncTelemetry(force = false) {
		const now = nowMs();
		if (!force && now - telemetryLastEmitAtMs < 900) return;
		telemetryLastEmitAtMs = now;
		onsynctelemetry?.({
			driftP50Ms: percentile(driftSamples, 0.5),
			driftP95Ms: percentile(driftSamples, 0.95),
			sampleCount: driftSamples.length,
			microSyncCount,
			hardSyncCount,
			transitionCount,
			lastTransitionLatencyMs
		});
	}

	function requestNextOnce() {
		if (!canControl) return;
		const qid = playerState.currentSong?.queueId || playerState.currentSong?.id || null;
		if (!qid) return;
		if (nextRequestedForQueueId === qid) return;
		nextRequestedForQueueId = qid;
		onnext?.();
	}

	async function reportUnavailableFromPlaybackError(errorPayload) {
		const current = playerState.currentSong;
		if (!current?.queueId && !current?.songId) return;
		const queueId = current.queueId || current.id || null;
		if (queueId && lastErrorQueueId === queueId) return;
		lastErrorQueueId = queueId;
		const errorCode = typeof errorPayload?.data === 'number' ? errorPayload.data : null;
		try {
			const res = await fetch('/api/queue/unavailable', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					queueId,
					songId: current.songId || null,
					videoId: current.videoId || null,
					reason: 'youtube_playback_error',
					errorCode,
					details: errorPayload || null
				})
			});
			const data = await res.json().catch(() => ({}));
			return data?.action || null;
		} catch {
			return null;
		}
	}

	// Get the "official" server-side elapsed time
	function getServerElapsed() {
		const startedAtMs =
			playerState.currentSong?.startedAtMs ??
			(typeof playerState.currentSong?.startedAt === 'number'
				? playerState.currentSong.startedAt * 1000
				: null);
		if (startedAtMs) {
			const nowMs = Date.now() + (playerState.clockOffsetSec || 0) * 1000;
			const elapsed = (nowMs - startedAtMs) / 1000;
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
						onendedsignal?.();
					}
					if (e.data === 1) {
						const activeTransitionKey = `${playerState.currentSong?.queueId || playerState.currentSong?.id || playerState.currentSong?.videoId || 'unknown'}:${playerState.currentSong?.startedAtMs || playerState.currentSong?.startedAt || 0}`;
						if (transitionPlaybackReportedForKey !== activeTransitionKey) {
							transitionPlaybackReportedForKey = activeTransitionKey;
							if (transitionAtMs > 0) {
								lastTransitionLatencyMs = Math.max(0, Math.round(nowMs() - transitionAtMs));
								transitionCount += 1;
								emitSyncTelemetry(true);
							}
						}

						// Keep audio unlocked across song transitions once user has interacted.
						tryUnmuteAndPlay();

						// Apply pending join seek once (late-join correction) after player is ready.
						if (typeof pendingJoinSeekTo === 'number' && pendingJoinSeekTo > 0.6) {
							p.seek(pendingJoinSeekTo);
							pendingJoinSeekTo = null;
							return;
						}

						// When switching to Playing, do a tight correction.
						const current = p.getCurrentTime();
						const correct = getServerElapsed();
						const duration = p._raw?.getDuration?.() || playerState.currentSong?.duration || 0;
						const nearEnd = duration > 0 && correct > duration - 3;
						const drift = correct - current;
						const inWarmup = nowMs() - transitionAtMs < 1800;
						if (Number.isFinite(drift)) pushDriftSample(Math.abs(drift));
						if (!nearEnd && Number.isFinite(drift)) {
							const now = nowMs();
							const canSeek = now - lastSeekAtMs > 320;
							if (inWarmup && Math.abs(drift) > 0.45 && canSeek) {
								p.seek(correct);
								lastSeekAtMs = now;
								hardSyncCount += 1;
							} else if (!inWarmup && Math.abs(drift) > 0.22 && canSeek) {
								if (Math.abs(drift) > 2.5) {
									p.seek(correct);
									hardSyncCount += 1;
								} else {
									p.seek(current + clamp(drift, -0.45, 0.45));
									microSyncCount += 1;
								}
								lastSeekAtMs = now;
							}
							emitSyncTelemetry();
						}
					}
			},
				onError: async (e) => {
					const errorVideoId = e?.target?.getVideoData?.()?.video_id || null;
					const currentVideoId = playerState.currentSong?.videoId || null;
					// Ignore stale player errors from a previously loaded video.
					if (errorVideoId && currentVideoId && errorVideoId !== currentVideoId) {
						return;
					}
					const action = await reportUnavailableFromPlaybackError(e);
					if (action === 'retry') {
						addToast({ message: `PLAYBACK RETRY`, level: 'info' });
						setTimeout(() => {
							try {
								player?.play?.();
							} catch {
								// ignore
							}
						}, 600);
						return;
					}
					addToast({ message: `PLAYBACK BLOCKED -> SKIP`, level: 'error' });
					requestNextOnce();
				}
			}).then(res => {
			p = res;
			player = res;
			if (initialVideoId) {
				lastLoadedVideoId = initialVideoId;
				lastStartedAt =
					untrack(() => playerState.currentSong?.startedAtMs ?? playerState.currentSong?.startedAt ?? null);
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
		const currentStartedAt =
			current.startedAtMs ??
			(typeof current.startedAt === 'number' ? current.startedAt * 1000 : current.startedAt);
		const isNewStart = currentStartedAt && currentStartedAt !== lastStartedAt;
		const transitionKey = `${current.queueId || current.id || current.videoId}:${currentStartedAt || 0}`;
		const isNewTransition = transitionKey !== lastTransitionKey;

			if (isNewVideo || isNewStart || isNewTransition) {
				const seekTo = getServerElapsed();
				if (isNewVideo) {
					player.load(current.videoId, true);
					// Keep initial playback smooth: defer non-trivial seek until first "playing" state.
					pendingJoinSeekTo = seekTo > 1.2 ? seekTo : null;
					tryUnmuteAndPlay();
				} else if (isNewStart || isNewTransition) {
					// Transition lock: align exactly once per (queueId, startedAt).
					player.seek(seekTo);
					player.play();
					tryUnmuteAndPlay();
				}
				lastLoadedVideoId = current.videoId;
				lastStartedAt = currentStartedAt ?? null;
				lastTransitionKey = transitionKey;
				transitionAtMs = nowMs();
				transitionPlaybackReportedForKey = null;
				lastErrorQueueId = null;
				nextRequestedForQueueId = null;
				playbackProgress = 0;
				emitSyncTelemetry(true);
			}
		});

	$effect(() => {
		// Main loop: Update progress bar based on SERVER time, not player time
		// This ensures bar keeps moving even if paused.
		let frame;
		let lastUpdate = 0;
		let lastSync = 0;
		let lastHardSync = 0;
		let lastStateCheck = 0;

		const update = (time) => {
			// Update at ~5fps is enough for the progress bar but we can go faster for smoothness
			// requestAnimationFrame runs at 60fps usually.
			if (time - lastUpdate > 100) {
				lastUpdate = time;
				if (player && playerState.currentSong) {
					// Determine duration: Player is most accurate, fallback to metadata
					let duration = 0;
					let hasNativeDuration = false;
					const raw = player._raw;
					if (raw && typeof raw.getDuration === 'function') {
						duration = raw.getDuration();
						hasNativeDuration = duration > 0;
					}
					if ((!duration || duration === 0) && playerState.currentSong.duration) {
						duration = playerState.currentSong.duration;
					}

						if (duration > 0) {
							const elapsedServer = getServerElapsed();
							const elapsedPlayer = player.getCurrentTime?.();
							// UI should reflect what viewer actually sees.
							const elapsedUi =
								typeof elapsedPlayer === 'number' && Number.isFinite(elapsedPlayer) && elapsedPlayer >= 0
									? elapsedPlayer
									: elapsedServer;
							playbackProgress = (elapsedUi / duration) * 100;

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
							// Keep this tight when we have native player duration.
							const endGraceSec = hasNativeDuration ? 0.35 : 1.2;
							const nearEndByPlayer =
								typeof elapsedPlayer === 'number' && Number.isFinite(elapsedPlayer)
									? elapsedPlayer >= duration - 0.6
									: false;
							const farPastEndByServer = elapsedServer >= duration + 8;
							if (elapsedServer >= duration + endGraceSec && (nearEndByPlayer || farPastEndByServer)) {
								requestNextOnce();
							}
						}
					}
				}
				// Periodic drift correction (avoid aggressive micro-seeks)
				if (time - lastSync > 900 && player && playerState.currentSong) {
					lastSync = time;
					try {
						const current = player.getCurrentTime?.();
						const correct = getServerElapsed();
						const state = player.getPlayerState?.();
						const duration =
							player._raw?.getDuration?.() || playerState.currentSong?.duration || 0;
						const nearEnd = duration > 0 && correct > duration - 4;
						const drift = correct - current;
						const inWarmup = nowMs() - transitionAtMs < 1800;
						if (Number.isFinite(drift)) pushDriftSample(Math.abs(drift));
						if (
							state === 1 &&
							!nearEnd &&
							typeof current === 'number' &&
							Number.isFinite(drift) &&
							Math.abs(drift) > (inWarmup ? 0.55 : 0.22)
						) {
							const now = nowMs();
							if (now - lastSeekAtMs > 420) {
								if (inWarmup || Math.abs(drift) > 0.95) {
									player.seek(correct);
									hardSyncCount += 1;
								} else {
									player.seek(current + clamp(drift, -0.4, 0.4));
									microSyncCount += 1;
								}
								lastSeekAtMs = now;
							}
							emitSyncTelemetry();
						}
					} catch {
						// ignore
					}
				}
				// Hard sync every ~3s: full seek if drift is significant.
				if (time - lastHardSync > 2400 && player && playerState.currentSong) {
					lastHardSync = time;
					try {
						const state = player.getPlayerState?.();
						const current = player.getCurrentTime?.();
						const correct = getServerElapsed();
						if (state === 1 && typeof current === 'number' && Number.isFinite(current)) {
							const drift = correct - current;
							if (Number.isFinite(drift)) pushDriftSample(Math.abs(drift));
							if (Math.abs(drift) > 0.9) {
								player.seek(correct);
								hardSyncCount += 1;
								lastSeekAtMs = nowMs();
								emitSyncTelemetry();
							}
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
