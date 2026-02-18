import { test, expect } from '@playwright/test';

test.describe('Rocola UI interactions', () => {
	test('H toggles help and queue hover reveal is disabled while help is open', async ({ page }) => {
		await page.goto('/');

		// Seed queue so queue-zone exists.
		await page.evaluate(async () => {
			await fetch('/api/debug/seed', { method: 'POST' });
		});
		await page.waitForTimeout(400);

		const queueZone = page.locator('aside.queue-zone');
		await expect(queueZone).toHaveCount(1);

		await page.mouse.move(1260, 300);
		await expect(queueZone).toHaveClass(/visible/);

		await page.keyboard.press('h');
		await expect(page.locator('.help-modal')).toBeVisible();
		await expect(queueZone).not.toHaveClass(/visible/);

		await page.mouse.move(1260, 280);
		await page.waitForTimeout(180);
		await expect(queueZone).not.toHaveClass(/visible/);

		await page.keyboard.press('h');
		await expect(page.locator('.help-modal')).toHaveCount(0);
	});

	test('N triggers skip request in dev/admin mode', async ({ page }) => {
		await page.goto('/');
		await page.evaluate(async () => {
			await fetch('/api/debug/seed', { method: 'POST' });
		});
		await page.waitForTimeout(300);

		const skipResponsePromise = page.waitForResponse(
			(resp) =>
				resp.url().includes('/api/queue/next') &&
				resp.request().method() === 'POST'
		);

		await page.keyboard.press('n');
		const skipResponse = await skipResponsePromise;
		expect(skipResponse.ok()).toBeTruthy();
	});

	test('mobile help layout keeps landing top visible below header', async ({ page }) => {
		await page.setViewportSize({ width: 425, height: 888 });
		await page.goto('/');
		await page.keyboard.press('h');

		const help = page.locator('.help-modal');
		const hero = page.locator('.landing .hero h1').first();
		await expect(help).toBeVisible();
		await expect(hero).toBeVisible();

		const box = await hero.boundingBox();
		expect(box).not.toBeNull();
		// Header is 56px; content should start below it.
		expect(box.y).toBeGreaterThanOrEqual(56);
	});
});

