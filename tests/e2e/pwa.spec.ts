import { expect, test, type Page } from '@playwright/test';

interface Manifest {
	name: string;
	short_name: string;
	start_url: string;
	scope: string;
	display: string;
	icons: Array<{ src: string; sizes: string; type: string; purpose?: string }>;
}

// Width and height are stored in the PNG header, so we can check an icon is really the size
// the manifest claims without decoding the image.
function pngSize(bytes: Buffer): { width: number; height: number } {
	return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function waitForServiceWorkerControl(page: Page) {
	await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
}

test.describe('manifest', () => {
	test('is linked from the page and describes an installable app', async ({ page }) => {
		await page.goto('/');
		const href = await page.locator('link[rel="manifest"]').getAttribute('href');
		expect(href).toBeTruthy();
		const url = new URL(href as string, page.url()).toString();

		const response = await page.request.get(url);
		expect(response.ok()).toBe(true);
		const manifest = (await response.json()) as Manifest;

		expect(manifest.name).toBe('Svelte Snake');
		expect(manifest.display).toBe('standalone');
		// Relative URLs keep it working under any base path, such as /svelte-snake/ on GitHub Pages.
		expect(manifest.start_url).toBe('./');
		expect(manifest.scope).toBe('./');
		expect(manifest.icons.some((icon) => icon.sizes === '192x192')).toBe(true);
		expect(manifest.icons.some((icon) => icon.sizes === '512x512')).toBe(true);
		expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);
	});

	test('every icon exists and is the size it claims', async ({ page }) => {
		await page.goto('/');
		const manifestUrl = new URL(
			(await page.locator('link[rel="manifest"]').getAttribute('href')) as string,
			page.url()
		).toString();
		const manifest = (await (await page.request.get(manifestUrl)).json()) as Manifest;

		for (const icon of manifest.icons) {
			const response = await page.request.get(new URL(icon.src, manifestUrl).toString());
			expect(response.ok(), icon.src).toBe(true);
			const [width, height] = icon.sizes.split('x').map(Number);
			expect(pngSize(await response.body()), icon.src).toEqual({ width, height });
		}
	});

	test('provides an Apple touch icon', async ({ page }) => {
		await page.goto('/');
		const href = await page.locator('link[rel="apple-touch-icon"]').getAttribute('href');
		const response = await page.request.get(new URL(href as string, page.url()).toString());
		expect(response.ok()).toBe(true);
	});
});

test.describe('offline', () => {
	test('a service worker takes control and precaches the game', async ({ page }) => {
		await page.goto('/');
		await waitForServiceWorkerControl(page);

		const cached = await page.evaluate(async () => {
			const names = (await caches.keys()).filter((name) => name.startsWith('svelte-snake-'));
			const cache = await caches.open(names[0] ?? '');
			return {
				caches: names.length,
				files: (await cache.keys()).map((r) => new URL(r.url).pathname)
			};
		});

		expect(cached.caches).toBe(1);
		expect(cached.files.some((path) => path.endsWith('/manifest.webmanifest'))).toBe(true);
		expect(cached.files.some((path) => path.endsWith('/icon-192.png'))).toBe(true);
		expect(
			cached.files.some((path) => path.includes('/_app/immutable/') && path.endsWith('.js'))
		).toBe(true);
		// Hosting files are not worth caching.
		expect(cached.files.some((path) => path.endsWith('robots.txt'))).toBe(false);
	});

	test('the game still loads and plays with no network', async ({ page, context }) => {
		await page.goto('/');
		await waitForServiceWorkerControl(page);

		await context.setOffline(true);
		await page.reload();
		await page.locator('main[data-ready="true"]').waitFor();

		await page.getByRole('button', { name: 'Start', exact: true }).click();
		await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeHidden();
		await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible({ timeout: 10_000 });
	});
});
