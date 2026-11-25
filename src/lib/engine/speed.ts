export type Speed = 'slow' | 'normal' | 'fast';

export const SPEEDS: readonly Speed[] = ['slow', 'normal', 'fast'];

export const DEFAULT_SPEED: Speed = 'normal';

/** Tick interval at score 0, and the fastest it can ever get. */
export const SPEED_PROFILES: Readonly<Record<Speed, { baseMs: number; minMs: number }>> = {
	slow: { baseMs: 260, minMs: 110 },
	normal: { baseMs: 200, minMs: 70 },
	fast: { baseMs: 140, minMs: 50 }
};

export const SPEEDUP_MS_PER_POINT = 3;

export function isSpeed(value: unknown): value is Speed {
	return typeof value === 'string' && (SPEEDS as readonly string[]).includes(value);
}

/**
 * Time between ticks for a score at a given speed setting: it starts at the setting's base,
 * speeds up with every point, and never gets faster than the setting's floor.
 */
export function tickIntervalMs(score: number, speed: Speed = DEFAULT_SPEED): number {
	const { baseMs, minMs } = SPEED_PROFILES[speed];
	return Math.max(minMs, baseMs - score * SPEEDUP_MS_PER_POINT);
}
