<script lang="ts">
	let {
		score,
		highScore,
		muted = false
	}: { score: number; highScore: number; muted?: boolean } = $props();

	const pad = (n: number) => String(n).padStart(3, '0');
</script>

<div class="hud">
	<span>Score {pad(score)}</span>
	{#if muted}<span class="muted">Mute</span>{/if}
	<span>Best {pad(highScore)}</span>
</div>

<style>
	.hud {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding-bottom: 0.6rem;
		font-size: clamp(0.6rem, 2.2vw, 0.75rem);
		border-bottom: 2px solid var(--lcd-ink);
		margin-bottom: 0.6rem;
	}

	.muted {
		text-decoration: line-through;
	}
</style>
