import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	// Key presses and clicks before hydration would be lost, so wait until the page is interactive.
	await page.locator('main[data-ready="true"]').waitFor();
});

test('plays a round: start, crash into the wall, play again', async ({ page }) => {
	await page.getByRole('button', { name: 'Start', exact: true }).click();
	await expect(page.getByRole('button', { name: 'Start', exact: true })).toBeHidden();

	// The snake starts heading right, so it reaches the wall within a few seconds.
	await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible({ timeout: 10_000 });

	await page.getByRole('button', { name: 'Play again' }).click();
	await expect(page.getByRole('heading', { name: 'Game over' })).toBeHidden();
});

test('pauses and resumes from the keyboard', async ({ page }) => {
	await page.keyboard.press('Enter');
	await page.keyboard.press('Space');
	await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();

	await page.keyboard.press('Enter');
	await expect(page.getByRole('heading', { name: 'Paused' })).toBeHidden();
});
