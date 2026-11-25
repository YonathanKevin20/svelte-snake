import { describe, expect, it } from 'vitest';
import { enqueueDirection, MAX_QUEUED_TURNS } from './input-queue';
import { step } from './step';
import { running } from './test-utils';

describe('enqueueDirection', () => {
	it('accepts a perpendicular turn', () => {
		expect(enqueueDirection(running(), 'up').queue).toEqual(['up']);
	});

	it('ignores a 180-degree reversal of the applied direction', () => {
		const state = running();
		expect(enqueueDirection(state, 'left')).toBe(state);
	});

	it('ignores a repeat of the current direction', () => {
		const state = running();
		expect(enqueueDirection(state, 'right')).toBe(state);
	});

	it('validates against the last queued turn, not the last applied one', () => {
		const queued = enqueueDirection(running(), 'up');
		expect(enqueueDirection(queued, 'down')).toBe(queued);
	});

	it('lets a quick "up, left" through without killing the snake', () => {
		let state = running();
		state = enqueueDirection(state, 'up');
		state = enqueueDirection(state, 'left');
		expect(state.queue).toEqual(['up', 'left']);
		expect(step(step(state)).status).toBe('running');
	});

	it('caps the queue', () => {
		let state = running();
		state = enqueueDirection(state, 'up');
		state = enqueueDirection(state, 'left');
		expect(state.queue).toHaveLength(MAX_QUEUED_TURNS);
		expect(enqueueDirection(state, 'down')).toBe(state);
	});

	it('ignores input unless the game is running', () => {
		const state = running({ status: 'paused' });
		expect(enqueueDirection(state, 'up')).toBe(state);
	});
});
