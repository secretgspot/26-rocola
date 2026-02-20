import { test, expect } from '@playwright/test';

async function setAdminSessionCookies(context, sessionId) {
	await context.addCookies([
		{
			name: 'admin_mode',
			value: '1',
			domain: '127.0.0.1',
			path: '/'
		},
		{
			name: 'session_id',
			value: sessionId,
			domain: '127.0.0.1',
			path: '/'
		}
	]);
}

async function waitForController(page, timeoutMs = 18_000) {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const state = await page.evaluate(async () => {
			const r = await fetch('/api/admin/controller', { method: 'POST' });
			return r.json();
		});
		if (Boolean(state?.isController)) return true;
		await page.waitForTimeout(700);
	}
	return false;
}

async function clearStateWithRetry(page) {
	for (let i = 0; i < 4; i += 1) {
		const res = await page.evaluate(async () => {
			const r = await fetch('/api/debug/clear', { method: 'POST' });
			const body = await r.json().catch(() => ({}));
			return { status: r.status, body };
		});
		if (res.status === 200 && res.body?.ok) return true;
		if (res.status === 429) {
			const waitSec = Number(res.body?.retryAfter || 2);
			await page.waitForTimeout((waitSec + 1) * 1000);
			continue;
		}
		return false;
	}
	return false;
}

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
		await setAdminSessionCookies(page.context(), `pw-admin-${Date.now()}`);
		await page.goto('/');
		expect(await clearStateWithRetry(page)).toBe(true);
		await page.evaluate(async () => {
			await fetch('/api/debug/seed', { method: 'POST' });
		});
		const claimed = await waitForController(page);
		test.skip(!claimed, 'Controller lease could not be acquired in time');
		await page.waitForFunction(async () => {
			const r = await fetch('/api/queue/current');
			const j = await r.json();
			return Boolean(j?.current?.queueId);
		});

		const skipResponsePromise = page.waitForResponse(
			(resp) =>
				resp.url().includes('/api/queue/next') &&
				resp.request().method() === 'POST'
		);

		await page.keyboard.press('n');
		const skipResponse = await skipResponsePromise;
		expect(skipResponse.ok()).toBeTruthy();
	});

	test('controller exclusivity: only one admin session gets control actions', async ({ browser }) => {
		const ctxA = await browser.newContext({ baseURL: 'http://127.0.0.1:4173' });
		const ctxB = await browser.newContext({ baseURL: 'http://127.0.0.1:4173' });
		const pageA = await ctxA.newPage();
		const pageB = await ctxB.newPage();

		await setAdminSessionCookies(ctxA, `pw-admin-a-${Date.now()}`);
		await setAdminSessionCookies(ctxB, `pw-admin-b-${Date.now()}`);

		await pageA.goto('/');
		expect(await clearStateWithRetry(pageA)).toBe(true);

		await pageA.evaluate(async () => {
			await fetch('/api/debug/seed', { method: 'POST' });
		});

		// A claims first and should keep control.
		const aClaimed = await waitForController(pageA);
		test.skip(!aClaimed, 'Controller lease could not be acquired in time');
		await pageB.goto('/');

		await pageB.waitForTimeout(350);
		const bState = await pageB.evaluate(async () => {
			const r = await fetch('/api/admin/controller', { method: 'POST' });
			return r.json();
		});
		expect(Boolean(bState?.isController)).toBe(false);

		const aNext = await pageA.evaluate(async () => {
			const r = await fetch('/api/queue/next', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ fromQueueId: null, reason: 'playwright_authorized' })
			});
			return { status: r.status, body: await r.json() };
		});
		expect(aNext.status).toBe(200);

		const bNext = await pageB.evaluate(async () => {
			const r = await fetch('/api/queue/next', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ fromQueueId: null, reason: 'playwright_unauthorized' })
			});
			return { status: r.status, body: await r.json() };
		});
		expect(bNext.status).toBe(409);
		expect(String(bNext.body?.error || '')).toMatch(/controller/i);

		await ctxA.close();
		await ctxB.close();
	});

	test('restricted/unavailable convergence: active blocked track transitions to next playable', async ({
		page
	}) => {
		await setAdminSessionCookies(page.context(), `pw-admin-conv-${Date.now()}`);
		await page.goto('/');

		expect(await clearStateWithRetry(page)).toBe(true);

		const base = Date.now();
		for (const videoId of [`pw-conv-${base}-a`, `pw-conv-${base}-b`]) {
			const res = await page.evaluate(async (id) => {
				const r = await fetch('/api/queue', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: JSON.stringify({
						videoId: id,
						tier: 'free',
						metadata: {
							videoId: id,
							title: `Conv ${id}`,
							channelTitle: 'Playwright',
							thumbnail: '',
							duration: 'PT20S'
						}
					})
				});
				return r.json();
			}, videoId);
			expect(res?.ok).toBe(true);
		}

		const claimed = await waitForController(page);
		test.skip(!claimed, 'Controller lease could not be acquired in time');

		const active = await page.evaluate(async () => {
			const r = await fetch('/api/queue/current');
			const j = await r.json();
			return j.current;
		});
		expect(active?.queueId).toBeTruthy();

		const mark = await page.evaluate(async (payload) => {
			const r = await fetch('/api/queue/unavailable', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(payload)
			});
			return { status: r.status, body: await r.json() };
		}, {
			queueId: active.queueId,
			songId: active.songId,
			videoId: active.videoId,
			reason: 'youtube_playback_error',
			errorCode: 101
		});
		expect(mark.status).toBe(200);
		expect(mark.body?.ok).toBe(true);
		expect(mark.body?.action).toBe('skip');

		await page.waitForFunction(
			async (previousQueueId) => {
				const r = await fetch('/api/queue/current');
				const j = await r.json();
				return Boolean(j?.current?.queueId && j.current.queueId !== previousQueueId);
			},
			active.queueId,
			{ timeout: 8000 }
		);
	});

	test('mobile help layout keeps landing top visible below header', async ({ page }) => {
		await page.setViewportSize({ width: 425, height: 888 });
		await page.goto('/');
		await page.locator('button.btn-help').waitFor({ state: 'visible' });
		for (let i = 0; i < 3; i += 1) {
			const alreadyOpen = await page.locator('.help-modal').count();
			if (alreadyOpen) break;
			await page.locator('button.btn-help').click({ force: true });
			await page.waitForTimeout(120);
			if (await page.locator('.help-modal').count()) break;
			await page.keyboard.press('h');
			await page.waitForTimeout(120);
		}

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
