import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameProvider';
import { teamName } from '../../lib/teamName';
import { COUNTERATTACK_MS } from '../../lib/scoring';
import {
  kickoffLine,
  questionCommentary,
  stoppageLine,
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
      return;
    }

    if (room.status === 'starting' && !kickedOff.current) {
      kickedOff.current = true;
      say(kickoffLine());
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
      const scoreline = `${a.goals}–${b.goals}`;
      say(questionCommentary(sideFor(a, room), sideFor(b, room), scoreline, room.currentQuestionIndex));
    }
  }, [room]);

  if (!line) return null;

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-pitch/15 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-pitch">
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
