import { isOpposite } from './geometry';
import type { Direction, GameState } from './types';

export const MAX_QUEUED_TURNS = 2;

/**
 * Buffers a turn. It is validated against the last *queued* direction (or, with an empty
 * queue, the last *applied* one) so a quick "up, left" can never reverse the snake into itself.
 */
export function enqueueDirection(state: GameState, direction: Direction): GameState {
	if (state.status !== 'running') return state;
	if (state.queue.length >= MAX_QUEUED_TURNS) return state;
	const reference = state.queue.at(-1) ?? state.direction;
	if (direction === reference || isOpposite(direction, reference)) return state;
	return { ...state, queue: [...state.queue, direction] };
}
