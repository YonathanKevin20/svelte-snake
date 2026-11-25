import { describe, expect, it } from 'vitest';
import { nextRandom, randomInt } from './rng';

describe('rng', () => {
	it('is deterministic for a given state', () => {
		expect(nextRandom(123)).toEqual(nextRandom(123));
	});

	it('produces values in [0, 1) and advances the state', () => {
		let state = 99;
		for (let i = 0; i < 1000; i++) {
			const [value, next] = nextRandom(state);
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(1);
			expect(next).not.toBe(state);
			state = next;
		}
	});

	it('randomInt stays inside its range', () => {
		let state = 5;
		for (let i = 0; i < 1000; i++) {
			const [value, next] = randomInt(state, 7);
			expect(Number.isInteger(value)).toBe(true);
			expect(value).toBeGreaterThanOrEqual(0);
			expect(value).toBeLessThan(7);
			state = next;
		}
	});
});
