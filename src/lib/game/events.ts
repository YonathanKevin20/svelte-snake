import type { GameState } from '../engine';

/** Things worth reacting to (with a sound, say) when the game moves from one state to the next. */
export type GameEvent = 'eat' | 'gameover' | 'win' | 'start' | 'resume' | 'pause';

/** Pure: compares two states and names the single most important thing that changed. */
export function deriveEvent(before: GameState, after: GameState): GameEvent | null {
	if (before === after) return null;
	if (after.status === 'won' && before.status !== 'won') return 'win';
	if (after.status === 'gameover' && before.status !== 'gameover') return 'gameover';
	if (after.status === 'running') {
		if (before.status === 'paused') return 'resume';
		if (before.status !== 'running') return 'start';
		return after.score > before.score ? 'eat' : null;
	}
	if (after.status === 'paused' && before.status === 'running') return 'pause';
	return null;
}

/** What a screen reader should hear for an event. */
export function describeEvent(event: GameEvent, score: number): string {
	switch (event) {
		case 'start':
			return 'Game started';
		case 'resume':
			return 'Resumed';
		case 'pause':
			return 'Paused';
		case 'eat':
			return `Score ${score}`;
		case 'gameover':
			return `Game over. Score ${score}`;
		case 'win':
			return `You won! Score ${score}`;
	}
}

export const EAT_ANNOUNCE_GAP_MS = 1500;

/**
 * Eating can happen every second or so, which would make the announcements noisy, so score
 * updates are rate-limited. Everything else is rare and important, and always speaks. The
 * final score is part of the game-over announcement, so a skipped update loses nothing.
 */
export function shouldAnnounce(
	event: GameEvent,
	nowMs: number,
	lastEatAnnouncedMs: number
): boolean {
	return event !== 'eat' || nowMs - lastEatAnnouncedMs >= EAT_ANNOUNCE_GAP_MS;
}
