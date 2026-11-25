import { pointKey } from './geometry';
import { randomInt } from './rng';
import type { Config, Point } from './types';

export function freeCells(config: Config, snake: readonly Point[]): Point[] {
	const occupied = new Set(snake.map(pointKey));
	const cells: Point[] = [];
	for (let y = 0; y < config.rows; y++) {
		for (let x = 0; x < config.cols; x++) {
			if (!occupied.has(`${x},${y}`)) cells.push({ x, y });
		}
	}
	return cells;
}

/**
 * Picks uniformly from the free cells (never "retry until it does not collide").
 * Returns `food: null` when the board is full.
 */
export function spawnFood(
	config: Config,
	snake: readonly Point[],
	rngState: number
): { food: Point | null; rngState: number } {
	const free = freeCells(config, snake);
	if (free.length === 0) return { food: null, rngState };
	const [index, nextState] = randomInt(rngState, free.length);
	return { food: free[index] ?? null, rngState: nextState };
}
