import type { Config, GameState } from './types';

export const SMALL: Config = { cols: 8, rows: 6, wrap: false };

/** A running 3-segment snake heading right on an 8x6 board, with food in the far corner. */
export function running(overrides: Partial<GameState> = {}): GameState {
	return {
		config: SMALL,
		snake: [
			{ x: 3, y: 2 },
			{ x: 2, y: 2 },
			{ x: 1, y: 2 }
		],
		direction: 'right',
		queue: [],
		food: { x: 7, y: 5 },
		score: 0,
		status: 'running',
		rngState: 42,
		...overrides
	};
}
