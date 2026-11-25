import { EFFECTS, type SoundEffect } from './effects';

/** The slice of the Web Audio API we use. A real AudioContext satisfies it; tests pass a fake. */
export interface AudioContextLike {
	readonly currentTime: number;
	readonly destination: unknown;
	readonly state: string;
	resume(): Promise<void>;
	createOscillator(): {
		type: string;
		frequency: { value: number };
		connect(destination: unknown): unknown;
		disconnect(): void;
		start(when: number): void;
		stop(when: number): void;
		onended: ((event: Event) => void) | null;
	};
	createGain(): {
		gain: {
			setValueAtTime(value: number, when: number): unknown;
			linearRampToValueAtTime(value: number, when: number): unknown;
		};
		connect(destination: unknown): unknown;
		disconnect(): void;
	};
}

export interface SoundPlayer {
	/** When false, `play` does nothing and no audio context is ever created. */
	enabled: boolean;
	play(effect: SoundEffect): void;
	/**
	 * Creates and resumes the audio context. Call it from a user gesture (a key press or a
	 * tap): browsers only allow audio to start after one, and iOS Safari is strict about it.
	 */
	unlock(): void;
}

/** Quiet on purpose: square waves are loud. */
const VOLUME = 0.05;
const ATTACK_S = 0.004;
const RELEASE_S = 0.012;
/** A hair of lead time so the first note is scheduled in the future, not in the past. */
const LEAD_S = 0.01;

function defaultCreateContext(): AudioContextLike | null {
	if (typeof AudioContext === 'undefined') return null;
	return new AudioContext() as unknown as AudioContextLike;
}

export function createSoundPlayer(
	createContext: () => AudioContextLike | null = defaultCreateContext
): SoundPlayer {
	let context: AudioContextLike | null = null;
	let failed = false;

	/** Lazily creates the context, so nothing audio-related happens until sound is needed. */
	function getContext(): AudioContextLike | null {
		if (context || failed) return context;
		try {
			context = createContext();
		} catch {
			context = null;
		}
		if (!context) failed = true;
		return context;
	}

	function wake(ctx: AudioContextLike): void {
		if (ctx.state === 'suspended') ctx.resume().catch(() => {});
	}

	return {
		enabled: true,

		unlock() {
			const ctx = getContext();
			if (ctx) wake(ctx);
		},

		play(effect) {
			if (!this.enabled) return;
			const ctx = getContext();
			if (!ctx) return;
			wake(ctx);

			let time = ctx.currentTime + LEAD_S;
			for (const { frequency, durationMs } of EFFECTS[effect]) {
				const duration = durationMs / 1000;
				const oscillator = ctx.createOscillator();
				const gain = ctx.createGain();

				oscillator.type = 'square';
				oscillator.frequency.value = frequency;
				// A tiny envelope on every note avoids the clicks of an abrupt start and stop.
				gain.gain.setValueAtTime(0, time);
				gain.gain.linearRampToValueAtTime(VOLUME, time + ATTACK_S);
				gain.gain.setValueAtTime(VOLUME, time + Math.max(ATTACK_S, duration - RELEASE_S));
				gain.gain.linearRampToValueAtTime(0, time + duration);

				oscillator.connect(gain);
				gain.connect(ctx.destination);
				oscillator.onended = () => {
					oscillator.disconnect();
					gain.disconnect();
				};
				oscillator.start(time);
				oscillator.stop(time + duration + 0.01);
				time += duration;
			}
		}
	};
}
