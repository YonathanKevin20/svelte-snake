import type { Direction } from '../engine';

export type Action =
	| { readonly type: 'turn'; readonly direction: Direction }
	| { readonly type: 'primary' }
	| { readonly type: 'pause' }
	| { readonly type: 'menu' }
	| { readonly type: 'mute' };

const TURNS: Readonly<Record<string, Direction>> = {
	ArrowUp: 'up',
	ArrowDown: 'down',
	ArrowLeft: 'left',
	ArrowRight: 'right',
	w: 'up',
	s: 'down',
	a: 'left',
	d: 'right'
};

/** Maps a KeyboardEvent.key to a game action. Pure, so it is easy to test. */
export function keyToAction(key: string): Action | null {
	const direction = TURNS[key] ?? TURNS[key.toLowerCase()];
	if (direction) return { type: 'turn', direction };
	if (key === 'Enter') return { type: 'primary' };
	if (key === 'Escape') return { type: 'menu' };
	if (key.toLowerCase() === 'm') return { type: 'mute' };
	if (key === ' ' || key.toLowerCase() === 'p') return { type: 'pause' };
	return null;
}
