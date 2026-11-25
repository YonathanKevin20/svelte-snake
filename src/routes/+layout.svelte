<script lang="ts">
	// Latin only: the game shows nothing else, and every font file is precached for offline play.
	import '@fontsource/press-start-2p/latin-400.css';
	import '#lib/styles/theme.css';
	import { asset } from '$app/paths';
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} type="image/svg+xml" />
	<link rel="manifest" href={asset('manifest.webmanifest')} />
	<link rel="apple-touch-icon" href={asset('apple-touch-icon.png')} />
</svelte:head>

{@render children()}
