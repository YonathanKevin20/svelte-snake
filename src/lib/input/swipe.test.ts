import { describe, expect, it } from 'vitest';
import { detectSwipe, SWIPE_THRESHOLD_PX } from './swipe';

describe('detectSwipe', () => {
	it('ignores movement shorter than the threshold', () => {
		expect(detectSwipe(0, 0)).toBeNull();
		expect(detectSwipe(SWIPE_THRESHOLD_PX - 1, 0)).toBeNull();
		expect(detectSwipe(10, -10)).toBeNull();
	});

	it('reports the four directions', () => {
		const d = SWIPE_THRESHOLD_PX * 2;
		expect(detectSwipe(d, 0)).toBe('right');
		expect(detectSwipe(-d, 0)).toBe('left');
		expect(detectSwipe(0, d)).toBe('down');
		expect(detectSwipe(0, -d)).toBe('up');
	});

	it('lets the dominant axis win on diagonal movement', () => {
		expect(detectSwipe(40, 10)).toBe('right');
		expect(detectSwipe(10, -40)).toBe('up');
	});

	it('treats an exact diagonal as horizontal', () => {
		expect(detectSwipe(-30, 30)).toBe('left');
	});

	it('accepts a custom threshold', () => {
		expect(detectSwipe(5, 0, 4)).toBe('right');
		expect(detectSwipe(5, 0, 6)).toBeNull();
	});
});
