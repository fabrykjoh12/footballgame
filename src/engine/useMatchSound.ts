/**
 * useMatchSound — plays synthesized cues in reaction to match state changes.
 *
 * Kept separate from useMatchEngine so audio is a pure side-observer of the
 * FSM: it never drives state, only reacts to it. Honours the user's sound
 * setting and is a no-op where Web Audio is unavailable.
 */

import { useEffect, useRef } from 'react';
import type { MatchState } from './matchReducer.ts';
import { soundEngine } from '../lib/sound.ts';

export function useMatchSound(state: MatchState, enabled: boolean): void {
  const prevPhaseRef = useRef<string>(state.phase.kind);
  const prevResultsRef = useRef<number>(state.results.length);

  useEffect(() => {
    soundEngine.setEnabled(enabled);
  }, [enabled]);

  useEffect(() => {
    const phase = state.phase.kind;
    const prevPhase = prevPhaseRef.current;
    const resultCount = state.results.length;
    const prevResults = prevResultsRef.current;

    // A new question result landed → play goal / correct / wrong.
    if (resultCount > prevResults) {
      const latest = state.results[resultCount - 1];
      if (latest) {
        if (latest.playerGoals > 0 || latest.opponentGoals > 0) {
          soundEngine.goal();
        } else if (latest.player.correct) {
          soundEngine.correct();
        } else {
          soundEngine.wrong();
        }
      }
    }

    // Phase-entry cues.
    if (phase !== prevPhase) {
      if (phase === 'in_question' && prevPhase === 'countdown') {
        soundEngine.kickoff();
      } else if (phase === 'half_time') {
        soundEngine.halfTime();
      } else if (phase === 'post_match') {
        soundEngine.whistle();
      }
    }

    prevPhaseRef.current = phase;
    prevResultsRef.current = resultCount;
  }, [state]);
}
