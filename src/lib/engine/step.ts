import { spawnFood } from './food';
import { DELTAS, mod, samePoint } from './geometry';
import type { GameState, Point } from './types';

export const POINTS_PER_FOOD = 1;

/** Advances the game by exactly one tick. Pure: returns a new state. */
export function step(state: GameState): GameState {
	if (state.status !== 'running') return state;

	const { cols, rows, wrap } = state.config;
	const [queued, ...queue] = state.queue;
	const direction = queued ?? state.direction;
	const [head] = state.snake;
	if (!head) return state;

	const delta = DELTAS[direction];
	let next: Point = { x: head.x + delta.x, y: head.y + delta.y };
	if (wrap) {
		next = { x: mod(next.x, cols), y: mod(next.y, rows) };
	} else if (next.x < 0 || next.x >= cols || next.y < 0 || next.y >= rows) {
		return { ...state, direction, queue, status: 'gameover' };
	}

	const eating = state.food !== null && samePoint(next, state.food);
	// When not growing, the tail cell is vacated this tick, so moving into it is legal.
	const body = eating ? state.snake : state.snake.slice(0, -1);
	if (body.some((segment) => samePoint(segment, next))) {
		return { ...state, direction, queue, status: 'gameover' };
	}

	const snake = [next, ...body];
	if (!eating) return { ...state, snake, direction, queue };

	const spawned = spawnFood(state.config, snake, state.rngState);
	return {
		...state,
		snake,
		direction,
		queue,
		score: state.score + POINTS_PER_FOOD,
		food: spawned.food,
		rngState: spawned.rngState,
		status: spawned.food === null ? 'won' : 'running'
	};
}
