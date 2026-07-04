import { Flame, ChevronRight, Shield } from 'lucide-react';
import { ClubBadge } from '../club/ClubBadge';
import { Button } from '../ui/Button';
import type { ClubIdentity } from '../../lib/clubIdentity';
import type { ProfileStats } from '../../lib/profileStats';
import { winRate } from '../../lib/profileStats';
import type { PlayerLevel } from '../../lib/playerLevel';
import { nextMilestone } from '../../lib/streakRewards';

/** The "Your Club" rail: identity, level + XP, form, and the next reward. */
export function ClubProgressCard({
  club,
  level,
  stats,
  streak,
  onEdit,
}: {
  club: ClubIdentity | null;
  level: PlayerLevel;
  stats: ProfileStats;
  streak: number;
  onEdit: () => void;
}) {
  const next = nextMilestone(streak);

  return (
    <div className="glass overflow-hidden">
      {/* Identity header with a faint kit wash */}
      <div className="relative flex items-center gap-3 p-4">
        {club && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{ background: `linear-gradient(120deg, ${club.primary}22, transparent 60%)` }}
          />
        )}
        {club ? (
          <ClubBadge identity={club} size={44} />
        ) : (
          <span className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-ink-700 text-bone-dim">
            <Shield className="h-5 w-5" />
          </span>
        )}
        <div className="relative min-w-0 flex-1">
          <div className="truncate text-[15px] font-bold text-bone">{club ? club.name : 'Your Club'}</div>
          <div className="truncate text-xs text-bone-dim">{level.title}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onEdit}>
          {club ? 'Manage' : 'Create'}
        </Button>
      </div>

      {/* Level + XP */}
      <div className="border-t border-white/[0.06] px-4 py-3.5">
        <div className="mb-1.5 flex items-baseline justify-between">
          <span className="text-sm font-bold text-bone">Level {level.level}</span>
          <span className="nums text-[11px] text-bone-faint">
            {Math.round(level.intoLevel)} / {level.span} XP
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-600">
          <div
            className="h-full rounded-full bg-gradient-to-r from-royal-dark to-royal transition-[width] duration-700 ease-premium"
            style={{ width: `${Math.max(4, Math.round(level.progress * 100))}%` }}
            role="img"
            aria-label={`Level ${level.level}, ${Math.round(level.progress * 100)}% to next`}
          />
        </div>
        <div className="mt-1 text-[11px] text-bone-faint">{level.toNext} XP to level {level.level + 1}</div>
      </div>

      {/* Form / record */}
      <div className="grid grid-cols-3 divide-x divide-white/[0.06] border-t border-white/[0.06]">
        <Figure value={String(stats.wins)} label="Won" tone="text-royal" />
        <Figure value={`${winRate(stats)}%`} label="Win rate" />
        <Figure value={String(stats.bestStreak)} label="Best run" tone="text-gold" />
      </div>

      {/* Next reward */}
      <div className="flex items-center gap-2.5 border-t border-white/[0.06] px-4 py-3">
        <Flame className="h-4 w-4 shrink-0 text-gold" strokeWidth={2.2} />
        {streak > 0 ? (
          <span className="text-xs text-bone-dim">
            <span className="font-bold text-bone">{streak}-day</span> streak
          </span>
        ) : (
          <span className="text-xs text-bone-dim">Play the Daily to start a streak</span>
        )}
        {next && (
          <span className="ml-auto flex items-center gap-1 text-[11px] text-bone-faint">
            Next: <span className="font-semibold text-bone-dim">{next.reward}</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

function Figure({ value, label, tone = 'text-bone' }: { value: string; label: string; tone?: string }) {
  return (
    <div className="px-2 py-3 text-center">
      <div className={`nums text-lg font-bold ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-bone-faint">{label}</div>
    </div>
  );
}
