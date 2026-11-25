import { expect, test, type Page } from '@playwright/test';

type Counted = { __beeps: number; __contexts: number };

// A stand-in for AudioContext that counts what the game schedules, so the tests can tell
// whether sound was requested without needing real audio hardware.
test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		const counters = window as unknown as Counted;
		counters.__beeps = 0;
		counters.__contexts = 0;

		class FakeAudioContext {
			currentTime = 0;
			destination = {};
			state = 'running';
			constructor() {
				counters.__contexts++;
			}
			resume() {
				return Promise.resolve();
			}
			createGain() {
				return {
					gain: { setValueAtTime() {}, linearRampToValueAtTime() {} },
					connect() {},
					disconnect() {}
				};
			}
			createOscillator() {
				counters.__beeps++;
				return {
					type: '',
					frequency: { value: 0 },
					connect() {},
					disconnect() {},
					start() {},
					stop() {},
					onended: null
				};
			}
		}
		Object.assign(window, { AudioContext: FakeAudioContext });
	});
	await page.goto('/');
	await page.locator('main[data-ready="true"]').waitFor();
});

const beeps = (page: Page) => page.evaluate(() => (window as unknown as Counted).__beeps);
const contexts = (page: Page) => page.evaluate(() => (window as unknown as Counted).__contexts);
const start = (page: Page) => page.getByRole('button', { name: 'Start', exact: true });
const muteTag = (page: Page) => page.locator('.hud').getByText('Mute');

test('makes no audio context before the player does anything', async ({ page }) => {
	await page.waitForTimeout(300);
	expect(await contexts(page)).toBe(0);
	expect(await beeps(page)).toBe(0);
});

test('beeps when the game starts', async ({ page }) => {
	await start(page).click();
	await expect.poll(() => beeps(page)).toBeGreaterThan(0);
});

test('M mutes and unmutes, with a visible tag', async ({ page }) => {
	await expect(muteTag(page)).toBeHidden();
	await page.keyboard.press('m');
	await expect(muteTag(page)).toBeVisible();

	await start(page).click();
	await page.keyboard.press('Space'); // pause: would beep if sound were on
	await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
	expect(await beeps(page)).toBe(0);

	await page.keyboard.press('m');
	await expect(muteTag(page)).toBeHidden();
	await page.keyboard.press('Enter'); // resume: beeps again
	await expect.poll(() => beeps(page)).toBeGreaterThan(0);
});

test('the sound setting is in the dialog and survives a reload', async ({ page }) => {
	await page.getByRole('button', { name: 'Menu' }).click();
	const dialog = page.getByRole('dialog', { name: 'Settings' });
	const checkbox = dialog.getByRole('checkbox', { name: 'Sound effects' });
	await expect(checkbox).toBeChecked();
	await checkbox.uncheck();
	await expect(muteTag(page)).toBeVisible();
	await dialog.getByRole('button', { name: 'Close' }).click();

	await page.reload();
	await page.locator('main[data-ready="true"]').waitFor();
	await expect(muteTag(page)).toBeVisible();
	await start(page).click();
	await page.waitForTimeout(300);
	expect(await beeps(page)).toBe(0);
});

test('plays the game-over sound when the snake crashes', async ({ page }) => {
	await start(page).click();
	await expect.poll(() => beeps(page)).toBeGreaterThan(0);
	const before = await beeps(page);

	await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible({ timeout: 10_000 });
	// The game-over jingle has four notes.
	await expect.poll(() => beeps(page)).toBeGreaterThanOrEqual(before + 4);
});
