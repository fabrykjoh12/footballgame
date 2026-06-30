import {
  currentStreak,
  nextMilestone,
  daysToNextReward,
  streakProgress,
  streakLadder,
} from '../../lib/streakRewards';
import { Card } from '../ui/Card';

/**
 * Daily-streak reward ladder on the home screen — turns the streak number into a
 * "X days to your next reward" progression. Purely reads `streakRewards` (pure
 * lib); unlocking happens in `cosmetics.ts` at the same thresholds.
 */
export function StreakRewardCard() {
  const streak = currentStreak();
  const next = nextMilestone(streak);
  const progress = streakProgress(streak);
  const remaining = daysToNextReward(streak);
  const ladder = streakLadder(streak);

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>🔥</span>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
            Streak rewards
          </h3>
        </div>
        <span className="nums rounded-full border border-gold/30 bg-gold/10 px-2.5 py-0.5 text-xs font-bold text-gold">
          {streak} day{streak === 1 ? '' : 's'}
        </span>
      </div>

      {next ? (
        <>
          <div className="mb-1.5 flex items-baseline justify-between text-xs">
            <span className="text-white/55">
              Next: <span aria-hidden>{next.emoji}</span>{' '}
              <span className="font-semibold text-white/80">{next.reward}</span>
            </span>
            <span className="nums shrink-0 font-semibold text-pitch">
              {remaining} day{remaining === 1 ? '' : 's'} to go
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gold transition-[width] duration-500"
              style={{ width: `${Math.round(progress * 100)}%` }}
              role="img"
              aria-label={`${Math.round(progress * 100)}% toward the next streak reward`}
            />
          </div>
        </>
      ) : (
        <p className="text-xs text-white/55">
          🏆 Every streak reward unlocked — keep the run alive to defend it.
        </p>
      )}

      {/* Milestone pips */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {ladder.map((step) => (
          <span
            key={step.days}
            title={`${step.days}-day streak · ${step.reward}`}
            className={[
              'nums inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
              step.reached
                ? 'border-pitch/30 bg-pitch/10 text-pitch'
                : step.isNext
                  ? 'border-gold/30 bg-gold/10 text-gold'
                  : 'border-white/10 bg-white/[0.03] text-white/40',
            ].join(' ')}
          >
            {step.reached ? '✓' : step.emoji} {step.days}d
          </span>
        ))}
      </div>
    </Card>
  );
}
