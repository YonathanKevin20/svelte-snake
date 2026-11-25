import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
	await page.goto('/');
	await page.locator('main[data-ready="true"]').waitFor();
});

/** Runs axe with the WCAG 2.0 to 2.2 A and AA rules plus its best-practice rules. */
async function violations(page: Page) {
	const results = await new AxeBuilder({ page })
		.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
		.analyze();
	// Readable failure output: which rule, how bad, and which elements.
	return results.violations.map((v) => ({
		rule: v.id,
		impact: v.impact,
		help: v.help,
		nodes: v.nodes.map((n) => n.target.join(' ') + ' :: ' + (n.failureSummary ?? '').split('\n')[1])
	}));
}

const start = (page: Page) => page.getByRole('button', { name: 'Start', exact: true });
const dialog = (page: Page) => page.getByRole('dialog', { name: 'Settings' });

test.describe('automated audit (axe, WCAG 2.2 AA)', () => {
	test('start screen', async ({ page }) => {
		expect(await violations(page)).toEqual([]);
	});

	test('while playing', async ({ page }) => {
		await start(page).click();
		await expect(start(page)).toBeHidden();
		expect(await violations(page)).toEqual([]);
	});

	test('paused', async ({ page }) => {
		await start(page).click();
		await page.keyboard.press('Space');
		await expect(page.getByRole('heading', { name: 'Paused' })).toBeVisible();
		expect(await violations(page)).toEqual([]);
	});

	test('game over', async ({ page }) => {
		await start(page).click();
		await expect(page.getByRole('heading', { name: 'Game over' })).toBeVisible({ timeout: 10_000 });
		expect(await violations(page)).toEqual([]);
	});

	test('settings dialog', async ({ page }) => {
		await page.getByRole('button', { name: 'Menu' }).click();
		await expect(dialog(page)).toBeVisible();
		expect(await violations(page)).toEqual([]);
	});

	test('muted', async ({ page }) => {
		await page.keyboard.press('m');
		await expect(page.locator('.hud').getByText('Mute')).toBeVisible();
		expect(await violations(page)).toEqual([]);
	});
});

test.describe('keyboard', () => {
	test('Tab visits every control once, in reading order', async ({ page }) => {
		const focused = () =>
			page.evaluate(() => {
				const el = document.activeElement as HTMLElement | null;
				return el?.getAttribute('aria-label') ?? el?.textContent?.trim() ?? '';
			});

		const order: string[] = [];
		for (let i = 0; i < 7; i++) {
			await page.keyboard.press('Tab');
			order.push(await focused());
		}
		// The overlay's Start button comes first, then the keypad as laid out on screen.
		expect(order).toEqual([
			'Start',
			'Menu',
			'2, Up',
			'4, Left',
			'5, Start, pause or resume',
			'6, Right',
			'8, Down'
		]);
	});

	test('the focused control has a visible, two-tone focus ring', async ({ page }) => {
		await page.keyboard.press('Tab');
		const ring = await page.evaluate(() => {
			const style = getComputedStyle(document.activeElement as Element);
			return { outline: style.outlineStyle, width: style.outlineWidth, shadow: style.boxShadow };
		});
		expect(ring.outline).toBe('solid');
		expect(parseFloat(ring.width)).toBeGreaterThanOrEqual(3);
		expect(ring.shadow).not.toBe('none');
	});
});

test.describe('screen readers', () => {
	const status = (page: Page) => page.locator('.sr-only[role="status"]');

	test('has one level-one heading and named landmarks', async ({ page }) => {
		await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
		await expect(page.getByRole('main')).toHaveCount(1);
		await expect(page.getByRole('group', { name: 'Keypad' })).toBeVisible();
		await expect(page.getByRole('img', { name: /Game board/ })).toBeVisible();
	});

	test('announces starting, pausing, resuming and the final score', async ({ page }) => {
		await start(page).click();
		await expect(status(page)).toHaveText('Game started');

		await page.keyboard.press('Space');
		await expect(status(page)).toHaveText('Paused');

		await page.keyboard.press('Enter');
		await expect(status(page)).toHaveText('Resumed');

		await expect(status(page)).toHaveText(/^Game over\. Score \d+$/, { timeout: 10_000 });
	});

	test('announces muting and unmuting', async ({ page }) => {
		await page.keyboard.press('m');
		await expect(status(page)).toHaveText('Sound off');
		await page.keyboard.press('m');
		await expect(status(page)).toHaveText('Sound on');
	});

	test('says how to play when the start button is focused', async ({ page }) => {
		const description = await start(page).getAttribute('aria-describedby');
		expect(description).toBeTruthy();
		await expect(page.locator(`#${description}`)).toContainText('swipe');
	});
});

test.describe('visual accessibility', () => {
	test('nothing blinks or animates on its own', async ({ page }) => {
		await start(page).click();
		await page.waitForTimeout(500);
		const running = await page.evaluate(() => document.getAnimations().length);
		expect(running).toBe(0);
	});

	test('every control is at least 24 by 24 CSS pixels (WCAG 2.5.8)', async ({ page }) => {
		await page.getByRole('button', { name: 'Menu' }).click();
		await expect(dialog(page)).toBeVisible();
		const targets = page.locator(
			'button:visible, .segment:visible, input[type="checkbox"]:visible'
		);
		const count = await targets.count();
		expect(count).toBeGreaterThan(5);
		for (let i = 0; i < count; i++) {
			const box = await targets.nth(i).boundingBox();
			const name = await targets.nth(i).evaluate((el) => el.textContent?.trim() || el.className);
			expect(box?.width, `${name} width`).toBeGreaterThanOrEqual(24);
			expect(box?.height, `${name} height`).toBeGreaterThanOrEqual(24);
		}
	});

	test('the game board stays visible in forced-colors (high contrast) mode', async ({ page }) => {
		await page.emulateMedia({ forcedColors: 'active' });
		await start(page).click();
		await expect(start(page)).toBeHidden();

		const colours = await page.evaluate(() => {
			const pixel = (selector: string) => {
				const el = document.querySelector(selector) as Element;
				return getComputedStyle(el, '::before').backgroundColor;
			};
			return { snake: pixel('.cell.snake'), ghost: pixel('.cell.empty') };
		});
		// Lit pixels and unlit ones must still be told apart without the LCD palette.
		expect(colours.snake).not.toBe(colours.ghost);

		// The little arrows on the keypad are drawn with a background too, so check they survive.
		const keys = await page.evaluate(() => ({
			key: getComputedStyle(document.querySelector('.key-up') as Element).backgroundColor,
			arrow: getComputedStyle(document.querySelector('.key-up .arrow') as Element).backgroundColor
		}));
		expect(keys.arrow).not.toBe(keys.key);
	});

	test.describe('small screens', () => {
		test.use({ viewport: { width: 320, height: 568 } });

		test('reflows at 320px with no horizontal scrolling (WCAG 1.4.10)', async ({ page }) => {
			const overflow = () =>
				page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
			expect(await overflow()).toBeLessThanOrEqual(0);

			await page.getByRole('button', { name: 'Menu' }).click();
			await expect(dialog(page)).toBeVisible();
			expect(await overflow()).toBeLessThanOrEqual(0);
		});
	});
});
