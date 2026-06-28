import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameProvider';
import { play } from '../../lib/sound';
import { teamName } from '../../lib/teamName';
import { recordMatchResult } from '../../lib/profileStats';
import { refreshAchievements } from '../../lib/achievements';
import { recordMatchFeats } from '../../lib/feats';
import {
  getCareer,
  saveCareer,
  recordYourMatch,
  divisionByTier,
  yourPosition,
  type CareerState,
} from '../../lib/career';
import { shareResultImage } from '../../lib/shareImage';
import { LeagueTable } from './LeagueTable';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconArrowRight, IconTrophy, IconShare, IconCheck } from '../ui/icons';

/** Post-fixture screen for Career Mode: shows the result and updates the table. */
export function CareerResult() {
  const { room, localPlayerId, leaveRoom } = useGame();
  const [career, setCareer] = useState<CareerState | null>(null);
  const [imgState, setImgState] = useState<'idle' | 'working' | 'done'>('idle');

  const me = room?.players.find((p) => p.id === localPlayerId) ?? null;
  const opp = room?.players.find((p) => p.id !== localPlayerId) ?? null;

  const outcome = useMemo<'win' | 'draw' | 'loss'>(() => {
    if (!me || !opp) return 'draw';
    if (me.goals !== opp.goals) return me.goals > opp.goals ? 'win' : 'loss';
    if (me.score !== opp.score) return me.score > opp.score ? 'win' : 'loss';
    return 'draw';
  }, [me, opp]);

  // Record into the career table + lifetime profile exactly once (idempotent).
  useEffect(() => {
    if (!room || room.status !== 'finished' || !me || !opp) return;
    recordMatchResult(room, localPlayerId);
    recordMatchFeats(room, localPlayerId);
    refreshAchievements();
    const sig = `${room.createdAt}:${room.selectedQuestions.map((q) => q.id).join(',')}`;
    const current = getCareer();
    if (!current) return;
    const next = recordYourMatch(current, {
      yourGoals: me.goals,
      oppGoals: opp.goals,
      sig,
    });
    saveCareer(next);
    setCareer(next);
  }, [room?.status, localPlayerId]);

  // Whistle / fanfare.
  useEffect(() => {
    if (room?.status !== 'finished') return;
    play(outcome === 'win' ? 'win' : 'whistle');
  }, [room?.status, outcome]);

  if (!room || !me || !opp) return null;

  const seasonOver = career != null && career.status !== 'in_season';
  const division = career ? divisionByTier(career.tier) : null;
  const position = career ? yourPosition(career) : 0;
  const promoted = !!career?.lastOutcome?.promoted;

  const shareImg = async () => {
    setImgState('working');
    const ctx =
      promoted && career?.lastOutcome
        ? { promotion: { divisionLabel: divisionByTier(career.lastOutcome.toTier).name } }
        : undefined;
    const result = await shareResultImage(room, localPlayerId, ctx);
    setImgState(result === 'failed' ? 'idle' : 'done');
    if (result !== 'failed') setTimeout(() => setImgState('idle'), 2200);
  };

  return (
    <div className="flex flex-col gap-4 py-4 animate-fade-in">
      <Card strong glow className="overflow-hidden p-6 text-center animate-rise-in">
        <div className="mb-2 inline-flex items-center gap-2 text-gold">
          <IconTrophy className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">Full time</span>
        </div>
        <div className="font-display text-2xl font-bold leading-tight sm:text-3xl">
          <span className={outcome === 'win' ? 'text-gradient-gold' : 'text-white/80'}>
            {teamName(me.name)}
          </span>{' '}
          <span className="mx-1 text-pitch">
            {me.goals}–{opp.goals}
          </span>{' '}
          <span className={outcome === 'loss' ? 'text-gradient-gold' : 'text-white/80'}>
            {teamName(opp.name)}
          </span>
        </div>
        <div className="mt-4 text-lg font-semibold">
          {outcome === 'win' ? (
            <span className="text-gradient-pitch">🎉 Three points!</span>
          ) : outcome === 'draw' ? (
            <span className="text-white/80">🤝 A share of the spoils.</span>
          ) : (
            <span className="text-white/70">😖 Defeat. Regroup for the next one.</span>
          )}
        </div>
        {division && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Badge tone="muted">{division.name}</Badge>
            {position > 0 && <Badge tone="pitch">{ordinal(position)} in the table</Badge>}
          </div>
        )}
      </Card>

      {career && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
            Updated table
          </h2>
          <LeagueTable state={career} />
        </Card>
      )}

      {seasonOver && (
        <p className="text-center text-sm font-semibold text-gold">
          Season complete — head back to see how you finished.
        </p>
      )}

      <div className="flex flex-col gap-2">
        <Button variant="secondary" fullWidth onClick={shareImg} disabled={imgState === 'working'}>
          {imgState === 'done' ? <IconCheck className="h-4 w-4 text-pitch" /> : <IconShare className="h-4 w-4" />}
          {imgState === 'working'
            ? 'Rendering…'
            : imgState === 'done'
              ? 'Shared!'
              : promoted
                ? 'Share promotion'
                : 'Share result'}
        </Button>
        <Button fullWidth size="lg" onClick={leaveRoom}>
          {seasonOver ? 'View season summary' : 'Back to hub'}{' '}
          <IconArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
