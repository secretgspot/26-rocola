<script>
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		if (typeof window !== 'undefined' && window.getComputedStyle) {
			console.log('Rocola Monolith Mode Active');
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<!-- Correct Open Props CDN links -->
	<link rel="stylesheet" href="https://unpkg.com/open-props">
	<link rel="stylesheet" href="https://unpkg.com/open-props/normalize.min.css">
</svelte:head>

<style global>
:root {
  /* STRICT MONOCHROME */
  --bg-dark: #000000;
  --bg-panel: #000000;
  --bg-alt: #000000;
  --border-dim: #222222;
  --border-main: #444444;
  --border-bright: #ffffff;
  
  --text-main: #ffffff;
  --text-dim: #888888;
  --text-muted: #444444;
}

/* FORCED GLOBAL RESET */
html {
  background-color: var(--bg-dark);
  color: var(--text-main);
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: monospace !important;
}

body {
  margin: 0;
  padding: 0;
  height: 100%;
  width: 100%;
  overflow: hidden;
  font-family: monospace !important;
  text-transform: uppercase;
  -webkit-font-smoothing: none;
  box-sizing: border-box;
}

/* Apply to all elements */
*, *::before, *::after {
  font-family: monospace !important;
  box-sizing: inherit;
  border-radius: 0 !important;
  box-shadow: none !important;
  text-transform: inherit;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 900;
  margin: 0;
}

/* Flat UI Components */
button {
  cursor: pointer;
  border: 1px solid var(--border-main);
  background: var(--bg-dark);
  color: var(--text-main);
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  font-weight: 700;
}

button:hover {
  background: var(--text-main);
  color: var(--bg-dark);
  border-color: var(--text-main);
}

button:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

input {
  background: var(--bg-dark);
  border: 1px solid var(--border-main);
  color: var(--text-main);
  padding: 0.5rem;
  font-size: 0.9rem;
  width: 100%;
}

input:focus {
  outline: none;
  border-color: var(--border-bright);
}

/* Scrollbar (Industrial) */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: var(--bg-dark); }
::-webkit-scrollbar-thumb { background: var(--border-main); }
::-webkit-scrollbar-thumb:hover { background: var(--text-main); }

/* Layout Helpers */
.overflow-hidden { overflow: hidden; }
.min-w-0 { min-width: 0; }
.flex-1 { flex: 1; }

.border-b { border-bottom: 1px solid var(--border-main); }
.border-t { border-top: 1px solid var(--border-main); }
.border-r { border-right: 1px solid var(--border-main); }
.border-l { border-left: 1px solid var(--border-main); }
</style>

{@render children()}