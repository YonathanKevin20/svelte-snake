import { DEFAULT_CONFIG, DEFAULT_SPEED, isSpeed, type Config, type Speed } from '../engine';

export interface Settings {
	readonly speed: Speed;
	/** Wrap around the edges instead of dying on walls. */
	readonly wrap: boolean;
	/** Sound effects on (true) or muted (false). */
	readonly sound: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
	speed: DEFAULT_SPEED,
	wrap: DEFAULT_CONFIG.wrap,
	// Every sound follows a user gesture, so on by default is safe; players can mute with M.
	sound: true
};

/**
 * Builds a valid Settings from anything (parsed JSON, a partial patch). Unknown or invalid
 * fields fall back to `fallback`, so corrupt stored data can never break the game.
 */
export function parseSettings(value: unknown, fallback: Settings = DEFAULT_SETTINGS): Settings {
	if (typeof value !== 'object' || value === null) return fallback;
	const { speed, wrap, sound } = value as Record<string, unknown>;
	return {
		speed: isSpeed(speed) ? speed : fallback.speed,
		wrap: typeof wrap === 'boolean' ? wrap : fallback.wrap,
		sound: typeof sound === 'boolean' ? sound : fallback.sound
	};
}

/** The engine config for a new game under these settings. */
export function configFor(settings: Settings): Config {
	return { ...DEFAULT_CONFIG, wrap: settings.wrap };
}
