import {
	createGame,
	enqueueDirection,
	start,
	step,
	tickIntervalMs,
	togglePause,
	type Direction,
	type GameState
} from '../engine';
import { deriveEvent, type GameEvent } from './events';
import { configFor, DEFAULT_SETTINGS, parseSettings, type Settings } from '../settings/settings';
import { loadHighScore, loadSettings, saveHighScore, saveSettings } from '../storage/storage';

/** Fixed seed for the first (server-rendered) frame so hydration matches; see `hydrate`. */
const INITIAL_SEED = 1;

export function randomSeed(): number {
	return crypto.getRandomValues(new Uint32Array(1))[0] ?? INITIAL_SEED;
}

/**
 * Svelte-facing wrapper around the pure engine. It owns no game rules: every state change
 * is delegated to an engine function. `$state.raw` is enough because states are immutable.
 */
export class Game {
	settings = $state<Settings>(DEFAULT_SETTINGS);
	state = $state.raw<GameState>(createGame(configFor(DEFAULT_SETTINGS), INITIAL_SEED));
	highScore = $state(0);

	/** Called for noteworthy moments (eating, game over, ...). The page uses it for sound. */
	onevent: ((event: GameEvent) => void) | null = null;

	// $derived dedupes equal values, so effects that read `status` do not re-run on every tick.
	status = $derived(this.state.status);
	score = $derived(this.state.score);
	/** Speed applies live: it only changes how often we tick. */
	intervalMs = $derived(tickIntervalMs(this.state.score, this.settings.speed));
	/** The wall setting is baked into a game when it is created, so a change waits for the next one. */
	wrapPending = $derived(this.settings.wrap !== this.state.config.wrap);

	/** Client-only setup: load saved data and swap in a random seed. */
	hydrate(): void {
		this.highScore = loadHighScore();
		this.settings = loadSettings();
		this.state = createGame(configFor(this.settings), randomSeed());
	}

	/**
	 * Applies a settings change. Invalid fields are ignored. Before the game has started the new
	 * rules take effect right away; once it is underway, only speed does (see `wrapPending`).
	 */
	updateSettings(patch: Partial<Settings>): void {
		this.settings = parseSettings(patch, this.settings);
		saveSettings(this.settings);
		// Only the wall rule is baked into a game, so other settings leave an idle game alone.
		if (this.state.status === 'idle' && this.state.config.wrap !== this.settings.wrap) {
			this.state = createGame(configFor(this.settings), randomSeed());
		}
	}

	toggleSound(): void {
		this.updateSettings({ sound: !this.settings.sound });
	}

	tick(): void {
		this.#apply(step(this.state));
		this.#recordHighScore();
	}

	turn(direction: Direction): void {
		if (this.state.status === 'idle') this.#apply(start(this.state));
		this.state = enqueueDirection(this.state, direction);
	}

	/** Enter: start, resume or play again, depending on where the game is. */
	primary(): void {
		const { status } = this.state;
		if (status === 'idle') this.#apply(start(this.state));
		else if (status === 'paused') this.#apply(togglePause(this.state));
		else if (status === 'gameover' || status === 'won') this.restart();
	}

	/** Keypad "5": pause while playing, otherwise behave like Enter. */
	startOrPause(): void {
		if (this.state.status === 'running') this.togglePause();
		else this.primary();
	}

	togglePause(): void {
		this.#apply(togglePause(this.state));
	}

	/** Automatic pauses (hidden tab, opening the menu) are silent: no event, no beep. */
	pauseIfRunning(): void {
		if (this.state.status === 'running') this.state = togglePause(this.state);
	}

	restart(): void {
		this.#apply(start(createGame(configFor(this.settings), randomSeed())));
	}

	#apply(next: GameState): void {
		const event = deriveEvent(this.state, next);
		this.state = next;
		if (event) this.onevent?.(event);
	}

	#recordHighScore(): void {
		const { status, score } = this.state;
		if ((status === 'gameover' || status === 'won') && score > this.highScore) {
			this.highScore = score;
			saveHighScore(score);
		}
	}
}
