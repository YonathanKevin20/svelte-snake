import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../settings/settings';
import { loadHighScore, loadSettings, saveHighScore, saveSettings } from './storage';

function fakeStorage(initial: Record<string, string> = {}) {
	const data = new Map(Object.entries(initial));
	return {
		getItem: (key: string) => data.get(key) ?? null,
		setItem: (key: string, value: string) => void data.set(key, value)
	};
}

describe('high score storage', () => {
	it('round-trips a score', () => {
		const storage = fakeStorage();
		saveHighScore(12, storage);
		expect(loadHighScore(storage)).toBe(12);
	});

	it('returns 0 for missing or corrupt data', () => {
		expect(loadHighScore(fakeStorage())).toBe(0);
		expect(loadHighScore(fakeStorage({ 'svelte-snake:v1:high-score': 'nope' }))).toBe(0);
		expect(loadHighScore(fakeStorage({ 'svelte-snake:v1:high-score': '-4' }))).toBe(0);
	});

	it('survives storage that throws or is unavailable', () => {
		const broken = {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			}
		};
		expect(loadHighScore(broken)).toBe(0);
		expect(() => saveHighScore(5, broken)).not.toThrow();
		expect(loadHighScore(null)).toBe(0);
		expect(() => saveHighScore(5, null)).not.toThrow();
	});
});

describe('settings storage', () => {
	it('round-trips settings', () => {
		const storage = fakeStorage();
		saveSettings({ speed: 'fast', wrap: true, sound: false }, storage);
		expect(loadSettings(storage)).toEqual({ speed: 'fast', wrap: true, sound: false });
	});

	it('returns the defaults when nothing is stored', () => {
		expect(loadSettings(fakeStorage())).toEqual(DEFAULT_SETTINGS);
	});

	it('loads settings saved before sound existed', () => {
		const storage = fakeStorage({ 'svelte-snake:v1:settings': '{"speed":"slow","wrap":true}' });
		expect(loadSettings(storage)).toEqual({ speed: 'slow', wrap: true, sound: true });
	});

	it('survives corrupt or hostile stored data', () => {
		for (const raw of ['{not json', 'null', '"fast"', '{"speed":"warp","wrap":"yes"}']) {
			expect(loadSettings(fakeStorage({ 'svelte-snake:v1:settings': raw }))).toEqual(
				DEFAULT_SETTINGS
			);
		}
	});

	it('survives storage that throws or is unavailable', () => {
		const broken = {
			getItem: () => {
				throw new Error('blocked');
			},
			setItem: () => {
				throw new Error('blocked');
			}
		};
		expect(loadSettings(broken)).toEqual(DEFAULT_SETTINGS);
		expect(() => saveSettings(DEFAULT_SETTINGS, broken)).not.toThrow();
		expect(loadSettings(null)).toEqual(DEFAULT_SETTINGS);
		expect(() => saveSettings(DEFAULT_SETTINGS, null)).not.toThrow();
	});
});
