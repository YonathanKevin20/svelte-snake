<script lang="ts">
	import { asset } from '$app/paths';
	import { SPEEDS } from '../engine';
	import type { Settings } from '../settings/settings';

	let {
		settings,
		wrapPending,
		onchange
	}: {
		settings: Settings;
		/** True when the wall setting differs from the game in progress. */
		wrapPending: boolean;
		onchange: (patch: Partial<Settings>) => void;
	} = $props();

	let dialog: HTMLDialogElement;

	/** Opens the dialog modally: the page behind is inert and focus is trapped inside. */
	export function show(): void {
		if (!dialog.open) dialog.showModal();
	}

	/**
	 * Reads the element itself, which is always current. Mirroring it into state from the
	 * `close` event would lag: that event fires after the dialog is already closed, so a key
	 * pressed in between would wrongly be treated as "dialog still open".
	 */
	export function isOpen(): boolean {
		return dialog.open;
	}

	const labels = { slow: 'Slow', normal: 'Normal', fast: 'Fast' } as const;
</script>

<!-- The click handler only adds a pointer shortcut for closing; Escape and the Close button
     are the accessible paths and are handled natively by <dialog>. -->
<dialog
	bind:this={dialog}
	aria-labelledby="settings-title"
	onclick={(event) => event.target === dialog && dialog.close()}
>
	<div class="panel">
		<h2 id="settings-title">Settings</h2>

		<fieldset>
			<legend>Speed</legend>
			<div class="segments">
				{#each SPEEDS as speed (speed)}
					<label class="segment">
						<input
							class="sr-only"
							type="radio"
							name="speed"
							value={speed}
							checked={settings.speed === speed}
							onchange={() => onchange({ speed })}
						/>
						<span>{labels[speed]}</span>
					</label>
				{/each}
			</div>
			<p class="help">The snake still speeds up as your score grows.</p>
		</fieldset>

		<fieldset>
			<legend>Walls</legend>
			<label class="toggle">
				<input
					type="checkbox"
					checked={settings.wrap}
					onchange={(event) => onchange({ wrap: event.currentTarget.checked })}
				/>
				<span>Wrap around the edges</span>
			</label>
			<p class="help">
				{settings.wrap
					? 'Leaving one side brings you back on the other.'
					: 'Hitting a wall ends the game.'}
			</p>
			{#if wrapPending}
				<p class="help pending" role="status">This applies from your next game.</p>
			{/if}
		</fieldset>

		<fieldset>
			<legend>Sound</legend>
			<label class="toggle">
				<input
					type="checkbox"
					checked={settings.sound}
					onchange={(event) => onchange({ sound: event.currentTarget.checked })}
				/>
				<span>Sound effects</span>
			</label>
			<p class="help">Press M at any time to mute or unmute.</p>
		</fieldset>

		<p class="help credits">
			Pixel font: Press Start 2P, under the SIL Open Font License.
			<a href={asset('third-party-licenses.txt')} target="_blank" rel="noopener"
				>Licenses<span class="sr-only"> (opens in a new tab)</span></a
			>
		</p>

		<form method="dialog">
			<button type="submit" class="close">Close</button>
		</form>
	</div>
</dialog>

<style>
	dialog {
		width: min(92vw, 24rem);
		padding: 0;
		border: 2px solid var(--lcd-ink);
		background: var(--lcd-light);
		color: var(--lcd-ink);
		font-family: var(--font-pixel);
	}

	dialog::backdrop {
		background: rgb(0 0 0 / 0.65);
	}

	.panel {
		display: grid;
		gap: 1.1rem;
		padding: 1.1rem;
	}

	h2 {
		margin: 0;
		font-size: 0.9rem;
		font-weight: normal;
	}

	fieldset {
		display: grid;
		gap: 0.6rem;
		margin: 0;
		padding: 0;
		border: 0;
	}

	legend {
		padding: 0;
		margin-bottom: 0.6rem;
		font-size: 0.65rem;
	}

	.segments {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		border: 2px solid var(--lcd-ink);
	}

	.segment {
		position: relative;
		cursor: pointer;
	}

	.segment + .segment {
		border-left: 2px solid var(--lcd-ink);
	}

	.segment span {
		display: block;
		padding: 0.7rem 0.2rem;
		text-align: center;
		font-size: 0.6rem;
	}

	.segment input:checked + span {
		background: var(--lcd-ink);
		color: var(--lcd-light);
	}

	/* The radio itself is visually hidden, so its focus ring is drawn on the label text: a dark
	   line (visible on the light segments) inside a yellow one (visible on the dark segment). */
	.segment input:focus-visible + span {
		outline: none;
		box-shadow:
			inset 0 0 0 3px var(--lcd-ink),
			inset 0 0 0 6px var(--focus-ring);
	}

	.toggle {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		font-size: 0.6rem;
		line-height: 1.6;
		cursor: pointer;
	}

	.toggle input {
		flex: none;
		width: 1.5rem;
		height: 1.5rem;
		margin: 0;
		accent-color: var(--lcd-ink);
	}

	.help {
		margin: 0;
		font-size: 0.6rem;
		line-height: 1.8;
	}

	.credits a {
		color: inherit;
	}

	.pending {
		font-weight: normal;
		text-decoration: underline;
	}

	.close {
		width: 100%;
		padding: 0.8rem;
		border: 2px solid var(--lcd-ink);
		background: var(--lcd-ink);
		color: var(--lcd-light);
		font: inherit;
		font-size: 0.65rem;
		cursor: pointer;
	}

	@media (forced-colors: active) {
		/* The selected segment is shown with a background, which high-contrast modes drop. */
		.segment input:checked + span {
			background: Highlight;
			color: HighlightText;
			forced-color-adjust: none;
		}
		.segment input:focus-visible + span {
			outline: 3px solid CanvasText;
			outline-offset: -4px;
		}
		.close {
			border-color: ButtonText;
		}
	}
</style>
