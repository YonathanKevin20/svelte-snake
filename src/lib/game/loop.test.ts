import { describe, expect, it } from 'vitest';
import { Accumulator, MAX_CATCH_UP_TICKS, startLoop } from './loop';

describe('Accumulator', () => {
	it('emits whole ticks and carries the remainder over', () => {
		const acc = new Accumulator();
		expect(acc.advance(70, 100)).toBe(0);
		expect(acc.advance(70, 100)).toBe(1);
		expect(acc.advance(60, 100)).toBe(1);
	});

	it('does not depend on how the time is sliced into frames', () => {
		const coarse = new Accumulator();
		const fine = new Accumulator();
		const coarseTicks = coarse.advance(450, 100);
		let fineTicks = 0;
		for (let i = 0; i < 45; i++) fineTicks += fine.advance(10, 100);
		expect(coarseTicks).toBe(fineTicks);
	});

	it('caps catch-up after a long pause and drops the backlog', () => {
		const acc = new Accumulator();
		expect(acc.advance(60_000, 100)).toBe(MAX_CATCH_UP_TICKS);
		expect(acc.advance(50, 100)).toBe(0);
	});

	it('ignores negative time', () => {
		expect(new Accumulator().advance(-500, 100)).toBe(0);
	});
});

describe('startLoop', () => {
	it('ticks from an injected clock and stops when told to', () => {
		let time = 0;
		const frames: Array<() => void> = [];
		let ticks = 0;
		const stop = startLoop({
			onTick: () => ticks++,
			getIntervalMs: () => 100,
			now: () => time,
			requestFrame: (callback) => frames.push(callback),
			cancelFrame: () => {}
		});

		time = 250;
		frames.shift()?.();
		expect(ticks).toBe(2);

		stop();
		time = 1000;
		frames.shift()?.();
		expect(ticks).toBe(2);
	});
});
