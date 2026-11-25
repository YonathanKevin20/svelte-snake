import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

export default defineConfig(
	{
		ignores: ['build/', '.svelte-kit/', 'node_modules/', 'playwright-report/', 'test-results/']
	},
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	prettier,
	svelte.configs.prettier,
	{
		languageOptions: { globals: { ...globals.browser, ...globals.node } },
		rules: {
			// TypeScript already checks undefined identifiers.
			'no-undef': 'off'
		}
	},
	{
		files: ['**/*.svelte', '**/*.svelte.ts'],
		languageOptions: { parserOptions: { parser: ts.parser } }
	},
	{
		// The engine must stay pure and deterministic. See AGENTS.md > Architecture.
		files: ['src/lib/engine/**/*.ts'],
		rules: {
			'no-restricted-globals': [
				'error',
				...['window', 'document', 'localStorage', 'sessionStorage', 'performance', 'navigator'].map(
					(name) => ({ name, message: 'The engine must not touch browser globals.' })
				)
			],
			'no-restricted-properties': [
				'error',
				{ object: 'Math', property: 'random', message: 'Use the seeded RNG instead.' },
				{ object: 'Date', property: 'now', message: 'The engine must not read the clock.' }
			],
			'no-restricted-imports': [
				'error',
				{
					patterns: [
						{
							group: ['svelte', 'svelte/*', '$app/*', '#lib', '#lib/*'],
							message: 'The engine must not depend on Svelte, SvelteKit or other layers.'
						}
					]
				}
			]
		}
	}
);
