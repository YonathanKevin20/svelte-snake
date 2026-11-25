import { describe, expect, it } from 'vitest';
import {
	DEFAULT_SPEED,
	isSpeed,
	SPEED_PROFILES,
	SPEEDS,
	tickIntervalMs,
	type Speed
} from './speed';

describe('tickIntervalMs', () => {
	it('defaults to the normal speed', () => {
		expect(tickIntervalMs(7)).toBe(tickIntervalMs(7, DEFAULT_SPEED));
	});

	it.each(SPEEDS)('%s starts at its base interval', (speed: Speed) => {
		expect(tickIntervalMs(0, speed)).toBe(SPEED_PROFILES[speed].baseMs);
	});

	it.each(SPEEDS)('%s never gets slower as the score rises', (speed: Speed) => {
		for (let score = 0; score < 200; score++) {
			expect(tickIntervalMs(score + 1, speed)).toBeLessThanOrEqual(tickIntervalMs(score, speed));
		}
	});

	it.each(SPEEDS)('%s has a floor', (speed: Speed) => {
		expect(tickIntervalMs(10_000, speed)).toBe(SPEED_PROFILES[speed].minMs);
	});

	it('orders the settings slow > normal > fast at every score', () => {
		for (const score of [0, 5, 20, 60, 500]) {
			expect(tickIntervalMs(score, 'slow')).toBeGreaterThan(tickIntervalMs(score, 'normal'));
			expect(tickIntervalMs(score, 'normal')).toBeGreaterThan(tickIntervalMs(score, 'fast'));
		}
	});
});

describe('isSpeed', () => {
	it('accepts only known settings', () => {
		expect(isSpeed('fast')).toBe(true);
		expect(isSpeed('turbo')).toBe(false);
		expect(isSpeed(3)).toBe(false);
		expect(isSpeed(undefined)).toBe(false);
	});
});
