// Records a short gameplay GIF for the README (docs/demo.gif).
//
// How: Playwright drives the built game with a fake clock, so every frame is exactly 100 ms
// apart and the recording is identical on every run. A random seed is pinned, and a tiny
// auto-player steers the snake toward the food (breadth-first search around its own body).
// ffmpeg turns the screenshots into a GIF.
//
// Usage (needs ffmpeg on the PATH):
//   pnpm build && pnpm preview --port 4173      # in one terminal
//   pnpm demo                                    # in another
// Environment: DEMO_URL, DEMO_SEED, DEMO_TARGET_SCORE, DEMO_OUT, DEMO_WIDTH, CHROME_PATH,
// and DEMO_FRAMES_DIR (keep the PNG frames there instead of deleting them, for debugging).
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.env.DEMO_URL ?? 'http://localhost:4173/';
const SEED = Number(process.env.DEMO_SEED ?? 7);
const TARGET_SCORE = Number(process.env.DEMO_TARGET_SCORE ?? 5);
const OUT = process.env.DEMO_OUT ?? 'docs/demo.gif';
const WIDTH = Number(process.env.DEMO_WIDTH ?? 480); // output width in pixels
const FRAME_MS = 100;
const PADDING = 24; // CSS pixels of dark margin around the phone
const INTRO_FRAMES = 12; // linger on the start screen
const OUTRO_FRAMES = 12; // linger on the final frame
const MAX_PLAY_FRAMES = 200;
const COLS = 20;
const ROWS = 15;

const KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };
const STEPS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** Breadth-first search from the head to the food, never entering the body. */
function nextDirection(head, food, snake, current) {
	const body = new Set(snake.slice(0, -1).map(([x, y]) => `${x},${y}`)); // the tail moves away
	const inside = (x, y) => x >= 0 && x < COLS && y >= 0 && y < ROWS;
	const reverse = { up: 'down', down: 'up', left: 'right', right: 'left' }[current];

	const queue = [[head[0], head[1], null]];
	const seen = new Set([`${head[0]},${head[1]}`]);
	while (queue.length) {
		const [x, y, first] = queue.shift();
		if (food && x === food[0] && y === food[1]) return first ?? current;
		for (const [dir, [dx, dy]] of Object.entries(STEPS)) {
			if (first === null && dir === reverse) continue;
			const nx = x + dx;
			const ny = y + dy;
			const key = `${nx},${ny}`;
			if (!inside(nx, ny) || body.has(key) || seen.has(key)) continue;
			seen.add(key);
			queue.push([nx, ny, first ?? dir]);
		}
	}
	// No route to the food: just stay alive for now.
	for (const dir of [current, ...Object.keys(STEPS)]) {
		if (dir === reverse) continue;
		const [dx, dy] = STEPS[dir];
		const nx = head[0] + dx;
		const ny = head[1] + dy;
		if (inside(nx, ny) && !body.has(`${nx},${ny}`)) return dir;
	}
	return current;
}

const keepFrames = Boolean(process.env.DEMO_FRAMES_DIR);
const framesDir = keepFrames
	? process.env.DEMO_FRAMES_DIR
	: mkdtempSync(join(tmpdir(), 'svelte-snake-frames-'));
mkdirSync(framesDir, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined });
try {
	const context = await browser.newContext({
		viewport: { width: 400, height: 860 },
		deviceScaleFactor: 2
	});
	const page = await context.newPage();

	// Same game every run: pin the seed the game draws from crypto.getRandomValues.
	await page.addInitScript((seed) => {
		Object.defineProperty(crypto, 'getRandomValues', {
			value: (array) => {
				array[0] = seed;
				return array;
			}
		});
	}, SEED);

	await page.clock.install();
	await page.goto(URL_);
	await page.locator('main[data-ready="true"]').waitFor();
	// From here on, time only moves when we say so.
	const now = await page.evaluate(() => Date.now());
	await page.clock.pauseAt(now + 1000);

	// The phone plus a margin of the page's dark background, so it reads as a card on any README.
	const box = await page.locator('.phone').boundingBox();
	if (!box) throw new Error('phone not found');
	const clip = {
		x: Math.max(0, box.x - PADDING),
		y: Math.max(0, box.y - PADDING),
		width: box.width + PADDING * 2,
		height: box.height + PADDING * 2
	};
	let frame = 0;
	const snap = async () => {
		await page.clock.runFor(FRAME_MS);
		await page.screenshot({
			path: join(framesDir, `${String(frame++).padStart(4, '0')}.png`),
			clip
		});
	};
	const readBoard = () =>
		page.evaluate(() => {
			const cells = [...document.querySelectorAll('.board .cell')];
			const at = (cls) => cells.flatMap((cell, i) => (cell.classList.contains(cls) ? [i] : []));
			const score = Number(document.querySelector('.hud span')?.textContent?.match(/\d+/)?.[0]);
			return {
				snake: at('snake'),
				food: at('food')[0] ?? null,
				score,
				over: Boolean(document.querySelector('h2')?.textContent?.match(/over|win/i))
			};
		});
	const toXY = (i) => [i % COLS, Math.floor(i / COLS)];

	for (let i = 0; i < INTRO_FRAMES; i++) await snap();

	// The start screen has the snake lying in a row, heading right: its head is the right end.
	let board = await readBoard();
	let head = board.snake.map(toXY).sort((a, b) => b[0] - a[0])[0];
	let previous = new Set(board.snake);
	let direction = 'right';

	await page.keyboard.press('Enter');

	for (let i = 0; i < MAX_PLAY_FRAMES; i++) {
		board = await readBoard();
		if (board.over || board.score >= TARGET_SCORE) break;

		// The head is the one cell that was not part of the snake a moment ago.
		const added = board.snake.filter((cell) => !previous.has(cell));
		if (added.length === 1) head = toXY(added[0]);
		previous = new Set(board.snake);

		const food = board.food === null ? null : toXY(board.food);
		const wanted = nextDirection(head, food, board.snake.map(toXY), direction);
		if (wanted !== direction) {
			await page.keyboard.press(KEYS[wanted]);
			direction = wanted;
		}
		await snap();
	}
	for (let i = 0; i < OUTRO_FRAMES; i++) await snap();

	console.log(`Captured ${frame} frames (score ${board.score}).`);

	mkdirSync(join(OUT, '..'), { recursive: true });
	// One shared 64-colour palette keeps the GIF small and the flat LCD colours exact. (Transparent
	// corners were tried: GIF's on/off transparency defeats frame diffing and made it 60x larger.)
	execFileSync(
		'ffmpeg',
		[
			'-y',
			'-loglevel',
			'error',
			'-framerate',
			String(1000 / FRAME_MS),
			'-i',
			join(framesDir, '%04d.png'),
			'-vf',
			`scale=${WIDTH}:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=full[p];[b][p]paletteuse=dither=none:diff_mode=rectangle`,
			'-loop',
			'0',
			OUT
		],
		{ stdio: 'inherit' }
	);
	console.log(`Wrote ${OUT}`);
} finally {
	await browser.close();
	if (!keepFrames) rmSync(framesDir, { recursive: true, force: true });
}
