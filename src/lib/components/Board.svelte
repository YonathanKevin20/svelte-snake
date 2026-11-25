<script lang="ts">
	import type { Config, Point } from '../engine';

	type Cell = 'empty' | 'snake' | 'food';

	let { config, snake, food }: { config: Config; snake: readonly Point[]; food: Point | null } =
		$props();

	const cells = $derived.by(() => {
		const grid = new Array<Cell>(config.cols * config.rows).fill('empty');
		for (const { x, y } of snake) grid[y * config.cols + x] = 'snake';
		if (food) grid[food.y * config.cols + food.x] = 'food';
		return grid;
	});
</script>

<div
	class="board"
	role="img"
	aria-label="Game board, snake length {snake.length}"
	style:--cols={config.cols}
	style:--rows={config.rows}
>
	{#each cells as cell, i (i)}
		<span class="cell {cell}"></span>
	{/each}
</div>

<style>
	.board {
		display: grid;
		grid-template-columns: repeat(var(--cols), 1fr);
		aspect-ratio: var(--cols) / var(--rows);
		width: 100%;
		background: var(--lcd-light);
	}

	.cell {
		display: block;
		padding: 9%;
	}

	/* One "pixel" per cell: the ghost layer is always there, lit cells darken it. */
	.cell::before {
		content: '';
		display: block;
		width: 100%;
		height: 100%;
		background: var(--lcd-ghost);
	}

	.snake::before {
		background: var(--lcd-ink);
	}

	.food::before {
		background: var(--lcd-ink);
		clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
	}

	@media (forced-colors: active) {
		/* Backgrounds are replaced in high-contrast modes, so use system colours: lit pixels in
		   the text colour, and faint outlines for the unlit ghost grid. Keep this block last so
		   it wins the cascade. */
		.board {
			background: Canvas;
		}
		.cell::before {
			background: Canvas;
			outline: 1px solid GrayText;
			outline-offset: -1px;
		}
		.snake::before,
		.food::before {
			background: CanvasText;
			outline: none;
		}
	}
</style>
