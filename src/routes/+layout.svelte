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
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
	<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Press+Start+2P&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400;500&display=swap" rel="stylesheet">
	<link rel="stylesheet" href="https://unpkg.com/open-props@1.13.1/normalize.css">
	<link rel="stylesheet" href="/vendor/open-props-tokens.css">
</svelte:head>

<style global>
:root {
  /* Rocola Futuristic Theme Tokens */
  
  /* Colors */
  --bg-dark: #02030a;
  --bg-panel: rgba(5, 7, 20, 0.85);
  --glass-border: rgba(0, 243, 255, 0.15);
  --glass-border-bright: rgba(0, 243, 255, 0.4);
  
  --neon-cyan: #00f3ff;
  --neon-pink: #ff00ff;
  --neon-purple: #bc13fe;
  --neon-green: #0aff0a;
  --neon-yellow: #fff200;
  
  --text-main: #e6eef8;
  --text-dim: #64748b;
  --text-muted: #334155;

  /* Tiers */
  --tier-free: #94a3b8;
  --tier-silver: #cbd5e1;
  --tier-gold: #fbbf24;
  --tier-platinum: #bc13fe;

  /* Dimensions */
  --radius-xs: 2px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  
  /* Effects */
  --glow-cyan: 0 0 15px rgba(0, 243, 255, 0.3);
  --glow-pink: 0 0 15px rgba(255, 0, 255, 0.3);
  --glow-purple: 0 0 15px rgba(188, 19, 254, 0.3);
  --glass-gradient: linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.01) 100%);
  
  /* Fonts */
  --font-display: 'Orbitron', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  --font-pixel: 'Press Start 2P', cursive;
  --font-body: 'Inter', system-ui, sans-serif;

  --gap: 1.25rem;
}

/* Base Reset & Typography */
html, body {
  height: 100%;
  overflow: hidden;
  background-color: var(--bg-dark);
  background-image: 
    radial-gradient(circle at 15% 50%, rgba(188, 19, 254, 0.08) 0%, transparent 40%),
    radial-gradient(circle at 85% 30%, rgba(0, 243, 255, 0.08) 0%, transparent 40%);
  color: var(--text-main);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}

/* Scanline Effect */
body::after {
  content: "";
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.15) 50%), 
              linear-gradient(90deg, rgba(255, 0, 0, 0.03), rgba(0, 255, 0, 0.01), rgba(0, 0, 255, 0.03));
  background-size: 100% 3px, 3px 100%;
  pointer-events: none;
  z-index: 9999;
}

/* Grain Effect */
body::before {
  content: "";
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  opacity: 0.04;
  pointer-events: none;
  z-index: 9998;
}

.grid-bg {
  position: fixed;
  top: 0; left: 0; width: 100%; height: 100%;
  background-image: 
    linear-gradient(rgba(0, 243, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 243, 255, 0.02) 1px, transparent 1px);
  background-size: 40px 40px;
  background-position: center center;
  pointer-events: none;
  z-index: -1;
  mask-image: radial-gradient(ellipse at center, black, transparent 90%);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  text-transform: uppercase;
  letter-spacing: 0.15em;
  margin: 0;
  color: #fff;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: rgba(0,0,0,0.4);
}
::-webkit-scrollbar-thumb {
  background: var(--neon-cyan);
  border-radius: 0;
  box-shadow: 0 0 5px var(--neon-cyan);
}
::-webkit-scrollbar-thumb:hover {
  background: #fff;
  box-shadow: 0 0 10px #fff;
}

/* Utilities */
.glass-panel {
  background: var(--bg-panel);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--glass-border);
  position: relative;
}

/* Corner Accents for Panels */
.glass-panel::before, .glass-panel::after {
  content: "";
  position: absolute;
  width: 10px;
  height: 10px;
  border-color: var(--neon-cyan);
  border-style: solid;
  pointer-events: none;
  opacity: 0.6;
}
.glass-panel::before {
  top: -1px; left: -1px;
  border-width: 2px 0 0 2px;
}
.glass-panel::after {
  bottom: -1px; right: -1px;
  border-width: 0 2px 2px 0;
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
  cursor: pointer;
  border: none;
  outline: none;
}

/* Animations */
@keyframes glitch {
  0% { transform: translate(0); }
  20% { transform: translate(-2px, 2px); }
  40% { transform: translate(-2px, -2px); }
  60% { transform: translate(2px, 2px); }
  80% { transform: translate(2px, -2px); }
  100% { transform: translate(0); }
}

.glitch-hover:hover {
  animation: glitch 0.2s infinite;
}
</style>

<div class="grid-bg"></div>
{@render children()}