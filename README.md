# svelte-snake

<p align="center">
  <img src="docs/demo.gif" width="320" alt="Gameplay: the snake steers toward the food and eats it, the score climbing from 0 to 5, shown on a retro feature-phone with an on-screen keypad.">
</p>

<p align="center">
  <a href="https://github.com/YonathanKevin20/svelte-snake/actions/workflows/ci.yml"><img src="https://github.com/YonathanKevin20/svelte-snake/actions/workflows/ci.yml/badge.svg" alt="CI status"></a>
  &nbsp;
  <strong><a href="https://yonathankevin20.github.io/svelte-snake/">Play it live</a></strong>
</p>

A retro, feature-phone style Snake game that runs in the browser: dark pixels on a pale LCD, ghost pixels for unlit cells, a pixel font and an on-screen keypad. Built with Svelte 5 and SvelteKit.

- Play with the keyboard, by swiping, or with the on-screen keypad.
- Three speeds, optional wrap-around walls, and retro sound effects.
- Installs as an app and plays offline.
- Accessible: fully keyboard operable, with screen reader announcements and a high-contrast mode.
- A pure, deterministic game engine with unit, end-to-end and accessibility tests.

## User guide

### How to play

Steer the snake to the food (the diamond). Every piece you eat scores a point and makes the snake longer, and the snake speeds up as your score grows. The game ends if you hit a wall (unless wrap-around is on) or your own body. If the snake fills the whole board, you win. Your best score is saved.

### Controls

| Action                      | Input                                                                     |
| --------------------------- | ------------------------------------------------------------------------- |
| Steer                       | Arrow keys or WASD, swipe on the screen, or the on-screen keys 2, 4, 6, 8 |
| Start / resume / play again | Enter, or the Start / Resume / Play again button                          |
| Pause                       | Space or P, or the on-screen 5 key                                        |
| Settings                    | Esc, or the on-screen Menu key                                            |
| Mute / unmute               | M                                                                         |

The game pauses automatically when the tab is hidden, and when you open the settings.

### Settings

- **Speed:** slow, normal or fast. The snake still speeds up as your score grows. Changes apply immediately.
- **Walls:** by default hitting a wall ends the game. With wrap on, you come out on the opposite side. A change made mid-game applies from the next game.
- **Sound:** retro beeps for eating, game over, winning, starting and pausing. They only start after you press a key or tap. Press **M** to mute; a "Mute" tag shows on the screen while it is off.

Settings and your best score are saved in the browser. There is one best score for all settings.

### Install and offline

svelte-snake is a progressive web app. In a supported browser, use "Install" or "Add to Home Screen" to get it as an app with its own icon. It keeps working with no connection, because a service worker caches the whole game on the first visit. When a new version is deployed, it takes over the next time you open the game after closing all its tabs.

### Accessibility

