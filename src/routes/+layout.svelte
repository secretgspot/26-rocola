<script>
	import 'open-props/style';
	import favicon from '$lib/assets/favicon.svg';
	import { playerState } from '$lib/client/stores.svelte.js';

	let { children } = $props();

	let pageTitle = $derived(
		playerState.currentSong
			? `NOW_PLAYING: ${playerState.currentSong.title} | Rocola`
			: 'Rocola - Social Jukebox'
	);

	let jsonLd = $derived.by(() => {
		if (!playerState.currentSong) return null;
		return {
			'@context': 'https://schema.org',
			'@type': 'VideoObject',
			'name': playerState.currentSong.title,
			'description': `Now playing on Rocola: ${playerState.currentSong.title}`,
			'thumbnailUrl': playerState.currentSong.thumbnail,
			'uploadDate': new Date().toISOString(), // Fallback
			'embedUrl': `https://www.youtube.com/embed/${playerState.currentSong.videoId}`
		};
	});
</script>

<svelte:head>
	<title>{pageTitle}</title>
	<link rel="icon" href={favicon} />
	{#if jsonLd}
		{@html `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`}
	{/if}
</svelte:head>

{@render children()}
