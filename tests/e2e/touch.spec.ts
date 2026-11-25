import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.locator('main[data-ready="true"]').waitFor();
});

// `data-direction` on the playfield mirrors the engine's last applied direction.
const playfield = (page: import('@playwright/test').Page) => page.locator('.playfield');

test('steers with the on-screen keypad', async ({ page }) => {
	await page.getByRole('button', { name: 'Start', exact: true }).click();
	await expect(playfield(page)).toHaveAttribute('data-direction', 'right');

	await page.getByRole('button', { name: '2, Up', exact: true }).click();
	await expect(playfield(page)).toHaveAttribute('data-direction', 'up');
});

test('the keypad center key starts and pauses the game', async ({ page }) => {
	const center = page.getByRole('button', { name: '5, Start, pause or resume' });
	await center.click();
	await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeHidden();

	await center.click();
	await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
});

test('steers with a swipe on the board', async ({ page }) => {
	await page.getByRole('button', { name: 'Start', exact: true }).click();
	await expect(playfield(page)).toHaveAttribute('data-direction', 'right');

	const box = await playfield(page).boundingBox();
	if (!box) throw new Error('playfield not found');
	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;

	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x, y - 80, { steps: 8 });
	await page.mouse.up();

	await expect(playfield(page)).toHaveAttribute('data-direction', 'up');
});

test('a swipe on the start screen starts the game', async ({ page }) => {
	const box = await playfield(page).boundingBox();
	if (!box) throw new Error('playfield not found');
	const x = box.x + box.width / 2;
	const y = box.y + box.height / 2;

	await page.mouse.move(x, y);
	await page.mouse.down();
	await page.mouse.move(x, y + 80, { steps: 8 });
	await page.mouse.up();

	await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeHidden();
	await expect(playfield(page)).toHaveAttribute('data-direction', 'down');
});
