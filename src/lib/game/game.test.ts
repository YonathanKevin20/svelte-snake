import { describe, expect, it } from 'vitest';
import { Game } from './game.svelte.js';

/** A running game whose snake is one tick away from the right-hand wall. */
function nearWall(game: Game, score = 5): void {
	game.state = {
		...game.state,
		status: 'running',
		score,
		snake: [
			{ x: game.state.config.cols - 1, y: 7 },
			{ x: game.state.config.cols - 2, y: 7 },
			{ x: game.state.config.cols - 3, y: 7 }
		]
	};
}

describe('Game', () => {
	it('starts idle', () => {
		expect(new Game().status).toBe('idle');
	});

	it('starts on the first turn and queues it', () => {
		const game = new Game();
		game.turn('up');
		expect(game.status).toBe('running');
		expect(game.state.queue).toEqual(['up']);
	});

	it('starts on a reversing turn but does not queue it', () => {
		const game = new Game();
		game.turn('left'); // the snake starts heading right
		expect(game.status).toBe('running');
		expect(game.state.queue).toEqual([]);
	});

	describe('startOrPause (keypad 5)', () => {
		it('starts, pauses, resumes', () => {
			const game = new Game();
			game.startOrPause();
			expect(game.status).toBe('running');
			game.startOrPause();
			expect(game.status).toBe('paused');
			game.startOrPause();
			expect(game.status).toBe('running');
		});

		it('plays again after game over', () => {
			const game = new Game();
			nearWall(game);
			game.tick();
			expect(game.status).toBe('gameover');
			game.startOrPause();
			expect(game.status).toBe('running');
			expect(game.score).toBe(0);
		});
	});

	it('pauses only a running game when the tab is hidden', () => {
		const game = new Game();
		game.pauseIfRunning();
		expect(game.status).toBe('idle');
		game.primary();
		game.pauseIfRunning();
		expect(game.status).toBe('paused');
	});

	it('records a new high score at game over', () => {
		const game = new Game();
		nearWall(game, 5);
		game.tick();
		expect(game.status).toBe('gameover');
		expect(game.highScore).toBe(5);
	});

	it('keeps a higher existing high score', () => {
		const game = new Game();
		game.highScore = 9;
		nearWall(game, 5);
		game.tick();
		expect(game.highScore).toBe(9);
	});

	describe('settings', () => {
		it('speed applies live, even mid-game', () => {
			const game = new Game();
			const normal = game.intervalMs;
			game.primary();
			game.updateSettings({ speed: 'fast' });
			expect(game.intervalMs).toBeLessThan(normal);
			game.updateSettings({ speed: 'slow' });
			expect(game.intervalMs).toBeGreaterThan(normal);
		});

		it('wrap applies immediately before the game starts', () => {
			const game = new Game();
			game.updateSettings({ wrap: true });
			expect(game.state.config.wrap).toBe(true);
			expect(game.wrapPending).toBe(false);
			expect(game.status).toBe('idle');
		});

		it('wrap waits for the next game once one is underway', () => {
			const game = new Game();
			game.primary();
			game.updateSettings({ wrap: true });
			expect(game.state.config.wrap).toBe(false);
			expect(game.wrapPending).toBe(true);

			nearWall(game);
			game.tick();
			expect(game.status).toBe('gameover');
			expect(game.wrapPending).toBe(true);

			game.restart();
			expect(game.state.config.wrap).toBe(true);
			expect(game.wrapPending).toBe(false);
		});

		it('keeps the running game intact when settings change', () => {
			const game = new Game();
			game.primary();
			const before = game.state;
			game.updateSettings({ speed: 'fast' });
			expect(game.state).toBe(before);
		});

		it('ignores invalid values', () => {
			const game = new Game();
			game.updateSettings({ speed: 'warp' as never, wrap: 'yes' as never });
			expect(game.settings).toEqual({ speed: 'normal', wrap: false, sound: true });
		});

		it('plays on across the wall with wrap on', () => {
			const game = new Game();
			game.updateSettings({ wrap: true });
			game.primary();
			nearWall(game);
			game.tick();
			expect(game.status).toBe('running');
			expect(game.state.snake[0]?.x).toBe(0);
		});
	});

	describe('events', () => {
		function recorded(game: Game): string[] {
			const events: string[] = [];
			game.onevent = (event) => events.push(event);
			return events;
		}

		it('reports starting, pausing, resuming and playing again', () => {
			const game = new Game();
			const events = recorded(game);
			game.primary(); // idle -> running
			game.togglePause(); // running -> paused
			game.primary(); // paused -> running
			nearWall(game);
			game.tick(); // game over
			game.primary(); // restart
			expect(events).toEqual(['start', 'pause', 'resume', 'gameover', 'start']);
		});

		it('reports eating', () => {
			const game = new Game();
			game.primary();
			const events = recorded(game);
			const [head] = game.state.snake;
			game.state = { ...game.state, food: { x: (head?.x ?? 0) + 1, y: head?.y ?? 0 } };
			game.tick();
			expect(events).toEqual(['eat']);
		});

		it('reports the first turn as a start', () => {
			const game = new Game();
			const events = recorded(game);
			game.turn('up');
			expect(events).toEqual(['start']);
		});

		it('stays silent for automatic pauses and settings changes', () => {
			const game = new Game();
			game.primary();
			const events = recorded(game);
			game.pauseIfRunning();
			game.updateSettings({ speed: 'fast', sound: false });
			expect(events).toEqual([]);
		});

		it('works without a listener', () => {
			const game = new Game();
			expect(() => game.primary()).not.toThrow();
		});
	});

	describe('sound setting', () => {
		it('toggles and keeps the idle game untouched', () => {
			const game = new Game();
			const before = game.state;
			game.toggleSound();
			expect(game.settings.sound).toBe(false);
			expect(game.state).toBe(before);
			game.toggleSound();
			expect(game.settings.sound).toBe(true);
		});
	});
});
