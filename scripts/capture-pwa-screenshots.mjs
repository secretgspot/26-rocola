import { chromium, devices } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const outDir = path.resolve('static/screenshots');

async function seed(page) {
	await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
	await page.evaluate(async () => {
		await fetch('/api/debug/seed', { method: 'POST' });
	});
	await page.waitForTimeout(2500);
}

async function captureDesktop(browser) {
	const context = await browser.newContext({
		viewport: { width: 1920, height: 1080 }
	});
	const page = await context.newPage();
	await seed(page);
	await page.waitForTimeout(1500);
	await page.screenshot({
		path: path.join(outDir, 'desktop.png'),
		fullPage: false
	});
	await context.close();
}

async function captureMobile(browser) {
	const context = await browser.newContext({
		...devices['iPhone 12 Pro'],
		viewport: { width: 425, height: 999 }
	});
	const page = await context.newPage();
	await seed(page);
	await page.waitForTimeout(1500);
	await page.screenshot({
		path: path.join(outDir, 'mobile-portrait.png'),
		fullPage: false
	});
	await context.close();
}

async function main() {
	await fs.mkdir(outDir, { recursive: true });
	const browser = await chromium.launch({ headless: true });
	try {
		await captureDesktop(browser);
		await captureMobile(browser);
		console.log('PWA screenshots captured:', {
			desktop: 'static/screenshots/desktop.png',
			mobile: 'static/screenshots/mobile-portrait.png'
		});
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error('Failed to capture screenshots', err);
	process.exit(1);
});

