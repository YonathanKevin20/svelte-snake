/**
 * Seeded, stateless RNG (mulberry32). The state is a single uint32 that lives inside
 * GameState, so the same seed plus the same inputs always replay the same game.
 */
export function nextRandom(state: number): readonly [value: number, nextState: number] {
	const nextState = (state + 0x6d2b79f5) >>> 0;
	let t = nextState;
	t = Math.imul(t ^ (t >>> 15), t | 1);
	t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
	return [((t ^ (t >>> 14)) >>> 0) / 4294967296, nextState];
}

/** Uniform integer in [0, maxExclusive). */
export function randomInt(
	state: number,
	maxExclusive: number
): readonly [value: number, nextState: number] {
	const [value, nextState] = nextRandom(state);
	return [Math.floor(value * maxExclusive), nextState];
}
