<script>
	import favicon from '$lib/assets/favicon.svg';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		if (typeof window !== 'undefined' && window.getComputedStyle) {
			console.log('Rocola theme loaded');
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="stylesheet" href="https://unpkg.com/open-props@1.13.1/normalize.css">
	<link rel="stylesheet" href="/vendor/open-props-tokens.css">
</svelte:head>

<style global>
:root {
  /* Rocola Futuristic Theme Tokens */
  
  /* Colors */
  --bg-dark: #050714;
  --bg-panel: rgba(10, 14, 39, 0.7);
  --glass-border: rgba(255, 255, 255, 0.08);
  
  --neon-cyan: #00f3ff;
  --neon-pink: #ff00ff;
  --neon-purple: #bc13fe;
  --neon-green: #0aff0a;
  
  --text-main: #e6eef8;
  --text-dim: #9aa0b2;

  /* Tiers */
  --tier-free: #9aa0b2;
  --tier-silver: var(--neon-cyan);
  --tier-gold: #ffd700;
  --tier-platinum: var(--neon-purple);

  /* Dimensions */
  --radius-sm: 4px;
  --radius-md: 12px;
  --radius-lg: 20px;
  
  /* Effects */
  --glow-cyan: 0 0 10px rgba(0, 243, 255, 0.5);
  --glow-pink: 0 0 10px rgba(255, 0, 255, 0.5);
  --glow-purple: 0 0 10px rgba(188, 19, 254, 0.5);
  --glass-gradient: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
  
  /* Fonts */
  --font-display: 'Orbitron', sans-serif;
  --font-mono: 'Press Start 2P', monospace;
  --font-body: 'Inter', system-ui, sans-serif;
}

/* Base Reset & Typography */
html, body {
  height: 100%;
  overflow: hidden;
  background-color: var(--bg-dark);
  background-image: 
    radial-gradient(circle at 15% 50%, rgba(188, 19, 254, 0.12) 0%, transparent 40%),
    radial-gradient(circle at 85% 30%, rgba(0, 243, 255, 0.12) 0%, transparent 40%);
  color: var(--text-main);
  font-family: var(--font-body);
}

body::before {
  content: "";
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background-image: 
    linear-gradient(rgba(0, 243, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 243, 255, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
  background-position: center center;
  pointer-events: none;
  z-index: -1;
  mask-image: radial-gradient(ellipse at center, black, transparent 80%);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  margin: 0;
  color: #fff;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.2);
}
::-webkit-scrollbar-thumb {
  background: rgba(255,255,255,0.1);
  border-radius: 4px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(255,255,255,0.2);
}

/* Utilities */
.glass-panel {
  background: var(--bg-panel);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-md);
}

.text-neon {
  color: #fff;
  text-shadow: 0 0 5px currentColor, 0 0 10px currentColor;
}

.cyan { color: var(--neon-cyan); }
.pink { color: var(--neon-pink); }
.purple { color: var(--neon-purple); }
.green { color: var(--neon-green); }

.flex-center { display: flex; align-items: center; justify-content: center; }
.flex-col { display: flex; flex-direction: column; }

/* Global components overrides */
button {
  font-family: var(--font-display);
}
</style>

{@render children()}