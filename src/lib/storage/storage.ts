/** The only module that touches localStorage. Keys are versioned so the schema can change. */
import { DEFAULT_SETTINGS, parseSettings, type Settings } from '../settings/settings';

const HIGH_SCORE_KEY = 'svelte-snake:v1:high-score';
const SETTINGS_KEY = 'svelte-snake:v1:settings';

type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem'>;

function browserStorage(): KeyValueStorage | null {
	try {
		return typeof localStorage === 'undefined' ? null : localStorage;
	} catch {
		// Access can throw (blocked cookies, private modes).
		return null;
	}
}

export function loadHighScore(storage: KeyValueStorage | null = browserStorage()): number {
	try {
		const parsed = Number.parseInt(storage?.getItem(HIGH_SCORE_KEY) ?? '', 10);
		return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
	} catch {
		return 0;
	}
}

export function saveHighScore(
	score: number,
	storage: KeyValueStorage | null = browserStorage()
): void {
	try {
		storage?.setItem(HIGH_SCORE_KEY, String(score));
	} catch {
		// Persisting the score is best-effort: the game works without it.
	}
}

export function loadSettings(storage: KeyValueStorage | null = browserStorage()): Settings {
	try {
		const raw = storage?.getItem(SETTINGS_KEY);
		return raw ? parseSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
	} catch {
		// Corrupt JSON or blocked storage: start from the defaults.
		return DEFAULT_SETTINGS;
	}
}

export function saveSettings(
	settings: Settings,
	storage: KeyValueStorage | null = browserStorage()
): void {
	try {
		storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
	} catch {
		// Best-effort, like the high score.
	}
}
