import { describe, expect, it } from 'vitest';
import { configFor, DEFAULT_SETTINGS, parseSettings } from './settings';

describe('parseSettings', () => {
	it('keeps valid values', () => {
		expect(parseSettings({ speed: 'fast', wrap: true, sound: false })).toEqual({
			speed: 'fast',
			wrap: true,
			sound: false
		});
	});

	it('falls back field by field', () => {
		expect(parseSettings({ speed: 'warp', wrap: true, sound: false })).toEqual({
			speed: DEFAULT_SETTINGS.speed,
			wrap: true,
			sound: false
		});
		expect(parseSettings({ speed: 'slow', wrap: 'yes', sound: 0 })).toEqual({
			speed: 'slow',
			wrap: DEFAULT_SETTINGS.wrap,
			sound: DEFAULT_SETTINGS.sound
		});
	});

	it.each([null, undefined, 42, 'nope', []])('returns the fallback for %j', (value) => {
		expect(parseSettings(value)).toEqual(DEFAULT_SETTINGS);
	});

	it('merges a partial patch over the current settings', () => {
		const current = { speed: 'slow', wrap: true, sound: false } as const;
		expect(parseSettings({ speed: 'fast' }, current)).toEqual({
			speed: 'fast',
			wrap: true,
			sound: false
		});
	});

	it('defaults sound on, so settings saved before sound existed still load', () => {
		expect(parseSettings({ speed: 'fast', wrap: true }).sound).toBe(true);
	});
});

describe('configFor', () => {
	it('carries the wrap setting into the engine config', () => {
		expect(configFor({ ...DEFAULT_SETTINGS, wrap: true }).wrap).toBe(true);
		expect(configFor({ ...DEFAULT_SETTINGS, wrap: false }).wrap).toBe(false);
	});
});
