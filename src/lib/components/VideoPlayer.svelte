<script>
	import { untrack } from 'svelte';
	import { createPlayer } from '$lib/client/youtube-player';
	import { playerState, addToast } from '$lib/client/stores.svelte.js';

	let { onnext, ontimeupdate } = $props();

	let el = $state();
	/** @type {any} */
	let player = $state(null);
	let playbackProgress = $state(0);
	
	/** @type {string | null} */
	let lastLoadedVideoId = $state(null);
	/** @type {number | null} */
	let lastStartedAt = $state(null);

	// Calculate initial seek time based on startedAt
	function getInitialSeek() {
		if (playerState.currentSong?.startedAt) {
			const now = Math.floor(Date.now() / 1000);
			const elapsed = now - playerState.currentSong.startedAt;
			return elapsed > 0 ? elapsed : 0;
		}
		return 0;
	}

	// 1. Initialize Player Once
	$effect(() => {
		if (!el) return;
		
		/** @type {any} */
		let p;
		const initialVideoId = untrack(() => playerState.currentSong?.videoId);
		const seekTo = untrack(() => getInitialSeek());
		
		console.log('[VideoPlayer] Initializing', { initialVideoId, seekTo });
		
		createPlayer(el.id, { 
			videoId: initialVideoId,
			onStateChange: (e) => {
				if (e.data === 0) onnext?.();
			},
			onError: (e) => {
				const errorMsgs = { 2: 'Invalid parameter', 5: 'HTML5 error', 100: 'Not found', 101: 'Blocked', 150: 'Blocked' };
				// @ts-ignore
				const msg = errorMsgs[e.data] || 'Playback error';
				addToast({ message: `Skipping: ${msg}`, level: 'warn' });
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

		return () => {
			console.log('[VideoPlayer] Cleanup');
			p?.destroy();
		};
	});

	// 2. Load New Songs or Re-sync
	$effect(() => {
		const current = playerState.currentSong;
		if (!player || !current?.videoId) return;

		const isNewVideo = current.videoId !== lastLoadedVideoId;
		const isNewStart = current.startedAt && current.startedAt !== lastStartedAt;

		if (isNewVideo || isNewStart) {
			console.log('[VideoPlayer] Updating playback', { isNewVideo, isNewStart });
			const seekTo = getInitialSeek();
			
			if (isNewVideo) {
				player.load(current.videoId, true);
				if (seekTo > 2) player.seek(seekTo); // Only seek if significant gap
			} else if (isNewStart) {
				player.seek(seekTo);
				player.play();
			}
			
			lastLoadedVideoId = current.videoId;
			lastStartedAt = current.startedAt ?? null;
			playbackProgress = 0;
		}
	});

	// 3. Progress Tracking
	$effect(() => {
		if (!player) return;

		const interval = setInterval(() => {
			const raw = player._raw;
			if (raw && typeof raw.getCurrentTime === 'function') {
				const currentTime = raw.getCurrentTime();
				const duration = raw.getDuration() || 0;
				if (duration > 0) {
					playbackProgress = (currentTime / duration) * 100;
					ontimeupdate?.({ progress: playbackProgress });
				}
			}
		}, 500);

		return () => clearInterval(interval);
	});
</script>

<div class="video-container">
	<div id="yt-player-video" bind:this={el} class="yt-embed"></div>
	
	{#if player && playerState.currentSong && lastLoadedVideoId === null}
		<div class="autoplay-overlay">
			<div class="overlay-content">
				<p>SYSTEM READY</p>
				<button onclick={() => { 
					if (!player || !playerState.currentSong) return;
					player.play(); 
					const seekTo = getInitialSeek();
					if (seekTo > 0) player.seek(seekTo);
					lastLoadedVideoId = playerState.currentSong.videoId; 
					lastStartedAt = playerState.currentSong.startedAt ?? null;
				}}>
					INITIALIZE AUDIO_VISUAL
				</button>
			</div>
		</div>
	{/if}

	<div class="corner-accents">
		<div class="accent top-left"></div>
		<div class="accent top-right"></div>
		<div class="accent bottom-left"></div>
		<div class="accent bottom-right"></div>
	</div>
</div>

<style>
	.video-container { width: 100%; height: 100%; position: relative; background: #000; overflow: hidden; }
	.yt-embed { width: 100%; height: 100%; transform: scale(1.01); }
	.autoplay-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: rgba(2, 3, 10, 0.9); display: flex; align-items: center; justify-content: center; z-index: 100; backdrop-filter: blur(10px); }
	.overlay-content { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; }
	.overlay-content p { font-family: var(--font-pixel); color: var(--text-dim); font-size: 0.6rem; letter-spacing: 0.2em; }
	.autoplay-overlay button { background: rgba(0, 243, 255, 0.05); border: 1px solid var(--neon-cyan); color: var(--neon-cyan); padding: 1.25rem 2.5rem; font-family: var(--font-display); font-weight: 800; font-size: 1rem; cursor: pointer; box-shadow: 0 0 30px rgba(0, 243, 255, 0.1); transition: all 0.3s; letter-spacing: 0.1em; }
	.autoplay-overlay button:hover { background: var(--neon-cyan); color: #000; box-shadow: 0 0 50px rgba(0, 243, 255, 0.3); }
	.corner-accents { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 10; }
	.corner-accents .accent { position: absolute; width: 20px; height: 20px; border: 1px solid var(--neon-cyan); opacity: 0.4; }
	.accent.top-left { top: 1rem; left: 1rem; border-right: 0; border-bottom: 0; }
	.accent.top-right { top: 1rem; right: 1rem; border-left: 0; border-bottom: 0; }
	.accent.bottom-left { bottom: 1rem; left: 1rem; border-right: 0; border-top: 0; }
	.accent.bottom-right { bottom: 1rem; right: 1rem; border-left: 0; border-top: 0; }
</style>
