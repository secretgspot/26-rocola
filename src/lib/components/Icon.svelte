<script>
	import addRaw from '$lib/icons/add.svg?raw';
	import clearRaw from '$lib/icons/clear.svg?raw';
	import clientsRaw from '$lib/icons/clients.svg?raw';
	import darkRaw from '$lib/icons/dark.svg?raw';
	import lightRaw from '$lib/icons/light.svg?raw';
	import queueRaw from '$lib/icons/queue.svg?raw';
	import seedRaw from '$lib/icons/seed.svg?raw';
	import skipRaw from '$lib/icons/skip.svg?raw';

	const RAW = {
		add: addRaw,
		clear: clearRaw,
		clients: clientsRaw,
		dark: darkRaw,
		light: lightRaw,
		queue: queueRaw,
		seed: seedRaw,
		skip: skipRaw
	};

	/**
	 * @param {string} raw
	 * @param {number} strokeWidth
	 */
	function buildIcon(raw, strokeWidth) {
		if (!raw) return '';
		return raw
			.replace(/<\?xml[\s\S]*?\?>/g, '')
			.replace(/<!--[\s\S]*?-->/g, '')
			.replace(/(width|height)="[^"]*"/g, '')
			.replace(/\bfill="(?!none\b)[^"]*"/gi, 'fill="currentColor"')
			.replace(/\bstroke="(?!none\b)[^"]*"/gi, 'stroke="currentColor"')
			.replace(/stroke-width="[^"]*"/g, `stroke-width="${strokeWidth}"`)
			.trim();
	}

	let {
		name,
		size = 20,
		color = 'currentColor',
		strokeWidth = 1.8,
		label = '',
		className = ''
	} = $props();

	let svg = $derived(buildIcon(RAW[name], strokeWidth));
</script>

<span
	class={`icon-root ${className}`}
	style={`width:${size}px;height:${size}px;color:${color};`}
	role={label ? 'img' : undefined}
	aria-label={label || undefined}
	aria-hidden={label ? undefined : 'true'}
>
	{@html svg}
</span>

<style>
	.icon-root {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		line-height: 0;
	}
	.icon-root :global(svg) {
		width: 100%;
		height: 100%;
		display: block;
		fill: currentColor;
		stroke: currentColor;
	}
</style>
