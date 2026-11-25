<script lang="ts">
	import type { Snippet } from 'svelte';

	let { children, keypad }: { children: Snippet; keypad?: Snippet } = $props();
</script>

<div class="phone">
	<div class="bezel">
		{@render children()}
	</div>
	{@render keypad?.()}
	<h1 class="label">svelte-snake</h1>
</div>

<style>
	.phone {
		/* The third term shrinks the phone on short screens so it fits without scrolling. It is
		   tuned to the current layout (20x15 board, keypad): re-check it if those change. */
		width: min(94vw, 580px, max(300px, calc(133.3dvh - 440px)));
		padding: clamp(0.75rem, 3vw, 1.5rem);
		border-radius: 2.5rem 2.5rem 3.5rem 3.5rem;
		background: var(--phone-body);
		box-shadow:
			inset 0 0 0 2px var(--phone-edge),
			0 1.5rem 3rem rgb(0 0 0 / 0.45);
	}

	.bezel {
		padding: clamp(0.5rem, 2vw, 1rem);
		border-radius: 1.25rem;
		background: var(--phone-edge);
	}

	.label {
		margin: 1rem 0 0.25rem;
		font-weight: normal;
		text-align: center;
		font-size: 0.625rem;
		color: var(--phone-label);
	}
</style>
