<script lang="ts">
	import type { Direction } from '../engine';

	let {
		onturn,
		oncenter,
		onmenu
	}: { onturn: (direction: Direction) => void; oncenter: () => void; onmenu: () => void } =
		$props();

	/**
	 * In reading order (top to bottom, left to right), which is also the Tab order. Each
	 * accessible name starts with the digit printed on the key, so voice control ("click 4")
	 * and screen readers agree with what sighted users see (WCAG 2.5.3, Label in Name).
	 * Keys without a direction are the centre key.
	 */
	const keys: ReadonlyArray<{ digit: string; name: string; area: string; direction?: Direction }> =
		[
			{ digit: '2', name: '2, Up', area: 'up', direction: 'up' },
			{ digit: '4', name: '4, Left', area: 'left', direction: 'left' },
			{ digit: '5', name: '5, Start, pause or resume', area: 'center' },
			{ digit: '6', name: '6, Right', area: 'right', direction: 'right' },
			{ digit: '8', name: '8, Down', area: 'down', direction: 'down' }
		];

	/**
	 * Pointer-down fires immediately (no tap delay), which matters in a fast game. Keyboard
	 * activation of a focused key arrives as a click with `detail === 0`, so both paths work
	 * without a pointer tap firing twice.
	 */
	function press(action: () => void) {
		return {
			onpointerdown: (event: PointerEvent) => {
				// Keep focus off the key, so Space and Enter keep pausing and starting the game.
				event.preventDefault();
				action();
			},
			onmousedown: (event: MouseEvent) => event.preventDefault(),
			onclick: (event: MouseEvent) => {
				if (event.detail === 0) action();
			}
		};
	}
</script>

<div class="keypad" role="group" aria-label="Keypad">
	<!-- A plain click is enough here: opening a modal on pointerdown would let the same gesture's
	     click land on the backdrop. -->
	<button type="button" class="key key-menu" onclick={onmenu}>Menu</button>
	{#each keys as key (key.digit)}
		{@const direction = key.direction}
		<button
			type="button"
			class="key key-{key.area}"
			aria-label={key.name}
			{...press(() => (direction ? onturn(direction) : oncenter()))}
		>
			<span class="digit" aria-hidden="true">{key.digit}</span>
			{#if direction}<span class="arrow" aria-hidden="true"></span>{/if}
		</button>
	{/each}
</div>

<style>
	.keypad {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		grid-template-areas:
			'menu up .'
			'left center right'
			'. down .';
		gap: clamp(0.4rem, 2vw, 0.75rem);
		width: min(100%, 15rem);
		margin: clamp(0.75rem, 3vw, 1.25rem) auto 0;
		user-select: none;
		-webkit-user-select: none;
		-webkit-touch-callout: none;
	}

	.key {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.3rem;
		aspect-ratio: 5 / 3;
		padding: 0;
		border: 0;
		border-radius: 0.9rem;
		background: var(--key-bg);
		color: var(--key-text);
		box-shadow:
			0 3px 0 var(--phone-edge),
			inset 0 1px 0 rgb(255 255 255 / 0.12);
		font: inherit;
		font-size: clamp(0.7rem, 3vw, 0.95rem);
		cursor: pointer;
		touch-action: manipulation;
		-webkit-tap-highlight-color: transparent;
	}

	.key:active {
		transform: translateY(2px);
		box-shadow:
			0 1px 0 var(--phone-edge),
			inset 0 1px 0 rgb(255 255 255 / 0.12);
	}

	.key-up {
		grid-area: up;
	}
	.key-left {
		grid-area: left;
	}
	.key-right {
		grid-area: right;
	}
	.key-down {
		grid-area: down;
	}
	.key-center {
		grid-area: center;
	}
	.key-menu {
		grid-area: menu;
		font-size: clamp(0.6rem, 2.2vw, 0.65rem);
	}

	/* A tiny triangle under each digit, rotated to point the way the key steers. */
	.arrow {
		width: 0.55rem;
		height: 0.45rem;
		background: currentColor;
		clip-path: polygon(50% 0, 100% 100%, 0 100%);
	}
	.key-left .arrow {
		transform: rotate(-90deg);
	}
	.key-right .arrow {
		transform: rotate(90deg);
	}
	.key-down .arrow {
		transform: rotate(180deg);
	}

	/* Keep this block last in the file so it wins the cascade over the rules above. */
	@media (forced-colors: active) {
		/* Backgrounds and shadows are dropped in high-contrast modes, so draw each key's edge. */
		.key {
			border: 2px solid ButtonText;
		}
		/* The arrows are drawn with a background, which would otherwise become the page colour. */
		.arrow {
			background: ButtonText;
		}
	}
</style>
