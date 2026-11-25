import { describe, expect, it } from 'vitest';
import { step } from './step';
import { running, SMALL } from './test-utils';

describe('step', () => {
	it('moves one cell in the current direction and the tail follows', () => {
		const next = step(running());
		expect(next.snake).toEqual([
			{ x: 4, y: 2 },
			{ x: 3, y: 2 },
			{ x: 2, y: 2 }
		]);
		expect(next.status).toBe('running');
	});

	it('does nothing unless the game is running', () => {
		for (const status of ['idle', 'paused', 'gameover', 'won'] as const) {
			const state = running({ status });
			expect(step(state)).toBe(state);
		}
	});

	it('applies queued turns one per tick, in order', () => {
		const first = step(running({ queue: ['up', 'left'] }));
		expect(first.direction).toBe('up');
		expect(first.queue).toEqual(['left']);
		expect(first.snake[0]).toEqual({ x: 3, y: 1 });

		const second = step(first);
		expect(second.direction).toBe('left');
		expect(second.queue).toEqual([]);
		expect(second.snake[0]).toEqual({ x: 2, y: 1 });
	});

	it('does not mutate its input', () => {
		const state = running({ queue: ['up'] });
		const snapshot = structuredClone(state);
		step(state);
		expect(state).toEqual(snapshot);
	});

	describe('eating', () => {
		it('grows the snake, scores a point and respawns food on a free cell', () => {
			const state = running({ food: { x: 4, y: 2 } });
			const next = step(state);
			expect(next.snake).toHaveLength(4);
			expect(next.score).toBe(1);
			expect(next.food).not.toBeNull();
			expect(next.food).not.toEqual({ x: 4, y: 2 });
			expect(next.snake).not.toContainEqual(next.food);
		});

		it('wins when the board is full after eating', () => {
			const config = { cols: 3, rows: 1, wrap: false };
			const state = running({
				config,
				snake: [
					{ x: 1, y: 0 },
					{ x: 0, y: 0 }
				],
				food: { x: 2, y: 0 }
			});
			const next = step(state);
			expect(next.status).toBe('won');
			expect(next.food).toBeNull();
			expect(next.snake).toHaveLength(3);
		});
	});

	describe('collisions', () => {
		it('ends the game on a wall', () => {
			const state = running({
				snake: [
					{ x: SMALL.cols - 1, y: 2 },
					{ x: SMALL.cols - 2, y: 2 }
				]
			});
			expect(step(state).status).toBe('gameover');
		});

		it('wraps around the edges when wrap is on', () => {
			const state = running({
				config: { ...SMALL, wrap: true },
				snake: [
					{ x: SMALL.cols - 1, y: 2 },
					{ x: SMALL.cols - 2, y: 2 }
				]
			});
			const next = step(state);
			expect(next.status).toBe('running');
			expect(next.snake[0]).toEqual({ x: 0, y: 2 });
		});

		it('ends the game when the head hits the body', () => {
			// Head (2,2) moving up; turning right runs into the body at (3,2).
			const state = running({
				snake: [
					{ x: 2, y: 2 },
					{ x: 2, y: 3 },
					{ x: 3, y: 3 },
					{ x: 3, y: 2 },
					{ x: 3, y: 1 }
				],
				direction: 'up',
				queue: ['right']
			});
			expect(step(state).status).toBe('gameover');
		});

		it('allows moving into the cell the tail is vacating', () => {
			// A 2x2 loop: the head chases the tail at (3,2) and the tail moves away first.
			const state = running({
				snake: [
					{ x: 2, y: 2 },
					{ x: 2, y: 3 },
					{ x: 3, y: 3 },
					{ x: 3, y: 2 }
				],
				direction: 'up',
				queue: ['right']
			});
			const next = step(state);
			expect(next.status).toBe('running');
			expect(next.snake[0]).toEqual({ x: 3, y: 2 });
		});
	});
});
