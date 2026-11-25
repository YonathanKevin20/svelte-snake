import { spawnFood } from './food';
import type { Config, GameState } from './types';

export const DEFAULT_CONFIG: Config = { cols: 20, rows: 15, wrap: false };
export const INITIAL_LENGTH = 3;
const MIN_BOARD_SIZE = 5;

export function createGame(config: Config = DEFAULT_CONFIG, seed = 1): GameState {
	if (config.cols < MIN_BOARD_SIZE || config.rows < MIN_BOARD_SIZE) {
		throw new RangeError(`Board must be at least ${MIN_BOARD_SIZE}x${MIN_BOARD_SIZE}`);
	}
	const y = Math.floor(config.rows / 2);
	const headX = Math.floor(config.cols / 2);
	const snake = Array.from({ length: INITIAL_LENGTH }, (_, i) => ({ x: headX - i, y }));
	const { food, rngState } = spawnFood(config, snake, seed >>> 0);
	return {
		config,
		snake,
		direction: 'right',
		queue: [],
		food,
		score: 0,
		status: 'idle',
		rngState
	};
}

export function start(state: GameState): GameState {
	return state.status === 'idle' ? { ...state, status: 'running' } : state;
}

export function togglePause(state: GameState): GameState {
	if (state.status === 'running') return { ...state, status: 'paused' };
	if (state.status === 'paused') return { ...state, status: 'running' };
	return state;
}
