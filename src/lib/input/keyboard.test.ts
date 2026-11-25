import { describe, expect, it } from 'vitest';
import { keyToAction } from './keyboard';

describe('keyToAction', () => {
	it('maps arrows and WASD (any case) to turns', () => {
		expect(keyToAction('ArrowUp')).toEqual({ type: 'turn', direction: 'up' });
		expect(keyToAction('a')).toEqual({ type: 'turn', direction: 'left' });
		expect(keyToAction('D')).toEqual({ type: 'turn', direction: 'right' });
	});

	it('maps Enter, Space and P', () => {
		expect(keyToAction('Enter')).toEqual({ type: 'primary' });
		expect(keyToAction(' ')).toEqual({ type: 'pause' });
		expect(keyToAction('p')).toEqual({ type: 'pause' });
	});

	it('maps Escape to the menu', () => {
		expect(keyToAction('Escape')).toEqual({ type: 'menu' });
	});

	it('maps M (any case) to mute', () => {
		expect(keyToAction('m')).toEqual({ type: 'mute' });
		expect(keyToAction('M')).toEqual({ type: 'mute' });
	});

	it('ignores everything else', () => {
		expect(keyToAction('Tab')).toBeNull();
		expect(keyToAction('x')).toBeNull();
	});
});
