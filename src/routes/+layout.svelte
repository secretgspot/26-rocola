<script>
	import favicon from '$lib/assets/favicon.svg';
	// global styles (Open Props + Rocola theme)
	import '$lib/styles/app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
