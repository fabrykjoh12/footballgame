import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameProvider';
import { matchIdentities } from '../../lib/teamIdentity';

interface GoalMark {
  minute: number;
  side: 'home' | 'away';
  key: string;
}

const FULL_TIME = 90;
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Top-of-screen 0–90' match clock with goal markers, for that "match feel". */
export function MatchTimeline() {
  const { room } = useGame();
  const [goals, setGoals] = useState<GoalMark[]>([]);
  const lastQid = useRef<string | null>(null);

  useEffect(() => {
    if (!room) return;
    if (room.status === 'finished' || room.status === 'lobby') {
      setGoals([]);
      lastQid.current = null;
      return;
    }
    if (room.status === 'showing_result' && room.lastResult) {
      const id = room.lastResult.questionId;
      if (id === lastQid.current) return;
      lastQid.current = id;
      const total = room.selectedQuestions.length || 10;
      const minute = Math.round(((room.currentQuestionIndex + 1) / total) * FULL_TIME);
      const [a, b] = room.players;
      const fresh: GoalMark[] = [];
      if (a && room.lastResult.results[a.id]?.scoredGoal)
        fresh.push({ minute, side: 'home', key: `${id}-h` });
      if (b && room.lastResult.results[b.id]?.scoredGoal)
        fresh.push({ minute, side: 'away', key: `${id}-a` });
      if (fresh.length) setGoals((prev) => [...prev, ...fresh]);
    }
  }, [room]);

  if (!room) return null;

  const total = room.selectedQuestions.length || 10;
  const resolved = room.status === 'showing_result' ? 1 : 0;
  const progress = clamp01((room.currentQuestionIndex + resolved) / total);
  const minute = Math.round(progress * FULL_TIME);

  const [a, b] = room.players;
  const [idA, idB] = matchIdentities(a?.name ?? '', b?.name ?? '');

  return (
    <div className="select-none">
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-white/35">
        <span>0'</span>
        <span className="font-mono text-xs font-bold text-pitch">{minute}'</span>
        <span>90'</span>
      </div>
      <div className="relative h-2 rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-pitch-dark to-pitch motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-premium"
          style={{ width: `${progress * 100}%` }}
        />
        {/* Current-minute knob */}
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-900 bg-pitch shadow-glow motion-safe:transition-[left] motion-safe:duration-500 motion-safe:ease-premium"
          style={{ left: `${progress * 100}%` }}
        />
        {/* Goal markers */}
        {goals.map((g) => (
          <span
            key={g.key}
            title={`Goal — ${g.minute}'`}
            aria-label={`Goal at ${g.minute} minutes`}
            className="absolute -top-1.5 h-2 w-2 -translate-x-1/2 rounded-full ring-2 ring-ink-900"
            style={{
              left: `${(g.minute / FULL_TIME) * 100}%`,
              backgroundColor: g.side === 'home' ? idA.color : idB.color,
            }}
          />
        ))}
      </div>
    </div>
  );
}
