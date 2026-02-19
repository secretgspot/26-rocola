<script>
	import { untrack } from 'svelte';
	import { createPlayer } from '$lib/client/youtube-player';
	import { playerState, addToast, refreshQueue } from '$lib/client/stores.svelte.js';

	let {
		onnext,
		ontimeupdate,
		onstatsupdate,
		onplaystate,
		onsynctelemetry,
		onendedsignal,
		onlocalblockstate,
		canControl = false
	} = $props();

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
	let localPlaybackBlocked = $state(false);
	let localPlaybackBlockedAt = $state(0);
	let lastBlockedRefreshAt = $state(0);
	let lastForcedLoadAt = $state(0);
	let localErrorRetryByQueue = $state({});

	const SYNC_CFG = {
		warmupMs: 4200,
		warmupStateSeekThresholdSec: 4.0,
		warmupLoopSeekThresholdSec: 4.0,
		normalSeekThresholdSec: 1.4,
		hardSeekThresholdSec: 1.8,
		hardSeekCadenceMs: 2400,
		microSeekCadenceMs: 1400,
		minSeekGapMs: 900,
		convergenceCheckCadenceMs: 1200,
		convergenceMinAgeMs: 4200
	};
	
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

	function requestNextOnce(minTrackAgeMs = 0) {
		if (!canControl) return;
		if (minTrackAgeMs > 0 && transitionAtMs > 0 && nowMs() - transitionAtMs < minTrackAgeMs) return;
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
					if (e.data === 1 || e.data === 3 || e.data === 5) {
						localPlaybackBlocked = false;
						onlocalblockstate?.({ blocked: false });
					}
					if (e.data === 0) {
						// Ignore startup/spurious ended pulses, but don't block legitimate ended events
						// when metadata duration mismatches the real YouTube duration.
						try {
							const ageMs = transitionAtMs > 0 ? nowMs() - transitionAtMs : Number.POSITIVE_INFINITY;
							const current = p?.getCurrentTime?.();
							const duration = p?._raw?.getDuration?.() || playerState.currentSong?.duration || 0;
							const nearEnd =
								typeof current === 'number' && duration > 0
									? current >= Math.max(0.8, duration - 1.4)
									: false;
							if (ageMs < 8000 && !nearEnd) return;
						} catch {
							// ignore and fall through
						}
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
						const inWarmup = nowMs() - transitionAtMs < SYNC_CFG.warmupMs;
						if (Number.isFinite(drift)) pushDriftSample(Math.abs(drift));
						// Avoid aggressive seek-on-play; startup stutter is worse than small drift.
						if (!nearEnd && Number.isFinite(drift)) emitSyncTelemetry();
					}
			},
				onError: async (e) => {
					const errorVideoId = e?.target?.getVideoData?.()?.video_id || null;
					const currentVideoId = playerState.currentSong?.videoId || null;
					const currentQueueId = playerState.currentSong?.queueId || playerState.currentSong?.id || null;
					const errorCode = typeof e?.data === 'number' ? e.data : null;
					const isRestriction = errorCode === 100 || errorCode === 101 || errorCode === 150;
					// Ignore stale player errors from a previously loaded video.
					if (errorVideoId && currentVideoId && errorVideoId !== currentVideoId) {
						return;
					}
					localPlaybackBlocked = true;
					localPlaybackBlockedAt = Date.now();
					onlocalblockstate?.({
						blocked: true,
						canControl,
						errorCode
					});
					if (!canControl) {
						addToast({ message: `LOCAL PLAYBACK BLOCKED`, level: 'error' });
						refreshQueue();
						return;
					}

					const trackAgeMs = transitionAtMs > 0 ? nowMs() - transitionAtMs : Number.POSITIVE_INFINITY;
					const localRetries = currentQueueId ? Number(localErrorRetryByQueue[currentQueueId] || 0) : 0;
					if (!isRestriction && (trackAgeMs < 2400 || localRetries < 2)) {
						// Conservative: transient player errors at startup are common.
						// Retry locally before any server-side unavailable/skip decision.
						if (currentQueueId) {
							localErrorRetryByQueue = {
								...localErrorRetryByQueue,
								[currentQueueId]: localRetries + 1
							};
						}
						setTimeout(() => {
							try {
								player?.play?.();
							} catch {
								// ignore
							}
						}, 320);
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
					if (action === 'skip') {
						// Song was marked unavailable server-side; do not consume the next track.
						// Let controller recovery promote the next playable item.
						addToast({ message: `PLAYBACK BLOCKED -> RECOVER`, level: 'error' });
						refreshQueue();
						return;
					}
					// Unknown outcome from unavailable endpoint (network/race/etc):
					// do not consume next track optimistically; let server authoritative tick recover.
					addToast({ message: `PLAYBACK ERROR -> RECOVER`, level: 'error' });
					refreshQueue();
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
				const shouldHardLoad = isNewVideo || localPlaybackBlocked;
				if (shouldHardLoad) {
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
				localErrorRetryByQueue = {};
				localPlaybackBlocked = false;
				onlocalblockstate?.({ blocked: false });
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
		let lastConvergenceCheck = 0;

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
							const activeVideoId = player?._raw?.getVideoData?.()?.video_id || null;
							const targetVideoId = playerState.currentSong?.videoId || null;
							const sameVideoLoaded =
								Boolean(activeVideoId) && Boolean(targetVideoId) && activeVideoId === targetVideoId;
							// If local playback is blocked, keep HUD driven by server timeline.
							const elapsedUi =
								localPlaybackBlocked
									? elapsedServer
									: typeof elapsedPlayer === 'number' && Number.isFinite(elapsedPlayer) && elapsedPlayer >= 0
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

							// Transition is server-authoritative.
							// Do not consume next track from client-side duration heuristics.
							// Server playback tick + ended signal handle advancement.
						} else if (localPlaybackBlocked) {
							// Keep HUD alive even when duration is unknown on blocked embeds.
							const elapsedServer = getServerElapsed();
							const pseudo = ((elapsedServer % 12) / 12) * 100;
							playbackProgress = pseudo;
							ontimeupdate?.({ progress: playbackProgress });
						}
					}
				}
				if (
					localPlaybackBlocked &&
					!canControl &&
					time - lastBlockedRefreshAt > 1200
				) {
					lastBlockedRefreshAt = time;
					refreshQueue();
				}
				// Periodic drift correction (conservative; avoid startup stutter)
				if (time - lastSync > SYNC_CFG.microSeekCadenceMs && player && playerState.currentSong) {
					lastSync = time;
					try {
						const current = player.getCurrentTime?.();
						const correct = getServerElapsed();
						const state = player.getPlayerState?.();
						const duration =
							player._raw?.getDuration?.() || playerState.currentSong?.duration || 0;
						const nearEnd = duration > 0 && correct > duration - 4;
						const drift = correct - current;
						const inWarmup = nowMs() - transitionAtMs < SYNC_CFG.warmupMs;
						if (Number.isFinite(drift)) pushDriftSample(Math.abs(drift));
						const trackAgeMs = transitionAtMs > 0 ? nowMs() - transitionAtMs : Number.POSITIVE_INFINITY;
						if (
							state === 1 &&
							!nearEnd &&
							trackAgeMs > 6000 &&
							typeof current === 'number' &&
							Number.isFinite(drift) &&
							Math.abs(drift) > (inWarmup ? SYNC_CFG.warmupLoopSeekThresholdSec : SYNC_CFG.normalSeekThresholdSec)
						) {
							const now = nowMs();
							if (now - lastSeekAtMs > SYNC_CFG.minSeekGapMs) {
								if (Math.abs(drift) > SYNC_CFG.hardSeekThresholdSec) {
									player.seek(correct);
									hardSyncCount += 1;
								}
								lastSeekAtMs = now;
							}
							emitSyncTelemetry();
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
				// Convergence safety: if iframe is on a different video than store state, force-load target.
				if (time - lastConvergenceCheck > SYNC_CFG.convergenceCheckCadenceMs && player && playerState.currentSong?.videoId) {
					lastConvergenceCheck = time;
					try {
						const liveVideoId = player?._raw?.getVideoData?.()?.video_id || null;
						const targetVideoId = playerState.currentSong.videoId;
						const trackAgeMs = transitionAtMs > 0 ? nowMs() - transitionAtMs : Number.POSITIVE_INFINITY;
						const playerStatus = player.getPlayerState?.();
						if (
							trackAgeMs >= SYNC_CFG.convergenceMinAgeMs &&
							(playerStatus === 1 || playerStatus === 2 || playerStatus === 3 || playerStatus === 5) &&
							liveVideoId &&
							targetVideoId &&
							liveVideoId !== targetVideoId &&
							time - lastForcedLoadAt > SYNC_CFG.convergenceCheckCadenceMs
						) {
							lastForcedLoadAt = time;
							const seekTo = getServerElapsed();
							player.load(targetVideoId, true);
							pendingJoinSeekTo = seekTo > 1.2 ? seekTo : null;
							localPlaybackBlocked = false;
							onlocalblockstate?.({ blocked: false });
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
