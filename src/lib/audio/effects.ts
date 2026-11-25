export type SoundEffect = 'eat' | 'gameover' | 'win' | 'start' | 'pause';

export interface Note {
	/** In hertz. */
	readonly frequency: number;
	readonly durationMs: number;
}

/** Short square-wave jingles, as data: easy to tweak and to test without any audio. */
export const EFFECTS: Readonly<Record<SoundEffect, readonly Note[]>> = {
	eat: [
		{ frequency: 880, durationMs: 45 },
		{ frequency: 1320, durationMs: 65 }
	],
	start: [
		{ frequency: 660, durationMs: 60 },
		{ frequency: 880, durationMs: 80 }
	],
	pause: [{ frequency: 440, durationMs: 80 }],
	gameover: [
		{ frequency: 440, durationMs: 120 },
		{ frequency: 370, durationMs: 120 },
		{ frequency: 311, durationMs: 120 },
		{ frequency: 262, durationMs: 260 }
	],
	win: [
		{ frequency: 523, durationMs: 100 },
		{ frequency: 659, durationMs: 100 },
		{ frequency: 784, durationMs: 100 },
		{ frequency: 1047, durationMs: 220 }
	]
};

export function effectDurationMs(effect: SoundEffect): number {
	return EFFECTS[effect].reduce((total, note) => total + note.durationMs, 0);
}
