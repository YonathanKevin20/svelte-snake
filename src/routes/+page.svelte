<script lang="ts">
	import { onMount } from 'svelte';
	import { createSoundPlayer } from '#lib/audio/sound.js';
	import Board from '#lib/components/Board.svelte';
	import Hud from '#lib/components/Hud.svelte';
	import Keypad from '#lib/components/Keypad.svelte';
	import PhoneFrame from '#lib/components/PhoneFrame.svelte';
	import SettingsDialog from '#lib/components/SettingsDialog.svelte';
	import { Game } from '#lib/game/game.svelte.js';
	import { startLoop } from '#lib/game/loop.js';
	import { describeEvent, shouldAnnounce } from '#lib/game/events.js';
	import { keyToAction } from '#lib/input/keyboard.js';
	import { swipe } from '#lib/input/swipe.js';

	const game = new Game();
	const sound = createSoundPlayer();
	game.onevent = (event) => {
		// Resuming sounds the same as starting.
		sound.play(event === 'resume' ? 'start' : event);
		const now = performance.now();
		if (!shouldAnnounce(event, now, lastEatAnnouncedAt)) return;
		if (event === 'eat') lastEatAnnouncedAt = now;
		announce(describeEvent(event, game.score));
	};
	// One polite live region for everything a screen reader should hear.
	let announcement = $state('');
	let announceTimer: ReturnType<typeof setTimeout> | undefined;
	let lastEatAnnouncedAt = Number.NEGATIVE_INFINITY;

	/**
	 * Clearing first, then setting the text a moment later, makes screen readers speak a message
	 * again even when it is identical to the last one (two games ending on the same score).
	 */
	function announce(text: string) {
		clearTimeout(announceTimer);
		announcement = '';
		announceTimer = setTimeout(() => (announcement = text), 80);
	}

	$effect(() => {
		sound.enabled = game.settings.sound;
	});

	let settingsDialog: SettingsDialog;

	/** Opening the menu pauses a running game; closing it leaves the game paused. */
	function openSettings() {
		game.pauseIfRunning();
		settingsDialog.show();
	}

	// Flips once the page is interactive, so tests (and curious devs) can tell hydration is done.
	let ready = $state(false);

	onMount(() => {
		game.hydrate();
		ready = true;
	});

	// The loop only exists while the game is running; the effect restarts it on status changes.
	$effect(() => {
		if (game.status !== 'running') return;
		return startLoop({ onTick: () => game.tick(), getIntervalMs: () => game.intervalMs });
	});

	function toggleSound() {
		game.toggleSound();
		announce(game.settings.sound ? 'Sound on' : 'Sound off');
	}

	function onKeydown(event: KeyboardEvent) {
		// Audio may only start after a user gesture, so the first key press unlocks it.
		sound.unlock();
		// While the dialog is open, keys belong to it (radio arrows, Escape to close).
		if (settingsDialog.isOpen()) return;
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		const action = keyToAction(event.key);
		if (!action) return;
		// On a focused button, Enter and Space must keep their native "press" meaning.
		const onButton = event.target instanceof HTMLButtonElement;
		if (onButton && (action.type === 'primary' || action.type === 'pause')) return;
		event.preventDefault();
		if (action.type === 'turn') game.turn(action.direction);
		else if (action.type === 'primary') game.primary();
		else if (action.type === 'menu') openSettings();
		else if (action.type === 'mute') toggleSound();
		else game.togglePause();
	}

	const overlay = $derived(
		{
			idle: { title: 'Ready', button: 'Start' },
			paused: { title: 'Paused', button: 'Resume' },
			gameover: { title: 'Game over', button: 'Play again' },
			won: { title: 'You win!', button: 'Play again' },
			running: null
		}[game.status]
	);
</script>

<svelte:head>
	<title>Svelte Snake</title>
	<meta name="description" content="A retro, feature-phone style Snake game built with Svelte." />
	<meta name="theme-color" content="#111a24" />
</svelte:head>

<svelte:window onkeydown={onKeydown} onpointerup={() => sound.unlock()} />
<svelte:document onvisibilitychange={() => document.hidden && game.pauseIfRunning()} />

<main data-ready={ready}>
	<PhoneFrame>
		{#snippet keypad()}
			<Keypad
				onturn={(direction) => game.turn(direction)}
				oncenter={() => game.startOrPause()}
				onmenu={openSettings}
			/>
		{/snippet}
		<div class="screen">
			<Hud score={game.score} highScore={game.highScore} muted={!game.settings.sound} />
			<div
				class="playfield"
				data-direction={game.state.direction}
				{@attach swipe((direction) => game.turn(direction))}
			>
				<Board config={game.state.config} snake={game.state.snake} food={game.state.food} />
				{#if overlay}
					<div class="overlay">
						<h2 class="title">{overlay.title}</h2>
						<button type="button" aria-describedby="how-to-play" onclick={() => game.primary()}>
							{overlay.button}
						</button>
						<p class="hint" id="how-to-play">
							Arrows, WASD, swipe<br />or keypad to steer<br />Esc: settings, M: mute
						</p>
					</div>
				{/if}
			</div>
		</div>
	</PhoneFrame>
	<SettingsDialog
		bind:this={settingsDialog}
		settings={game.settings}
		wrapPending={game.wrapPending}
		onchange={(patch) => game.updateSettings(patch)}
	/>
	<p class="sr-only" role="status">{announcement}</p>
</main>

<style>
	main {
		display: grid;
		place-items: center;
		min-height: 100%;
		padding: 1rem;
	}

	.screen {
		padding: clamp(0.5rem, 2.5vw, 1rem);
		background: var(--lcd-light);
		border-radius: 0.5rem;
		box-shadow: inset 0 0 0 2px var(--lcd-ink);
	}

	.playfield {
		position: relative;
		outline: 2px solid var(--lcd-ink);
		/* Swipes steer the snake instead of scrolling or zooming the page. */
		touch-action: none;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}

	.overlay {
		position: absolute;
		inset: 0;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.9rem;
		background: rgb(199 240 216 / 0.88);
		text-align: center;
	}

	.title {
		margin: 0;
		font-weight: normal;
		font-size: clamp(0.8rem, 4vw, 1.25rem);
	}

	button {
		padding: 0.7rem 1.1rem;
		border: 2px solid var(--lcd-ink);
		background: var(--lcd-ink);
		color: var(--lcd-light);
		font: inherit;
		font-size: clamp(0.6rem, 2.6vw, 0.8rem);
		cursor: pointer;
	}

	.hint {
		margin: 0;
		font-size: clamp(0.6rem, 2.2vw, 0.65rem);
		line-height: 1.8;
	}
</style>
