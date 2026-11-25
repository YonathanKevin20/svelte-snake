import { describe, expect, it } from 'vitest';
import { enqueueDirection } from './input-queue';
import { createGame, DEFAULT_CONFIG, INITIAL_LENGTH, start, togglePause } from './state';
import { step } from './step';
import type { Direction } from './types';

describe('createGame', () => {
	it('starts idle with a centered snake and food on a free cell', () => {
		const game = createGame(DEFAULT_CONFIG, 1);
		expect(game.status).toBe('idle');
		expect(game.snake).toHaveLength(INITIAL_LENGTH);
		expect(game.food).not.toBeNull();
		expect(game.snake).not.toContainEqual(game.food);
		for (const { x, y } of game.snake) {
			expect(x).toBeGreaterThanOrEqual(0);
			expect(x).toBeLessThan(DEFAULT_CONFIG.cols);
			expect(y).toBeGreaterThanOrEqual(0);
			expect(y).toBeLessThan(DEFAULT_CONFIG.rows);
		}
	});

	it('is fully determined by its seed', () => {
		expect(createGame(DEFAULT_CONFIG, 7)).toEqual(createGame(DEFAULT_CONFIG, 7));
	});

	it('rejects boards that are too small', () => {
		expect(() => createGame({ cols: 3, rows: 3, wrap: false }, 1)).toThrow(RangeError);
	});

	it('is JSON-serializable', () => {
		const game = createGame(DEFAULT_CONFIG, 1);
		expect(JSON.parse(JSON.stringify(game))).toEqual(game);
	});
});

describe('start and togglePause', () => {
	it('starts only from idle', () => {
		const idle = createGame();
		expect(start(idle).status).toBe('running');
		const done = { ...idle, status: 'gameover' as const };
		expect(start(done)).toBe(done);
	});

	it('toggles between running and paused only', () => {
		const running = start(createGame());
		const paused = togglePause(running);
		expect(paused.status).toBe('paused');
		expect(togglePause(paused).status).toBe('running');
		const idle = createGame();
		expect(togglePause(idle)).toBe(idle);
	});
});

describe('determinism', () => {
	// An input log of [tick, direction]. Replaying it must always give the same game.
	const log: ReadonlyArray<readonly [number, Direction]> = [
		[2, 'up'],
		[5, 'right'],
		[9, 'down'],
		[12, 'left'],
		[16, 'up']
	];

	function replay(seed: number) {
		let state = start(createGame(DEFAULT_CONFIG, seed));
		for (let tick = 0; tick < 40 && state.status === 'running'; tick++) {
			for (const [at, direction] of log) {
				if (at === tick) state = enqueueDirection(state, direction);
			}
			state = step(state);
		}
		return state;
	}

	it('replays the same seed and inputs to the same final state', () => {
		expect(replay(2024)).toEqual(replay(2024));
	});

	it('plays out differently for different seeds', () => {
		expect(replay(1).food).not.toEqual(replay(2).food);
	});
});
