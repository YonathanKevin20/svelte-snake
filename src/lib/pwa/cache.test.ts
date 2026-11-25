import { describe, expect, it } from 'vitest';
import { cacheName, isPrecachable, obsoleteCaches, withBase } from './cache';

describe('cacheName', () => {
	it('is unique per version and namespaced to this app', () => {
		expect(cacheName('abc')).toBe('svelte-snake-abc');
		expect(cacheName('abc')).not.toBe(cacheName('abd'));
	});
});

describe('obsoleteCaches', () => {
	it("lists only this app's older caches", () => {
		const current = cacheName('2');
		const keys = [cacheName('1'), current, cacheName('0'), 'other-app-cache', 'workbox-precache'];
		expect(obsoleteCaches(keys, current)).toEqual([cacheName('1'), cacheName('0')]);
	});

	it('keeps the current cache and handles an empty list', () => {
		expect(obsoleteCaches([cacheName('1')], cacheName('1'))).toEqual([]);
		expect(obsoleteCaches([], cacheName('1'))).toEqual([]);
	});
});

describe('isPrecachable', () => {
	it('skips hosting files', () => {
		expect(isPrecachable('/.nojekyll')).toBe(false);
		expect(isPrecachable('robots.txt')).toBe(false);
	});

	it('keeps everything the app needs', () => {
		expect(isPrecachable('/manifest.webmanifest')).toBe(true);
		expect(isPrecachable('/icon-192.png')).toBe(true);
		expect(isPrecachable('/_app/immutable/entry/start.js')).toBe(true);
	});
});

describe('withBase', () => {
	it('prefixes the base path, with or without slashes around it', () => {
		expect(withBase('/svelte-snake/', '_app/immutable/a.js')).toBe(
			'/svelte-snake/_app/immutable/a.js'
		);
		expect(withBase('/svelte-snake', '/_app/immutable/a.js')).toBe(
			'/svelte-snake/_app/immutable/a.js'
		);
	});

	it('works when the app is served from the root', () => {
		expect(withBase('/', '_app/immutable/a.js')).toBe('/_app/immutable/a.js');
		expect(withBase('/', '/_app/immutable/a.js')).toBe('/_app/immutable/a.js');
	});
});
