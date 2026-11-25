import { describe, expect, it } from 'vitest';
import { effectDurationMs, EFFECTS, type SoundEffect } from './effects';

const names = Object.keys(EFFECTS) as SoundEffect[];

describe('EFFECTS', () => {
	it.each(names)('%s has audible, well-formed notes', (name) => {
		expect(EFFECTS[name].length).toBeGreaterThan(0);
		for (const note of EFFECTS[name]) {
			expect(note.frequency).toBeGreaterThan(20);
			expect(note.frequency).toBeLessThan(20_000);
			expect(note.durationMs).toBeGreaterThan(0);
		}
	});

	it('keeps the frequent effects short so they never get in the way', () => {
		expect(effectDurationMs('eat')).toBeLessThan(200);
		expect(effectDurationMs('start')).toBeLessThan(250);
		expect(effectDurationMs('pause')).toBeLessThan(250);
	});

	it('plays the longer jingles for the end of a game', () => {
		expect(effectDurationMs('gameover')).toBeGreaterThan(effectDurationMs('eat'));
		expect(effectDurationMs('win')).toBeGreaterThan(effectDurationMs('eat'));
	});
});
