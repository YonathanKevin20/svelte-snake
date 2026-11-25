import { describe, expect, it } from 'vitest';
import { EFFECTS } from './effects';
import { createSoundPlayer, type AudioContextLike } from './sound';

interface Recorded {
	frequency: number;
	type: string;
	start: number;
	stop: number;
}

function fakeContext(state = 'running') {
	const oscillators: Recorded[] = [];
	const ctx = {
		currentTime: 2,
		destination: {},
		state,
		resumeCalls: 0,
		resume() {
			this.resumeCalls++;
			this.state = 'running';
			return Promise.resolve();
		},
		createGain() {
			return {
				gain: { setValueAtTime: () => undefined, linearRampToValueAtTime: () => undefined },
				connect: () => undefined,
				disconnect: () => undefined
			};
		},
		createOscillator() {
			const record: Recorded = { frequency: 0, type: '', start: -1, stop: -1 };
			oscillators.push(record);
			return {
				set type(value: string) {
					record.type = value;
				},
				get type() {
					return record.type;
				},
				frequency: {
					set value(v: number) {
						record.frequency = v;
					},
					get value() {
						return record.frequency;
					}
				},
				connect: () => undefined,
				disconnect: () => undefined,
				start: (when: number) => void (record.start = when),
				stop: (when: number) => void (record.stop = when),
				onended: null
			};
		}
	};
	return { ctx: ctx as AudioContextLike & { resumeCalls: number }, oscillators };
}

describe('createSoundPlayer', () => {
	it('creates no audio context until sound is first needed', () => {
		let created = 0;
		createSoundPlayer(() => {
			created++;
			return fakeContext().ctx;
		});
		expect(created).toBe(0);
	});

	it('plays nothing, and never touches audio, while disabled', () => {
		let created = 0;
		const player = createSoundPlayer(() => {
			created++;
			return fakeContext().ctx;
		});
		player.enabled = false;
		player.play('eat');
		expect(created).toBe(0);
	});

	it('schedules one square-wave note after another', () => {
		const { ctx, oscillators } = fakeContext();
		createSoundPlayer(() => ctx).play('eat');

		expect(oscillators.map((o) => o.frequency)).toEqual(EFFECTS.eat.map((n) => n.frequency));
		expect(oscillators.every((o) => o.type === 'square')).toBe(true);

		const [first, second] = oscillators;
		expect(first?.start).toBeGreaterThan(2);
		expect(second?.start).toBeCloseTo((first?.start ?? 0) + 0.045, 5);
		expect(first?.stop).toBeGreaterThan(first?.start ?? 0);
	});

	it('reuses a single context for every effect', () => {
		let created = 0;
		const { ctx } = fakeContext();
		const player = createSoundPlayer(() => {
			created++;
			return ctx;
		});
		player.play('eat');
		player.play('gameover');
		expect(created).toBe(1);
	});

	it('resumes a suspended context', () => {
		const { ctx } = fakeContext('suspended');
		createSoundPlayer(() => ctx).play('start');
		expect(ctx.resumeCalls).toBe(1);
	});

	it('unlock creates and resumes the context without playing anything', () => {
		const { ctx, oscillators } = fakeContext('suspended');
		createSoundPlayer(() => ctx).unlock();
		expect(ctx.resumeCalls).toBe(1);
		expect(oscillators).toHaveLength(0);
	});

	it('does nothing when Web Audio is unavailable', () => {
		const player = createSoundPlayer(() => null);
		expect(() => player.play('win')).not.toThrow();
		expect(() => player.unlock()).not.toThrow();
	});

	it('survives a context that fails to construct, and does not keep retrying', () => {
		let attempts = 0;
		const player = createSoundPlayer(() => {
			attempts++;
			throw new Error('blocked');
		});
		expect(() => player.play('eat')).not.toThrow();
		player.play('eat');
		expect(attempts).toBe(1);
	});

	it('picks up the enabled flag at play time', () => {
		const { ctx, oscillators } = fakeContext();
		const player = createSoundPlayer(() => ctx);
		player.enabled = false;
		player.play('pause');
		expect(oscillators).toHaveLength(0);
		player.enabled = true;
		player.play('pause');
		expect(oscillators).toHaveLength(EFFECTS.pause.length);
	});
});
