import { describe, expect, it } from 'vitest';
import type { GameState, Status } from '../engine';
import { running } from '../engine/test-utils';
import {
	deriveEvent,
	describeEvent,
	EAT_ANNOUNCE_GAP_MS,
	shouldAnnounce,
	type GameEvent
} from './events';

const as = (status: Status, overrides: Partial<GameState> = {}) =>
	running({ status, ...overrides });

describe('deriveEvent', () => {
	it('is quiet when nothing changed or the snake just moved', () => {
		const state = as('running');
		expect(deriveEvent(state, state)).toBeNull();
		expect(deriveEvent(state, as('running', { score: 0 }))).toBeNull();
	});

	it('reports eating when the score goes up mid-game', () => {
		expect(deriveEvent(as('running', { score: 3 }), as('running', { score: 4 }))).toBe('eat');
	});

	it('reports a start from idle and when playing again', () => {
		expect(deriveEvent(as('idle'), as('running'))).toBe('start');
		expect(deriveEvent(as('gameover', { score: 9 }), as('running', { score: 0 }))).toBe('start');
		expect(deriveEvent(as('won', { score: 9 }), as('running', { score: 0 }))).toBe('start');
	});

	it('reports resuming from a pause separately from a fresh start', () => {
		expect(deriveEvent(as('paused'), as('running'))).toBe('resume');
	});

	it('reports pausing', () => {
		expect(deriveEvent(as('running'), as('paused'))).toBe('pause');
	});

	it('reports game over', () => {
		expect(deriveEvent(as('running'), as('gameover'))).toBe('gameover');
	});

	it('reports a win, even when the winning move also ate food', () => {
		expect(deriveEvent(as('running', { score: 3 }), as('won', { score: 4 }))).toBe('win');
	});

	it('does not repeat an ending, and ignores idle', () => {
		expect(deriveEvent(as('gameover'), as('gameover', { score: 1 }))).toBeNull();
		expect(deriveEvent(as('running'), as('idle'))).toBeNull();
	});
});

describe('describeEvent', () => {
	it('gives every event a distinct, spoken description', () => {
		const events: GameEvent[] = ['start', 'resume', 'pause', 'eat', 'gameover', 'win'];
		const spoken = events.map((event) => describeEvent(event, 7));
		expect(new Set(spoken).size).toBe(events.length);
		expect(spoken.every((text) => text.length > 0)).toBe(true);
	});

	it('includes the score where it matters', () => {
		expect(describeEvent('eat', 7)).toContain('7');
		expect(describeEvent('gameover', 12)).toContain('12');
		expect(describeEvent('win', 300)).toContain('300');
	});
});

describe('shouldAnnounce', () => {
	it('always announces anything but eating', () => {
		for (const event of ['start', 'resume', 'pause', 'gameover', 'win'] as const) {
			expect(shouldAnnounce(event, 0, 0)).toBe(true);
		}
	});

	it('rate-limits score updates', () => {
		expect(shouldAnnounce('eat', 1000, 0)).toBe(false);
		expect(shouldAnnounce('eat', EAT_ANNOUNCE_GAP_MS, 0)).toBe(true);
		expect(shouldAnnounce('eat', 10_000, 9_900)).toBe(false);
	});

	it('speaks the first score update of a session', () => {
		expect(shouldAnnounce('eat', 500, Number.NEGATIVE_INFINITY)).toBe(true);
	});
});
