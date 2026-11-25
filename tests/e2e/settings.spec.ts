import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.locator('main[data-ready="true"]').waitFor();
});

const dialog = (page: Page) => page.getByRole('dialog', { name: 'Settings' });
const openMenu = (page: Page) => page.getByRole('button', { name: 'Menu' }).click();
const closeMenu = (page: Page) => dialog(page).getByRole('button', { name: 'Close' }).click();
const start = (page: Page) => page.getByRole('button', { name: 'Start', exact: true });

test('opens from the Menu key and from Escape', async ({ page }) => {
	await openMenu(page);
	await expect(dialog(page)).toBeVisible();
	await closeMenu(page);
	await expect(dialog(page)).toBeHidden();

	await page.keyboard.press('Escape');
	await expect(dialog(page)).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(dialog(page)).toBeHidden();
});

test('saves speed and wrap settings across reloads', async ({ page }) => {
	await openMenu(page);
	await expect(dialog(page).getByRole('radio', { name: 'Normal' })).toBeChecked();
	await dialog(page).getByText('Fast', { exact: true }).click();
	await dialog(page).getByRole('checkbox', { name: 'Wrap around the edges' }).check();
	await closeMenu(page);

	await page.reload();
	await page.locator('main[data-ready="true"]').waitFor();
	await openMenu(page);
	await expect(dialog(page).getByRole('radio', { name: 'Fast' })).toBeChecked();
	await expect(dialog(page).getByRole('checkbox', { name: 'Wrap around the edges' })).toBeChecked();
});

test('opening the menu pauses a running game', async ({ page }) => {
	await start(page).click();
	await expect(start(page)).toBeHidden();

	await openMenu(page);
	await expect(dialog(page)).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
});

test('keys inside the dialog do not steer or start the game', async ({ page }) => {
	await openMenu(page);
	await page.keyboard.press('ArrowRight');
	await page.keyboard.press('Enter');
	await page.keyboard.press('Escape');
	await expect(dialog(page)).toBeHidden();
	await expect(start(page)).toBeVisible();
});

test('a wall change mid-game waits for the next game', async ({ page }) => {
	await start(page).click();
	await openMenu(page);
	await expect(dialog(page).getByText('This applies from your next game.')).toBeHidden();
	await dialog(page).getByRole('checkbox', { name: 'Wrap around the edges' }).check();
	await expect(dialog(page).getByText('This applies from your next game.')).toBeVisible();
});

test('with wrap on, the snake passes through the wall', async ({ page }) => {
	await openMenu(page);
	await dialog(page).getByText('Fast', { exact: true }).click();
	await dialog(page).getByRole('checkbox', { name: 'Wrap around the edges' }).check();
	await closeMenu(page);

	await start(page).click();
	// Heading right at fast speed, the snake reaches the wall in about 1.5 seconds.
	await page.waitForTimeout(3500);
	await expect(page.getByRole('heading', { name: 'Game over' })).toBeHidden();
	await expect(start(page)).toBeHidden();
});
