import type { Attachment } from 'svelte/attachments';
import type { Direction } from '../engine';

/** How far (in CSS pixels) a finger must travel before it counts as a swipe. */
export const SWIPE_THRESHOLD_PX = 24;

/**
 * Turns a movement vector into a direction, or `null` if it is too short. The dominant axis
 * wins; an exact diagonal counts as horizontal.
 */
export function detectSwipe(
	dx: number,
	dy: number,
	threshold = SWIPE_THRESHOLD_PX
): Direction | null {
	if (Math.max(Math.abs(dx), Math.abs(dy)) < threshold) return null;
	if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? 'right' : 'left';
	return dy > 0 ? 'down' : 'up';
}

/**
 * Svelte attachment: reports swipe directions made with a finger, pen or mouse on the element.
 *
 * After each swipe the origin moves to the current point, so a single continuous gesture can
 * chain several turns. Pointer move/up listeners go on `window` (no pointer capture), so
 * taps on buttons inside the element still produce normal click events. The element needs
 * `touch-action: none` or the browser will claim the gesture to scroll the page.
 */
export function swipe(
	onSwipe: (direction: Direction) => void,
	threshold = SWIPE_THRESHOLD_PX
): Attachment<HTMLElement> {
	return (element) => {
		let activePointer: number | null = null;
		let originX = 0;
		let originY = 0;

		function onMove(event: PointerEvent) {
			if (event.pointerId !== activePointer) return;
			const direction = detectSwipe(event.clientX - originX, event.clientY - originY, threshold);
			if (!direction) return;
			originX = event.clientX;
			originY = event.clientY;
			onSwipe(direction);
		}

		function onEnd(event: PointerEvent) {
			if (event.pointerId === activePointer) stopTracking();
		}

		function stopTracking() {
			activePointer = null;
			window.removeEventListener('pointermove', onMove);
			window.removeEventListener('pointerup', onEnd);
			window.removeEventListener('pointercancel', onEnd);
		}

		function onDown(event: PointerEvent) {
			if (activePointer !== null) return;
			if (event.pointerType === 'mouse' && event.button !== 0) return;
			activePointer = event.pointerId;
			originX = event.clientX;
			originY = event.clientY;
			window.addEventListener('pointermove', onMove);
			window.addEventListener('pointerup', onEnd);
			window.addEventListener('pointercancel', onEnd);
		}

		element.addEventListener('pointerdown', onDown);
		return () => {
			element.removeEventListener('pointerdown', onDown);
			stopTracking();
		};
	};
}
