/**
 * Pure decision logic for the in-match pause keyboard shortcut, so the
 * key handling is unit-testable without rendering the gameplay screen.
 */

export type PauseKeyAction = 'pause' | 'resume' | null;

/** Map a keypress + current paused state to the intended action. */
export function pauseKeyAction(key: string, paused: boolean): PauseKeyAction {
  const k = key.toLowerCase();
  if (k !== 'escape' && k !== 'p') return null;
  return paused ? 'resume' : 'pause';
}
