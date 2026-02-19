/// <reference types="@sveltejs/kit" />
import { build, files, version } from '$service-worker';

const CACHE_NAME = `rocola-${version}`;
const ASSETS = [...build, ...files, '/'];

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(CACHE_NAME);
			await cache.addAll(ASSETS);
			await self.skipWaiting();
		})()
	);
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const names = await caches.keys();
			await Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)));
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);

	// Keep API and realtime traffic network-only.
	if (url.pathname.startsWith('/api/')) return;

	event.respondWith(
		(async () => {
			const cached = await caches.match(request);
			if (cached) return cached;
			try {
				const response = await fetch(request);
				const cache = await caches.open(CACHE_NAME);
				cache.put(request, response.clone());
				return response;
			} catch {
				// Fallback to app shell for navigation requests.
				if (request.mode === 'navigate') {
					const shell = await caches.match('/');
					if (shell) return shell;
				}
				throw new Error('Network unavailable');
			}
		})()
	);
});
