import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameProvider';
import { matchIdentities } from '../../lib/teamIdentity';
import {
  buildQuestionMarks,
  minuteForQuestion,
  FULL_TIME,
  type TimelineMark,
} from '../../lib/matchTimeline';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/**
 * Top-of-screen 0–90' match clock. Shows not just goals but the live texture
 * of the match — big chances, near misses, saves — and ramps up its styling
 * as the game enters the closing stages (pressure mode after 70', dramatic
 * after 85', golden-goal styling in stoppage time).
 */
export function MatchTimeline() {
  const { room } = useGame();
  const [marks, setMarks] = useState<TimelineMark[]>([]);
  const lastQid = useRef<string | null>(null);

  useEffect(() => {
    if (!room) return;
    if (room.status === 'finished' || room.status === 'lobby') {
      setMarks([]);
      lastQid.current = null;
      return;
    }
    if (room.status === 'showing_result' && room.lastResult) {
      const id = room.lastResult.questionId;
      if (id === lastQid.current) return;
      lastQid.current = id;
      const total = room.selectedQuestions.length || 10;
      const sr = room.stoppageRound ?? 0;
      const minute = sr > 0 ? FULL_TIME + sr : minuteForQuestion(room.currentQuestionIndex, total);
      const [a, b] = room.players;
      const res = room.lastResult.results;
      const fresh = buildQuestionMarks({
        questionId: id,
        minute,
        totalTimeMs: room.settings.questionDurationMs,
        home: a ? toOutcome(res[a.id]) : undefined,
        away: b ? toOutcome(res[b.id]) : undefined,
      });
      if (fresh.length) setMarks((prev) => [...prev, ...fresh]);
    }
  }, [room]);

  if (!room) return null;

  const total = room.selectedQuestions.length || 10;
  const resolved = room.status === 'showing_result' ? 1 : 0;
  const progress = clamp01((room.currentQuestionIndex + resolved) / total);
  const minute = Math.round(progress * FULL_TIME);

  const [a, b] = room.players;
  const [idA, idB] = matchIdentities(a?.name ?? '', b?.name ?? '');
  const sr = room.stoppageRound ?? 0;
  const minuteLabel = sr > 0 ? `90+${sr}'` : `${minute}'`;

  // Late-match intensity states.
  const stoppage = sr > 0;
  const dramatic = !stoppage && minute >= 85;
  const pressure = !stoppage && !dramatic && minute >= 70;

  const barFill = stoppage
    ? 'from-gold-dark to-gold'
    : dramatic
      ? 'from-danger/70 to-gold'
      : 'from-pitch-dark to-pitch';
  const knobColor = stoppage || dramatic ? 'bg-gold' : 'bg-pitch';
  const minuteColor = stoppage || dramatic ? 'text-gold' : pressure ? 'text-gold/80' : 'text-pitch';

  // While a question is live the player is reading and thinking — collapse to a
  // quiet progress whisper (bar + goal marks only). The full clock, minute
  // label, drama badges, and chance dots return at the reveal, when the eye is
  // free. The component stays mounted so its mark history survives.
  if (room.status === 'in_question') {
    return (
      <div className="select-none" aria-hidden>
        <div className="relative h-1 rounded-full bg-white/[0.05]">
          <div
            className={[
              'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r opacity-60 motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-premium',
              barFill,
            ].join(' ')}
            style={{ width: `${progress * 100}%` }}
          />
          {marks
            .filter((m) => m.weight === 'goal')
            .map((m) => (
              <span
                key={m.key}
                className="absolute top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${(Math.min(m.minute, FULL_TIME) / FULL_TIME) * 100}%`,
                  backgroundColor: m.side === 'home' ? idA.color : idB.color,
                }}
              />
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="select-none">
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-white/40">
        <span>0'</span>
        <span className="flex items-center gap-1.5">
          {(pressure || dramatic || stoppage) && (
            <span
              className={[
                'rounded-sm px-1 py-0.5 text-[8px] font-bold',
                stoppage
                  ? 'bg-gold/20 text-gold'
                  : dramatic
                    ? 'bg-danger/20 text-danger'
                    : 'bg-gold/15 text-gold/80',
              ].join(' ')}
            >
              {stoppage ? 'Golden goal' : dramatic ? 'Late drama' : 'Pressure'}
            </span>
          )}
          <span className={['font-mono text-xs font-bold', minuteColor].join(' ')}>{minuteLabel}</span>
        </span>
        <span>90'</span>
      </div>
      <div className="relative h-2 rounded-full bg-white/[0.05]">
        <div
          className={[
            'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r motion-safe:transition-[width] motion-safe:duration-500 motion-safe:ease-premium',
            barFill,
          ].join(' ')}
          style={{ width: `${progress * 100}%` }}
        />
        {/* Current-minute knob */}
        <div
          className={[
            'absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-900 motion-safe:transition-[left] motion-safe:duration-500 motion-safe:ease-premium',
            knobColor,
            dramatic || stoppage ? 'motion-safe:animate-pulse' : '',
          ].join(' ')}
          style={{ left: `${progress * 100}%` }}
        />
        {/* Event markers — goals loud, chances/saves quiet. */}
        {marks.map((m) => {
          const color = m.side === 'home' ? idA.color : idB.color;
          const left = `${(Math.min(m.minute, FULL_TIME) / FULL_TIME) * 100}%`;
          const title = `${m.label} — ${m.minute}' (${m.side === 'home' ? a?.name : b?.name})`;
          if (m.weight === 'goal') {
            return (
              <span
                key={m.key}
                title={title}
                aria-label={title}
                className="absolute -top-1.5 h-2 w-2 -translate-x-1/2 rounded-full ring-2 ring-ink-900"
                style={{ left, backgroundColor: color }}
              />
            );
          }
          // Chances/misses: smaller, fainter dots below the bar.
          return (
            <span
              key={m.key}
              title={title}
              aria-label={title}
              className={[
                'absolute top-3 h-1.5 w-1.5 -translate-x-1/2 rounded-full',
                m.weight === 'miss' ? 'opacity-40' : 'opacity-70',
              ].join(' ')}
              style={{ left, backgroundColor: color }}
            />
          );
        })}
      </div>
    </div>
  );
}

function toOutcome(r: import('../../types/game').PlayerResult | undefined) {
  if (!r) return undefined;
  return {
    scoredGoal: r.scoredGoal,
    isCorrect: r.isCorrect,
    answered: r.selectedAnswer !== null,
    pointsEarned: r.breakdown.total,
    streakBonus: r.breakdown.streakBonus,
    timeTakenMs: r.timeTakenMs,
  };
}
