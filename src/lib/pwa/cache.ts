/**
 * Pure helpers for the service worker's cache bookkeeping, kept apart so they can be unit
 * tested. The service worker itself (src/service-worker) only wires them to the browser.
 */
const PREFIX = 'svelte-snake-';

/** One cache per deployment: a new build gets a fresh cache and the old one is discarded. */
export function cacheName(version: string): string {
	return `${PREFIX}${version}`;
}

/** Caches that belong to this app but to an older deployment. Other apps' caches are left alone. */
export function obsoleteCaches(keys: readonly string[], current: string): string[] {
	return keys.filter((key) => key.startsWith(PREFIX) && key !== current);
}

/**
 * Turns a build file path (relative to the base path) into an absolute pathname, given the
 * resolved home page (`/` locally, `/svelte-snake/` on GitHub Pages). SvelteKit's `resolve`
 * only accepts known routes, and build files are not routes.
 */
export function withBase(home: string, path: string): string {
	return `${home.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
}

/** Files in `static/` that the offline app does not need. */
export function isPrecachable(path: string): boolean {
	const name = path.split('/').pop() ?? '';
	return name !== '.nojekyll' && name !== 'robots.txt';
}
