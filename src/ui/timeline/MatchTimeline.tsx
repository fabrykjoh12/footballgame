import { QUESTIONS_PER_MATCH, type QuestionResult } from '../../types/match.ts';
import { questionToMinute } from '../../engine/scoring.ts';

interface MatchTimelineProps {
  results: readonly QuestionResult[];
  currentIndex: number;
}

/** Horizontal 1'→90' progression bar with goal markers. */
export function MatchTimeline({ results, currentIndex }: MatchTimelineProps) {
  const progress = Math.min(
    100,
    (questionToMinute(Math.max(0, currentIndex), QUESTIONS_PER_MATCH) / 90) * 100,
  );

  return (
    <div className="w-full">
      <div className="relative h-2 w-full rounded-full bg-white/10">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-neon-grad transition-[width] duration-500"
          style={{ width: `${progress}%` }}
        />
        {results.map((r) => {
          const minute = questionToMinute(r.index, QUESTIONS_PER_MATCH);
          const left = (minute / 90) * 100;
          const goals = r.playerGoals + r.opponentGoals;
          if (goals === 0) return null;
          return (
            <span
              key={r.index}
              title={`${minute}'`}
              className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-neon"
              style={{ left: `${left}%` }}
            />
          );
        })}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-ink-muted">
        <span>1'</span>
        <span>45'</span>
        <span>90'</span>
      </div>
    </div>
  );
}
