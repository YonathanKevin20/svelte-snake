export { freeCells, spawnFood } from './food';
export { enqueueDirection, MAX_QUEUED_TURNS } from './input-queue';
export { nextRandom, randomInt } from './rng';
export {
	DEFAULT_SPEED,
	isSpeed,
	SPEED_PROFILES,
	SPEEDS,
	SPEEDUP_MS_PER_POINT,
	tickIntervalMs,
	type Speed
} from './speed';
export { createGame, DEFAULT_CONFIG, INITIAL_LENGTH, start, togglePause } from './state';
export { POINTS_PER_FOOD, step } from './step';
export type { Config, Direction, GameState, Point, Status } from './types';
