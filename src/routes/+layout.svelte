<script>
	import favicon from '$lib/assets/favicon.svg';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="stylesheet" href="https://unpkg.com/open-props@1.13.1/normalize.css">
	<link rel="stylesheet" href="https://unpkg.com/open-props@1.13.1/open-props.min.css">
</svelte:head>

<style global>
:root {
  /* Rocola theme tokens */
  --bg: #0a0e27;
  --panel-bg: rgba(255,255,255,0.03);
  --card-bg: rgba(255,255,255,0.035);
  --muted: #9aa0b2;
  --accent: #00d9ff;
  --accent-2: #ff006e;
  --accent-3: #8338ec;
  --radius: 10px;
  --gap: 0.75rem;
  --glass: linear-gradient(135deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));
}

/* Base layout */
html, body, #svelte {
  height: 100%;
}
body {
  margin: 0;
  /* prefer Open Props gradient token if available, fallback to radial background */
  background-image: var(--gradient-5, radial-gradient(1200px 600px at 10% 10%, rgba(131,56,236,0.06), transparent));
  background-color: var(--bg);
  color: #e6eef8;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  line-height: 1.35;
}

/* Containers */
.container { padding: 1.25rem; box-sizing: border-box; }

/* Card */
.card {
  background: var(--card-bg);
  border-radius: var(--radius);
  padding: .6rem;
  box-shadow: 0 6px 30px rgba(0,0,0,0.6);
}

/* Accent utilities */
.btn-accent { background: var(--accent); color: #041525; border: 0; padding: .5rem .8rem; border-radius: 8px; cursor: pointer; }
.btn-glow { box-shadow: 0 0 16px rgba(0,217,255,0.14); }
.neon { text-shadow: 0 0 10px rgba(0,217,255,0.25), 0 0 24px rgba(131,56,236,0.06); }

/* Queue and player tweaks */
.player { min-height: 69vh; display:flex; align-items:center; justify-content:center; }
.queue { margin-top: 1rem; }
.queue-item { padding: .5rem; border-bottom: 1px solid rgba(255,255,255,0.04); }

/* Toasts */
.toasts { position: fixed; right: 1rem; bottom: 1rem; display:flex; flex-direction:column; gap:.5rem; z-index:1000 }
.toast { background: rgba(0,0,0,0.6); color: #fff; padding: .5rem 1rem; border-radius: 6px; }
.toast.info { border-left: 4px solid var(--accent); }
.toast.success { border-left: 4px solid #7CFC00; }
.toast.warn { border-left: 4px solid #ffae42; }

/* Small responsive */
@media (max-width: 700px) {
  .player { min-height: 56vh; }
  .container { padding: .6rem; }
}
</style>

<script>
	import { onMount } from 'svelte';

	onMount(() => {
		if (typeof window !== 'undefined' && window.getComputedStyle) {
			console.log('open-props --gradient-5:', getComputedStyle(document.documentElement).getPropertyValue('--gradient-5'));
		}
	});
</script>

{@render children()}
