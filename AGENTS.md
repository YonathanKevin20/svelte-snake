# AGENTS.md

Guidance for AI coding agents (and humans) working on this repository.
Read this file fully before making changes. When in doubt, prefer the smaller, simpler change and keep the engine/UI separation intact.

## Project overview

**svelte-snake** is a retro, feature-phone style Snake game, built as a portfolio project. It is a **frontend-only, statically hosted** web app: playable in the browser on desktop and mobile, deployed to GitHub Pages.

Goals, in priority order:

1. **Correct, deterministic game logic** that is fully unit-tested.
2. **Maintainability**: small modules, clear boundaries, strict types, green CI.
3. **Authentic feature-phone feel**: LCD palette, ghost pixels, pixel font, keypad controls, retro beeps.
4. **Great on mobile**: touch controls are a first-class feature, not an afterthought.

Non-goals (for now): backend, accounts, leaderboard, multiplayer. See [Roadmap](#roadmap).

## Tech stack

- **Svelte 5** (runes: `$state`, `$derived`, `$effect`, `$props`) with **SvelteKit 3**. SvelteKit options live in `vite.config.ts` (passed to `sveltekit({...})`); there is no `svelte.config.js`.
- **TypeScript** in strict mode
- **`@sveltejs/adapter-static`** (prerendered static output for GitHub Pages)
- **Node 26** (see `.nvmrc`; CI resolves it to the latest 26.x) and **pnpm** as the package manager (version pinned in `package.json` > `packageManager`)
- **Vitest** for unit tests, **Playwright** for end-to-end tests
- **ESLint + Prettier + `svelte-check`** for linting, formatting and type checking
- Plain **CSS with custom properties** for theming. Do not add Tailwind or a UI component library.

Do not add new runtime dependencies without a clear reason. Prefer the platform (Web Audio, Pointer Events, `localStorage`) over libraries. If a dependency is needed, justify it in the PR description.

## Commands

Run these with `pnpm`. If a script below does not exist yet, add it to `package.json` using this exact name.

| Command           | Purpose                                                        |
| ----------------- | -------------------------------------------------------------- |
| `pnpm install`    | Install dependencies                                           |
| `pnpm dev`        | Start the dev server                                           |
| `pnpm build`      | Production build (static output)                               |
| `pnpm preview`    | Serve the production build locally                             |
| `pnpm check`      | Type checking: app and service worker                          |
| `pnpm lint`       | ESLint and Prettier check                                      |
| `pnpm format`     | Prettier write                                                 |
| `pnpm test`       | Vitest unit tests (run once)                                   |
| `pnpm test:watch` | Vitest in watch mode                                           |
| `pnpm test:e2e`   | Playwright end-to-end tests                                    |
| `pnpm icons`      | Regenerate the app icons and favicon                           |
| `pnpm demo`       | Re-record `docs/demo.gif` (needs ffmpeg and a running preview) |

**Before considering any task done, run:** `pnpm check && pnpm lint && pnpm test && pnpm build`.

## Architecture

The most important rule in this repo: **the game engine is pure TypeScript and knows nothing about Svelte, the DOM, time, or the browser.**

```
Input (keyboard / swipe / keypad)
        |
        v
  Game controller (Svelte 5 runes, src/lib/game)    <-- owns the loop and timing
        |   calls
        v
  Engine (pure functions, src/lib/engine)           <-- step(state, input) -> state
        |
        v
  Components render state (src/lib/components)      <-- no game logic here
```

### Layer rules

- **`src/lib/engine/`**: pure and deterministic.
  - No imports from `svelte`, `$app/*`, or any browser global (`window`, `document`, `localStorage`, `performance`).
  - No `Math.random()` and no `Date.now()`. Randomness comes from the seeded RNG passed in via state.
  - Functions take state in and return new state. Do not mutate inputs.
  - State must be JSON-serializable.
  - Use **relative imports only** inside the engine (no `#lib` alias), so the folder can later be extracted into a shared package or run on a server unchanged.
  - ESLint enforces these rules for `src/lib/engine/**` (restricted globals, `Math.random`, `Date.now` and imports). Do not disable them.
- **`src/lib/game/`**: the Svelte glue.
  - A runes-based controller class wraps the engine and exposes reactive state (`status`, `score`, `snake`, `food`, ...).
  - Owns the fixed-timestep loop (`requestAnimationFrame` with an accumulator, not a bare `setInterval`), pause/resume, and visibility handling.
- **`src/lib/components/`**: presentational Svelte components. They render state and emit events. No game rules.
- **`src/lib/input/`**: keyboard, swipe and keypad adapters. They translate raw events into engine `Direction` inputs and nothing else.
- **`src/lib/audio/`**: synthesized sound. `effects.ts` holds the jingles as plain note data; `sound.ts` is a small player over the Web Audio API (`createSoundPlayer`) with an `enabled` flag. The `AudioContext` is created lazily on first need and never while muted. `unlock()` is called from user gestures (first key press or `pointerup`), because browsers, and iOS Safari especially, only start audio after one.
- **`src/lib/storage/`**: the only place that touches `localStorage`. Wrap access in try/catch (it can throw or be unavailable) and version the stored schema.

Dependencies point one way: `components -> game -> engine`. The engine never imports from other layers.

**Imports:** inside `src/lib/`, use relative imports. In `src/routes/`, use the `#lib/*` alias (defined under `imports` in `package.json`; it is not `$lib`). Imports of `.svelte.ts` modules use the `.js` extension, e.g. `#lib/game/game.svelte.js`.

### Layout

```
src/
  lib/
    engine/        types, geometry, rng, food, speed (profiles), state, input-queue, step, index, test-utils, *.test.ts
    game/          game.svelte.ts (runes controller), loop.ts (fixed timestep)
    components/    PhoneFrame.svelte, Board.svelte, Hud.svelte, Keypad.svelte, SettingsDialog.svelte
    input/         keyboard.ts (key -> action mapping), swipe.ts (swipe attachment + detectSwipe)
    settings/      settings.ts (Settings type, defaults, parseSettings, configFor)
    pwa/           cache.ts (pure cache-name and precache helpers)
    storage/       storage.ts (versioned high score and settings)
    styles/        theme.css (LCD palette tokens)
  routes/
    +layout.ts     (prerender = true)
    +layout.svelte
    +page.svelte
  service-worker/  index.ts and its own tsconfig.json (runs in a worker, not the page)
scripts/
  generate-icons.mjs  builds the PNG icons and favicon from one pixel-art snake
  record-demo.mjs     records docs/demo.gif (fake clock, pinned seed, auto-player, ffmpeg)
docs/
  demo.gif            the README animation; keep it out of static/ so it is not precached
static/
  .nojekyll, manifest.webmanifest, icon-192/512/maskable-512.png, apple-touch-icon.png
tests/
  e2e/             Playwright specs (desktop and Pixel 7 projects)
.github/
  workflows/       ci.yml, deploy.yml
  dependabot.yml
```

### PWA and offline

The game is an installable, offline-capable PWA, hand-written with SvelteKit's built-in service worker support (no plugin, no new dependencies).

- **Service worker** (`src/service-worker/index.ts`): on install it precaches every built file, every file in `static/` (except hosting files, see `isPrecachable`) and the prerendered home page, all-or-nothing, so a visitor never ends up with a half-cached game. Each deployment gets its own cache (`cacheName(version)`); older ones are deleted on activate. It takes control on first visit (`clients.claim()`). Navigations go **network first**, falling back to the cached home page when offline; built and static files are served **cache first**.
- **Updates:** a new service worker waits until all tabs of the old one close (there is deliberately no `skipWaiting`), so a running game never mixes old and new files. A visitor sees an update on their next fresh visit.
- **SvelteKit 3 specifics:** the service worker imports `self` from `$app/service-worker`, the file lists from `$app/manifest` and `version` from `$app/env` (not the old `$service-worker`). `src/service-worker/` has its own `tsconfig.json` (extending `$app/tsconfig/service-worker`) and is excluded from the root one; `pnpm check` runs both. `resolve()` only accepts routes, so build file paths go through `withBase`.
- **Base path:** the manifest uses relative URLs (`start_url` and `scope` are `./`, icon `src`s have no leading slash) so it works under `/svelte-snake/` and at a root. Keep it that way. Link to static files with `asset('name.ext')`, which is type-checked against `static/`.
- **Icons:** do not edit the PNGs by hand. Change the art in `scripts/generate-icons.mjs` and run `pnpm icons`; it also rewrites `src/lib/assets/favicon.svg`. Maskable icons keep the art inside the safe zone.
- **Weight:** everything is precached, so keep the build small. Only the Latin subset of the pixel font is imported for that reason; adding fonts or images adds to every first visit.
- **Testing:** e2e specs check the manifest and every icon's real size, that the worker takes control and precaches the game, and that the game reloads and plays with the network off. Playwright's offline switch is a weaker check than a stopped server, so after changing the worker also build, serve and stop the server by hand (done for both `/` and a `/svelte-snake/` base path when this was written).

### Svelte and hydration notes

- The `Game` class uses `$state.raw` for the immutable engine state and `$derived` for `status`, `score` and `intervalMs`. Keep `status` as a `$derived`: effects that read it must not re-run on every tick, or the loop would restart each frame.
- The first (prerendered) frame uses a fixed seed so server and client markup match. `Game.hydrate()` runs in `onMount`, loads the saved high score and swaps in a random seed.
- `<main data-ready>` flips to `true` after hydration. E2E tests wait for it before interacting.
- `.playfield[data-direction]` mirrors the engine's last applied direction. It is a test hook for e2e specs that need to observe steering; do not use it for styling or logic.

## Game rules and engine requirements

These behaviors are the spec. Each one must have unit tests.

- Grid-based board (default around 20x15; size is configurable). The snake moves exactly one cell per tick.
- **Input queue:** buffer up to 2 direction changes per tick, applied one per tick in order.
- **No 180-degree reversals:** validate against the **last applied** direction (or the last queued one), never just the last key pressed.
- **Food spawning:** choose uniformly from the set of **free cells**. Never use "random until it does not collide".
- **Growth and scoring:** eating food grows the snake by one and increases score.
- **Collision:** hitting yourself ends the game. Hitting a wall ends the game, unless wrap-around mode is on.
- **Tail cell rule:** moving into the cell the tail is vacating this tick is **not** a collision (unless the snake is growing this tick). Test this explicitly.
- **Win condition:** if no free cells remain, the status becomes `won`.
- **Speed:** tick interval decreases as score increases, with a floor. The curve lives in one named, tested function.
- **Determinism:** the same seed plus the same input sequence must always produce the same game. Add a test that replays a recorded input log and asserts the final state.

Game statuses: `idle`, `running`, `paused`, `gameover`, `won`.

## Frontend and UX requirements

- **Look:** greenish-gray LCD palette, dark "pixels" on a pale background, faint **ghost pixels** for unlit cells, a pixel font, and a phone-bezel frame. All colors, sizes and fonts are CSS custom properties in `theme.css`. No hard-coded colors in components.
- **Rendering:** CSS grid for the board. Keep cells simple (no per-cell heavy components or layout thrash). If the board is made larger, measure before optimizing.
- **Trademarks:** do not use Nokia names, logos, fonts or artwork. The look is "feature-phone style". Use OFL-licensed fonts (currently Press Start 2P via `@fontsource`).
- **Responsive:** the whole game must fit in the viewport on small phones without scrolling. Use relative units and `100dvh`-aware layout.
- **Controls:**
  - Keyboard: arrow keys and WASD to move, `Space` or `P` to pause, `Enter` to start or restart, `Esc` to open settings, `M` to mute.
  - Touch: swipe anywhere on the playfield (`input/swipe.ts`, a Svelte attachment; one continuous gesture can chain several turns) plus the on-screen keypad (`Keypad.svelte`): 2/4/6/8 steer, 5 starts, pauses or resumes. A swipe on the start screen starts the game.
  - The playfield sets `touch-action: none` so swipes never scroll or zoom the page. Do not remove it. Do not use pointer capture in the swipe code, because it would break clicks on the overlay button.
  - Keypad keys act on `pointerdown` (no tap delay) and call `preventDefault` so focus stays off them. Keyboard activation of a focused key arrives as a click with `detail === 0` and is handled separately. Keep both paths, and keep every key a real `<button>` with an `aria-label`.
  - The global keydown handler ignores Enter and Space when a `<button>` is focused, so they keep their native meaning there.
- **Pause on blur:** auto-pause when the tab loses visibility.
- **Sound:** short synthesized square-wave effects: eat, game over, win, start/resume and pause. No audio files. Sound is on by default and persists as a setting; `M` toggles it and the screen shows a "Mute" tag while it is off. Never start audio before a user gesture. Keep effects short and quiet (the volume constant is deliberately low).
  - **Event flow:** the engine knows nothing about sound. `Game` derives events (`game/events.ts`, a pure `deriveEvent(before, after)`) whenever its state changes and calls `game.onevent`; the page forwards them to the sound player. Automatic pauses (hidden tab, opening the menu) are silent. New sounds mean a new event and a new entry in `EFFECTS`, plus a test for each.

### Settings

- Three settings: **speed** (`slow | normal | fast`, tick profiles in `engine/speed.ts`), **wrap** (walls kill or wrap) and **sound** (on or muted; default on). Defaults, validation (`parseSettings`) and `configFor` live in `settings/settings.ts`. They persist under `svelte-snake:v1:settings`; changing the shape needs a version bump or a migration.
- **Speed applies live** (it only changes the tick interval). **Wrap is baked into the engine `Config` when a game is created**, so it applies immediately only before the game starts and otherwise from the next game (`Game.wrapPending` drives a note in the dialog). Never swap the config of a running game.
- All reads of stored settings go through `parseSettings`, so corrupt or hostile storage falls back to defaults field by field. New settings must be added there too.
- The dialog is a native `<dialog>` opened with `showModal()` (focus trap, inert background, Escape to close). Opening it pauses a running game; closing it leaves the game paused. The global keydown handler returns early while it is open (it asks the element via `isOpen()`), otherwise arrow keys would steer or start a game behind it. Do not mirror the open state into a variable from the `close` event: that event fires after the dialog has already closed, so a key pressed in between is misread (this caused a rare, real test failure).
- The Menu key uses a plain `click`, not `pointerdown` like the other keys: opening a modal on pointerdown would let the same gesture's click land on the backdrop and close it again.
- There is a single high score across all settings. Per-mode scores would be a reasonable follow-up.

### Accessibility (required, not optional)

The target is **WCAG 2.2 AA**. It is enforced by an automated axe audit in e2e (`tests/e2e/a11y.spec.ts`, every screen state on desktop and mobile, zero violations allowed) plus targeted tests for what axe cannot see. A change that breaks any of them is not done.

**Rules, and why they exist**

- **Keyboard:** everything is operable by keyboard, with a logical Tab order. The keypad's DOM order is its reading order (Menu, 2, 4, 5, 6, 8), not the order the keys were written in. Do not use positive `tabindex`.
- **Names:** an accessible name must contain the text printed on the control (WCAG 2.5.3, Label in Name), so voice control ("click 4") works. Keypad keys are named like `4, Left`; the digit and arrow inside are `aria-hidden`. Menu, Close and similar are named by their visible text.
- **Focus ring:** two-tone, set globally in `theme.css` (dark inner line, yellow outer ring) so it keeps 3:1 contrast on both the light LCD and the dark phone. A single yellow ring fails on the LCD. Components that restyle focus (the segmented speed control) must keep both tones. Never `outline: none` without a replacement.
- **Announcements:** one polite live region (`role="status"`) in `+page.svelte`, fed by game events through `describeEvent`. It says: started, paused, resumed, game over with the score, won, sound on or off, and the score after eating. Score updates are rate-limited (`shouldAnnounce`); everything else always speaks. `announce()` clears the region before setting the text so a repeated message is spoken again. Add a new announcement by adding an event and a `describeEvent` case with a test.
- **Motion:** nothing may blink or animate on its own (WCAG 2.2.2); a test asserts `document.getAnimations()` is empty. The title used to blink, which also failed contrast mid-blink. If animation is ever added, honor `prefers-reduced-motion` and keep it under 5 seconds.
- **Contrast:** text needs 4.5:1, and interface parts 3:1. The LCD palette and key colors pass; axe checks text pairs. Do not use opacity to dim text.
- **High-contrast modes (`forced-colors`):** backgrounds are replaced there, so anything drawn only with a background disappears. The board, keypad arrows, keys and the selected speed segment have `@media (forced-colors: active)` rules that use system colors (`CanvasText`, `ButtonText`, `Highlight`, ...). Keep those blocks last in their style sections so they win the cascade. Any new element that conveys state through a background needs the same treatment, and a test.
- **Targets:** every control is at least 24x24 CSS pixels (WCAG 2.5.8); a test measures them. Keep text at 0.6rem or larger.
- **Reflow:** no horizontal scrolling at 320px wide (WCAG 1.4.10); a test checks the page and the dialog. The phone frame also shrinks on short screens.
- **Gestures:** swiping is never the only way to steer; the keypad and keyboard cover it (WCAG 2.5.1). The game is real-time, but Slow speed and pause are always available.
- **Structure:** one `<h1>` (the phone's label), a `<main>`, `<h2>` for the overlay title and the dialog title, native `<dialog>`, `<fieldset>` and `<legend>` for setting groups, and `lang="en"` on `<html>`. The board is `role="img"` with a label; it is a visual playfield.
- **Semantic elements:** use `<button>` for keys, never clickable `<div>`s.

**Known limits**

- Snake is inherently visual. Screen reader users get state and score announcements, but not the position of the snake or the food, so it is not meaningfully playable without sight. This is documented rather than hidden.
- Automated tests catch roughly a third of real-world issues. Nobody has yet tested this with a real screen reader (VoiceOver, TalkBack, NVDA) or on real high-contrast systems. Do that before claiming full conformance.
- On a phone in landscape the page scrolls vertically (the frame is sized for portrait).

## Code style

- TypeScript `strict` on. **No `any`.** Use `unknown` and narrow, or define a proper type.
- Prefer `type` aliases and discriminated unions for states and inputs. Use `readonly` where it helps.
- Small, single-purpose functions and files. If a file passes roughly 200 lines, consider splitting it.
- Name things by domain (`applyInput`, `spawnFood`, `isOpposite`), not by implementation.
- Comments explain **why**, not what. The engine's non-obvious rules (tail cell, input queue) deserve a short comment.
- Svelte 5 runes only. Do not use legacy `export let`, `$:` reactive statements, or Svelte stores for new code.
- Keep components small and prop-driven. Use `$derived` for computed values, and keep `$effect` for real side effects (never for deriving state).
- Follow the Prettier and ESLint config. Do not disable lint rules inline without a comment explaining why.
- Use meaningful, conventional commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`).

## Testing

- **Unit (Vitest):** the engine must be thoroughly covered. Required cases include movement, input queue behavior, reversal blocking, food spawn on free cells only, growth, wall and self collision, wrap mode, the tail-cell rule, win state, speed curve, and seeded determinism.
- Tests live beside the code as `*.test.ts`. They must be fast, deterministic and independent of the DOM.
- Use a fixed seed in tests. Never rely on real time. Test the loop's accumulator logic with an injected clock.
- **E2E (Playwright):** a small, stable smoke suite: load the page, start, die, see game over, restart, pause and resume. It runs on a desktop and a mobile (Pixel 7) project. Touch specs drive swipes with mouse pointer events and the keypad with clicks. Use `exact: true` when locating the "Start" button (and the dialog's role/name queries for settings), because the keypad's "Start, pause or resume" also matches. Wait for `main[data-ready="true"]` before interacting, and locate things by role (`getByRole('heading', ...)`), because visible text is also announced in the `aria-live` region.
- Sound e2e specs install a fake `AudioContext` with `page.addInitScript` that counts the oscillators the game schedules, so they can assert "a beep was requested" without audio hardware. Real playback, volume and the iOS unlock path need a manual check on a device.
- Fix bugs by first writing a failing test that reproduces them.
- Do not lower coverage or delete tests to make CI pass.

## Deployment (GitHub Pages)

The site is a static export served from a **project path** (`/svelte-snake/`), so base-path handling is critical.

- Use `adapter-static` and set `export const prerender = true` in `src/routes/+layout.ts`.
- `vite.config.ts` sets `paths.base` from the `BASE_PATH` environment variable: empty in local dev and previews, `/svelte-snake` (from `github.event.repository.name`) in the deploy workflow.
- SvelteKit 3 no longer exports `base` from `$app/paths`. Build internal URLs with `resolve()` and static asset URLs with `asset()`, or import assets so Vite handles them. Never hard-code root-absolute paths like `/icons/x.png`. Built output uses relative asset paths.
- `static/.nojekyll` is a harmless safety net. Jekyll only matters when publishing from a branch, and `actions/upload-pages-artifact` v4 and later leaves dotfiles out of the artifact anyway, so it does not reach the deployed site. Do not rely on it.
- `deploy.yml` builds on push to `main` and publishes with the official GitHub Pages actions. `ci.yml` runs `check`, `lint`, `test`, `build` and e2e on every pull request. One-time repository setting: **Pages > Source = GitHub Actions**.
- If a service worker or web manifest is added, its scope, `start_url` and asset paths must respect the base path. Verify with `pnpm build && pnpm preview` using the same `BASE_PATH` as production.
- **Workflow actions** (current as of Nov 2026; verify before changing): `actions/checkout@v7`, `pnpm/setup@v3`, `actions/upload-pages-artifact@v5` and `actions/deploy-pages@v5`. `pnpm/setup` is pnpm's successor to `pnpm/action-setup` for pnpm 11 and newer (this project pins pnpm 12): it installs the pinned pnpm, installs Node from `.nvmrc`, and runs `pnpm install` itself, with `require-lockfile: true` making that a frozen install. If the project ever drops to pnpm 10 or older, switch back to `pnpm/action-setup` plus `actions/setup-node`.
- Pin GitHub Actions to major versions (or SHAs) and keep workflow permissions minimal. Dependabot (`.github/dependabot.yml`) keeps npm packages and actions up to date, so expect its pull requests to bump these majors.
- The workflows have not been run yet: the first push to GitHub is their first real execution. Read the first run's logs, and fix problems at the action level (versions, inputs) before suspecting the app.

## Roadmap

Work in this order. Ship each stage as a working, deployed version.

**Current status:** it is an installable, offline-capable PWA with an automated WCAG 2.2 AA audit. The engine (with tests), the fixed-timestep loop, keyboard and touch controls (swipe and on-screen keypad), a settings panel (speed, wrap and sound), pause, auto-pause on hidden tab, `localStorage` high score, the LCD theme, CI and the Pages deploy workflow are in place. Sound effects with a mute toggle are in. Remaining for the MVP: confirm the first deploy and add a screenshot or GIF to the README. Known limitation: in landscape on a phone the layout scrolls vertically, because the phone frame is sized for portrait.

1. **MVP:** core loop, score, game over, restart, pause, keyboard controls, `localStorage` high score, retro LCD theme, engine tests, CI, GitHub Pages deploy.
2. **Polish:** ~~swipe and keypad controls~~ (done), ~~speed and wrap-mode settings~~ (done), ~~sound with mute~~ (done), ~~offline-capable PWA~~ (done), ~~accessibility pass~~ (done, see the Accessibility section for its limits).
3. **Stretch (documented, not in scope now):** global leaderboard and server-side score validation by replaying `seed + inputs` through the same engine; ghost replays; maze levels; timed bonus food. These require a backend hosted separately, since GitHub Pages is static-only. Do not add backend code or dependencies until this stage is explicitly started. Keep the engine extractable so this later step is cheap.

## Boundaries for agents

**Always**

- Keep the engine pure and covered by tests.
- Run the full check command before finishing.
- Keep changes small and focused, and update docs when behavior changes.
- Ask when a requirement is ambiguous instead of guessing.

**Ask first**

- Adding a dependency, a new top-level folder, or a build tool.
- Changing the engine's public API or the stored `localStorage` schema.
- Changing deployment configuration or the base-path setup.

**Never**

- Put game logic in Svelte components.
- Use `Math.random()`, `Date.now()` or DOM APIs inside `src/lib/engine/`.
- Commit secrets, `.env` files, or build output.
- Add backend code before the stretch stage begins.
- Disable tests, type checks or lint rules to get a green build.

## Definition of done

A change is done when:

- [ ] It does what was asked, and nothing unrelated changed.
- [ ] New or changed engine behavior has tests.
- [ ] `pnpm check && pnpm lint && pnpm test && pnpm build` all pass.
- [ ] It works with a production build under the GitHub Pages base path.
- [ ] It remains usable with keyboard only and on a small touch screen.
- [ ] Relevant docs (README or this file) are updated.

## Useful references

- Svelte 5: https://svelte.dev/docs/svelte/overview
- SvelteKit and `adapter-static`: https://svelte.dev/docs/kit/adapter-static
- SvelteKit `paths.base`: https://svelte.dev/docs/kit/configuration#paths
- Vitest: https://vitest.dev
- Playwright: https://playwright.dev
- GitHub Pages with custom workflows: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- MDN Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- MDN Pointer Events: https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- AGENTS.md format: https://agents.md
