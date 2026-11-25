/** Longest frame we will try to catch up on (a throttled background tab, a debugger pause). */
export const MAX_CATCH_UP_TICKS = 5;

/**
 * Turns variable frame times into a whole number of fixed-length game ticks. The leftover
 * time carries over to the next frame, so the game speed does not depend on the frame rate.
 */
export class Accumulator {
	#remainder = 0;

	advance(deltaMs: number, intervalMs: number): number {
		this.#remainder += Math.max(0, deltaMs);
		const ticks = Math.min(MAX_CATCH_UP_TICKS, Math.floor(this.#remainder / intervalMs));
		this.#remainder = ticks === MAX_CATCH_UP_TICKS ? 0 : this.#remainder - ticks * intervalMs;
		return ticks;
	}

	reset(): void {
		this.#remainder = 0;
	}
}

export interface LoopOptions {
	onTick: () => void;
	getIntervalMs: () => number;
	now?: () => number;
	requestFrame?: (callback: () => void) => number;
	cancelFrame?: (id: number) => void;
}

/** Fixed-timestep loop on requestAnimationFrame. Returns a function that stops it. */
export function startLoop({
	onTick,
	getIntervalMs,
	now = () => performance.now(),
	requestFrame = (callback) => requestAnimationFrame(callback),
	cancelFrame = (id) => cancelAnimationFrame(id)
}: LoopOptions): () => void {
	const accumulator = new Accumulator();
	let last = now();
	let active = true;
	let frameId = 0;

	const frame = () => {
		if (!active) return;
		const time = now();
		const ticks = accumulator.advance(time - last, getIntervalMs());
		last = time;
		for (let i = 0; i < ticks && active; i++) onTick();
		if (active) frameId = requestFrame(frame);
	};
	frameId = requestFrame(frame);

	return () => {
		active = false;
		cancelFrame(frameId);
	};
}
