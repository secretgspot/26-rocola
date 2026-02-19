import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const outDir = path.resolve('static/icons');

const targets = [
	{ file: 'icon-192.png', size: 192, maskable: false },
	{ file: 'icon-512.png', size: 512, maskable: false },
	{ file: 'icon-maskable-192.png', size: 192, maskable: true },
	{ file: 'icon-maskable-512.png', size: 512, maskable: true }
];

function html(size, maskable) {
	const pad = maskable ? Math.round(size * 0.16) : 0;
	const iconSize = size - pad * 2;
	return `<!doctype html>
<html>
<body style="margin:0;background:#000;display:grid;place-items:center;width:${size}px;height:${size}px;overflow:hidden;">
	<div style="width:${iconSize}px;height:${iconSize}px;display:grid;place-items:center;">
		<img src="file://${path.resolve('static/icons/icon.svg').replace(/\\/g, '/')}" style="width:100%;height:100%;display:block;" />
	</div>
</body>
</html>`;
}

async function main() {
	await fs.mkdir(outDir, { recursive: true });
	const browser = await chromium.launch({ headless: true });
	const page = await browser.newPage();
	try {
		for (const t of targets) {
			await page.setViewportSize({ width: t.size, height: t.size });
			await page.setContent(html(t.size, t.maskable), { waitUntil: 'load' });
			await page.screenshot({
				path: path.join(outDir, t.file),
				type: 'png',
				omitBackground: false
			});
		}
		console.log('Generated icons:', targets.map((t) => `static/icons/${t.file}`));
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error('Failed to generate PWA icons', err);
	process.exit(1);
});

