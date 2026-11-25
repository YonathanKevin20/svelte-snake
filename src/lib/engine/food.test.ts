import { describe, expect, it } from 'vitest';
import { freeCells, spawnFood } from './food';
import { SMALL } from './test-utils';

describe('food', () => {
	it('lists every cell that is not part of the snake', () => {
		const snake = [
			{ x: 0, y: 0 },
			{ x: 1, y: 0 }
		];
		const free = freeCells(SMALL, snake);
		expect(free).toHaveLength(SMALL.cols * SMALL.rows - 2);
		expect(free).not.toContainEqual({ x: 0, y: 0 });
	});

	it('spawns only on the single free cell when the board is nearly full', () => {
		const config = { cols: 3, rows: 1, wrap: false };
		const snake = [
			{ x: 0, y: 0 },
			{ x: 1, y: 0 }
		];
		expect(spawnFood(config, snake, 7).food).toEqual({ x: 2, y: 0 });
	});

	it('returns no food when the board is full', () => {
		const config = { cols: 2, rows: 1, wrap: false };
		const snake = [
			{ x: 0, y: 0 },
			{ x: 1, y: 0 }
		];
		expect(spawnFood(config, snake, 7).food).toBeNull();
	});

	it('never lands on the snake across many seeds', () => {
		const snake = [
			{ x: 3, y: 2 },
			{ x: 2, y: 2 },
			{ x: 1, y: 2 }
		];
		for (let seed = 0; seed < 200; seed++) {
			expect(snake).not.toContainEqual(spawnFood(SMALL, snake, seed).food);
		}
	});
});