- Fully playable with a keyboard, with a clear focus ring on both the light screen and the dark phone.
- Screen readers hear when the game starts, pauses, resumes and ends (with the final score), and the score as you eat.
- Works in Windows high-contrast mode, at 320px wide, with large touch targets, and with nothing blinking.
- Every screen is checked against WCAG 2.2 AA with [axe](https://github.com/dequelabs/axe-core) in the end-to-end tests.

Snake is a visual game, so screen reader users cannot follow the snake itself. It has not yet been tested with real assistive technology.

## Specifications

### Tech stack

| Area      | Choice                                                                          |
| --------- | ------------------------------------------------------------------------------- |
| Framework | Svelte 5 (runes) and SvelteKit 3, TypeScript in strict mode                     |
| Rendering | CSS grid, no canvas                                                             |
| Audio     | Web Audio API, synthesized in the browser (no audio files)                      |
| Offline   | Hand-written service worker and web app manifest (no plugin)                    |
| Tests     | Vitest (unit), Playwright (end to end, desktop and mobile), axe (accessibility) |
| Tooling   | pnpm, Node 26, ESLint, Prettier, svelte-check                                   |
| Hosting   | Static build (`adapter-static`) on GitHub Pages, deployed by GitHub Actions     |

### Game rules

| Rule        | Specification                                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Board       | 20 columns by 15 rows                                                                                                        |
| Snake       | Starts 3 cells long in the middle, heading right                                                                             |
| Scoring     | 1 point per food; eating grows the snake by one cell                                                                         |
| Food        | Spawns on a uniformly random free cell                                                                                       |
| Speed       | Tick interval starts at 260 ms (slow), 200 ms (normal) or 140 ms (fast), drops 3 ms per point, and stops at 110, 70 or 50 ms |
| Steering    | Up to 2 turns are buffered; 180-degree reversals are ignored                                                                 |
| Collision   | A wall (unless wrap is on) or the snake's own body ends the game; moving into the cell the tail is leaving is allowed        |
| Winning     | The game is won when no free cell is left for food                                                                           |
| Persistence | Settings and the best score are stored in `localStorage`, under versioned keys                                               |

### Architecture

```
keyboard, swipe, keypad     input adapters: raw events become directions
          |
          v
   Game controller          Svelte 5 runes: owns the loop, pause and settings
          |
          v
    Game engine             pure TypeScript: step(state) -> state
```

Components only render state and forward input. Dependencies point one way: components, then the controller, then the engine. The engine imports nothing from the other layers.

### Design decisions

- **Pure engine.** `src/lib/engine` is plain TypeScript with no Svelte, DOM, clock or `Math.random()`. A step is `step(state) -> state`. ESLint enforces the boundary.
- **Deterministic.** A seeded RNG lives inside the game state, so the same seed plus the same inputs always replays the same game. That makes tests reproducible and leaves the door open for server-side score validation.
- **Input queue.** Up to two turns are buffered and validated against the last queued direction, so a quick "up, left" cannot reverse the snake into itself.
- **Fixed timestep.** The loop accumulates frame time into whole ticks, so speed does not depend on the display's refresh rate, and long pauses do not cause a catch-up burst.
- **Thin Svelte layer.** A small runes-based `Game` class wraps the engine; components only render state.
- **Events, not coupling.** The controller derives events (eat, game over, pause, ...) and the page turns them into sound and screen reader announcements, so the engine knows nothing about either.
- **Offline first.** Every file is precached by a versioned service worker, and a new deployment waits until old tabs close, so a running game never mixes versions.

### Quality

- **Unit tests** cover the engine rules, the input queue, determinism, the loop, settings, storage, events and sound scheduling.
- **End-to-end tests** run on a desktop and a phone-sized browser: play, touch, settings, sound, offline and installability.
- **Accessibility tests** run axe against every screen state, and check focus order, announcements, high-contrast mode, target sizes and layout at 320px.
- **Continuous integration** runs all of the above on every pull request.

### Hosting

A static build, prerendered with `adapter-static`, deployed to GitHub Pages by GitHub Actions on every push to `main`. The base path is taken from the repository name.

## Development

Requires Node 26 and [pnpm](https://pnpm.io) (the exact version is pinned in `package.json`).

```sh
pnpm install
pnpm dev          # dev server
pnpm test         # unit tests (Vitest)
pnpm test:e2e     # end-to-end tests (Playwright)
pnpm check        # type check
pnpm lint         # Prettier and ESLint
pnpm build        # static build into ./build
```

Before opening a pull request, run `pnpm check && pnpm lint && pnpm test && pnpm build`. Conventions, architecture rules and maintenance notes are in [AGENTS.md](AGENTS.md).

## License and credits

[MIT](LICENSE) for the code.

The pixel font is [Press Start 2P](https://fontsource.org/fonts/press-start-2p), under the SIL Open Font License 1.1. Its license text, together with the notices for Svelte and SvelteKit (both MIT), is in [`static/third-party-licenses.txt`](static/third-party-licenses.txt), and is served with the site.
