import { version } from '$app/env';
import { assets, immutable, prerendered } from '$app/manifest';
import { asset, resolve } from '$app/paths';
import { self } from '$app/service-worker';
import { cacheName, isPrecachable, obsoleteCaches, withBase } from '../lib/pwa/cache';

const CACHE = cacheName(version);

/** The home page, served when a navigation fails (the app is a single page). */
const HOME = resolve('/');

// Everything the game needs, as absolute pathnames (the manifest lists them relative to the
// base path, which is /svelte-snake on GitHub Pages).
const PRECACHE = [
	...immutable.map((file) => withBase(HOME, file.path)), // the hashed JS and CSS from the build
	...assets.filter((file) => isPrecachable(file.path)).map((file) => asset(file.path)), // static/
	...prerendered.map((page) => resolve(page.path))
];
const PRECACHED = new Set(PRECACHE);

self.addEventListener('install', (event) => {
	// addAll is all-or-nothing: if any file fails, this version never activates, so a visitor
	// can never end up with a half-cached game.
	event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of obsoleteCaches(await caches.keys(), CACHE)) await caches.delete(key);
			// Start serving the very first visit, without waiting for a reload.
			await self.clients.claim();
		})()
	);
});

self.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);
	if (url.origin !== self.location.origin) return;
	event.respondWith(respond(request, url));
});

async function respond(request: Request, url: URL): Promise<Response> {
	const cache = await caches.open(CACHE);

	// Pages: network first, so a new deployment shows up as soon as you are online. When the
	// network fails, serve the cached home page instead, which is what makes the game offline.
	if (request.mode === 'navigate') {
		try {
			return await fetch(request);
		} catch (error) {
			const home = await cache.match(HOME);
			if (home) return home;
			throw error;
		}
	}

	// Built and static files never change within a deployment: serve them from the cache.
	if (PRECACHED.has(url.pathname)) {
		const cached = await cache.match(url.pathname);
		if (cached) return cached;
	}

	return fetch(request);
}
