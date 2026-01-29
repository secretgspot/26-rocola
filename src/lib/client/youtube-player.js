/**
 * Minimal YouTube Iframe Player wrapper using YT.Player API.
 * Loads the Iframe API on demand and resolves once available.
 * Provides createPlayer(elementId, options) -> Promise<PlayerController>
 */

/** @type {Promise<void>|null} */
let apiLoadPromise = null;

function loadApi() {
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();
    if (window.YT && window.YT.Player) return resolve();
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    window.onYouTubeIframeAPIReady = () => resolve();
  });
  return apiLoadPromise;
}

/**
 * Create a player attached to an element id.
 * @param {string} elementId
 * @param {{videoId?: string, onStateChange?: function}} options
 */
export async function createPlayer(elementId, options = {}) {
  await loadApi();
  return new Promise((resolve, reject) => {
    /** @type {any} */
    const player = new window.YT.Player(elementId, {
      height: '360',
      width: '640',
      videoId: options.videoId || '',
      playerVars: {
        rel: 0,
        modestbranding: 1,
        controls: 0, // hide UI controls to emulate a jukebox
        enablejsapi: 1,
        disablekb: 1,
        origin: window.location ? window.location.origin : undefined
      },
      events: {
        onReady: () => {
          resolve({
            play: () => player.playVideo(),
            pause: () => player.pauseVideo(),
            load: (id, autoplay = true) => {
              // load and attempt autoplay
              if (autoplay) player.loadVideoById(id);
              else player.cueVideoById(id);
            },
            stop: () => player.stopVideo(),
            seek: (t) => player.seekTo(t, true),
            getState: () => player.getPlayerState(),
            getCurrentTime: () => (typeof player.getCurrentTime === 'function' ? player.getCurrentTime() : 0),
            setVolume: (v) => player.setVolume(v),
            destroy: () => player.destroy(),
            _raw: player
          });
        },
        onStateChange: (e) => {
          if (typeof options.onStateChange === 'function') options.onStateChange(e);
        },
        onError: (e) => {
          console.warn('YT player error', e);
          if (typeof options.onError === 'function') options.onError(e);
        }
      }
    });
  });
}
