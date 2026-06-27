import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameProvider';
import { teamName } from '../../lib/teamName';
import { COUNTERATTACK_MS } from '../../lib/scoring';
import { minuteForQuestion } from '../../lib/matchTimeline';
import {
  kickoffLine,
  questionCommentary,
  stoppageLine,
  LATE_MINUTE,
  type Side,
} from '../../lib/commentary';
import type { Player, Room } from '../../types/game';

/** A live, single-line commentary bar that reacts to each revealed question. */
export function CommentaryTicker() {
  const { room } = useGame();
  const [line, setLine] = useState('');
  const [tick, setTick] = useState(0); // bumps to re-trigger the entrance animation
  const kickedOff = useRef(false);
  const lastQid = useRef<string | null>(null);
  const lastRound = useRef(0);
  const prevGoals = useRef<{ h: number; a: number }>({ h: 0, a: 0 });

  useEffect(() => {
    if (!room) return;
    const say = (l: string) => {
      setLine(l);
      setTick((t) => t + 1);
    };

    // Reset between matches (rematch goes finished → starting).
    if (room.status === 'finished' || room.status === 'lobby') {
      kickedOff.current = false;
      lastQid.current = null;
      lastRound.current = 0;
      prevGoals.current = { h: 0, a: 0 };
      return;
    }

    if (room.status === 'starting' && !kickedOff.current) {
      kickedOff.current = true;
      say(kickoffLine(0, room.settings.mode));
      return;
    }

    // Announce each new sudden-death round.
    const round = room.stoppageRound ?? 0;
    if (room.status === 'in_question' && round > lastRound.current) {
      lastRound.current = round;
      say(stoppageLine(round));
      return;
    }

    if (room.status === 'showing_result' && room.lastResult) {
      const id = room.lastResult.questionId;
      if (id === lastQid.current) return;
      lastQid.current = id;
      const [a, b] = room.players;
      if (!a || !b) return;

      const before = prevGoals.current;
      const after = { h: a.goals, a: b.goals };
      const sr = room.stoppageRound ?? 0;
      const total = room.selectedQuestions.length || 10;
      const minute = sr > 0 ? 90 + sr : minuteForQuestion(room.currentQuestionIndex, total);

      // Detect cross-player drama from the before/after scoreline.
      const homeScored = after.h > before.h;
      const awayScored = after.a > before.a;
      const oneScored = homeScored !== awayScored; // exactly one side scored
      const wasLevel = before.h === before.a;
      const nowLevel = after.h === after.a;
      const equalizer = oneScored && !wasLevel && nowLevel;
      const lateWinner = oneScored && minute >= LATE_MINUTE && !nowLevel && (wasLevel || leadFlipped(before, after));

      prevGoals.current = after;

      const scoreline = `${after.h}–${after.a}`;
      say(
        questionCommentary(sideFor(a, room), sideFor(b, room), scoreline, room.currentQuestionIndex, {
          minute,
          mode: room.settings.mode,
          equalizer,
          lateWinner,
        }),
      );
    }
  }, [room]);

  if (!line) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Live commentary"
      className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2"
    >
      <span
        aria-hidden
        className="inline-flex shrink-0 items-center gap-1 rounded-md bg-pitch/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-pitch"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-pitch motion-safe:animate-pulse" />
        Live
      </span>
      <span
        key={tick}
        className="min-w-0 flex-1 text-sm leading-snug text-white/80 motion-safe:animate-fade-in"
      >
        {line}
      </span>
    </div>
  );
}

/** Did the side that's now ahead change (a fresh go-ahead goal)? */
function leadFlipped(
  before: { h: number; a: number },
  after: { h: number; a: number },
): boolean {
  const leadBefore = Math.sign(before.h - before.a);
  const leadAfter = Math.sign(after.h - after.a);
  return leadAfter !== 0 && leadAfter !== leadBefore;
}

function sideFor(p: Player, room: Room): Side {
  const r = room.lastResult?.results[p.id];
  return {
    name: teamName(p.name),
    isCorrect: !!r?.isCorrect,
    scoredGoal: !!r?.scoredGoal,
    fast: !!r?.isCorrect && (r?.timeTakenMs ?? Infinity) < COUNTERATTACK_MS,
    hatTrick: p.streak >= 3 && p.streak % 3 === 0,
  };
}
