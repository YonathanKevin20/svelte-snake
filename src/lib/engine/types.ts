export type Direction = 'up' | 'down' | 'left' | 'right';

export interface Point {
	readonly x: number;
	readonly y: number;
}

export type Status = 'idle' | 'running' | 'paused' | 'gameover' | 'won';

export interface Config {
	readonly cols: number;
	readonly rows: number;
	/** When true the snake wraps around the edges instead of dying on them. */
	readonly wrap: boolean;
}

/** The whole game. Plain, JSON-serializable data: the engine never mutates it. */
export interface GameState {
	readonly config: Config;
	/** Head first. */
	readonly snake: readonly Point[];
	/** The direction applied on the most recent tick. */
	readonly direction: Direction;
	/** Buffered turns, applied one per tick. */
	readonly queue: readonly Direction[];
	/** `null` only when the board is full (the game is won). */
	readonly food: Point | null;
	readonly score: number;
	readonly status: Status;
	/** Internal state of the seeded RNG (uint32). */
	readonly rngState: number;
}
