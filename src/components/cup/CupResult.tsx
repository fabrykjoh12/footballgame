import { useEffect, useRef, useState } from 'react';
import { useGame } from '../../context/GameProvider';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { play } from '../../lib/sound';
import { teamName } from '../../lib/teamName';
import { recordMatchResult } from '../../lib/profileStats';
import { refreshAchievements } from '../../lib/achievements';
import { recordMatchFeats } from '../../lib/feats';
import {
  getCupSave,
  getCup,
  recordCupResult,
  clearActiveCup,
  currentRound,
  didWinTie,
  cupMatchSignature,
  roundSettings,
  type CupDef,
  type CupRound,
  type CupRun,
} from '../../lib/cup';
import { shareResultImage } from '../../lib/shareImage';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { IconArrowRight, IconTrophy, IconBack, IconShare, IconCheck } from '../ui/icons';

interface Resolved {
  def: CupDef;
  playedRound: CupRound;
  run: CupRun;
  won: boolean;
}

/** Post-tie screen for a Cup Run: advance the bracket, or crown / eliminate. */
export function CupResult() {
  const { room, localPlayerId, leaveRoom, playCareer } = useGame();
  const [name] = useLocalStorage('bk_name', '');
  const [resolved, setResolved] = useState<Resolved | null>(null);
  const [imgState, setImgState] = useState<'idle' | 'working' | 'done'>('idle');
  const recorded = useRef(false);

  const me = room?.players.find((p) => p.id === localPlayerId) ?? null;
  const opp = room?.players.find((p) => p.id !== localPlayerId) ?? null;

  useEffect(() => {
    if (recorded.current || !room || room.status !== 'finished' || !me || !opp) return;
    recorded.current = true;

    recordMatchResult(room, localPlayerId);
    recordMatchFeats(room, localPlayerId);
    refreshAchievements();

    const before = getCupSave();
    const run = before.active;
    const def = run ? getCup(run.cupId) : undefined;
    if (!run || !def) return;

    const playedRound = def.rounds[run.round];
    const won = didWinTie(room, localPlayerId);
    const after = recordCupResult(won, cupMatchSignature(room));
    if (after.active) {
      setResolved({ def, playedRound, run: after.active, won });
      play(won ? 'win' : 'whistle');
    }
  }, [room?.status, localPlayerId, me, opp, room]);

  if (!room || !me || !opp) return null;

  const backToCups = () => {
    clearActiveCup();
    void leaveRoom();
  };

  const continueRun = () => {
    if (!resolved) return;
    const next = currentRound(resolved.run, resolved.def);
    if (!next) return;
    void playCareer(name.trim() || 'You', next.opponent, roundSettings(next));
  };

  const status = resolved?.run.status;
  const nextRound = resolved ? currentRound(resolved.run, resolved.def) : null;

  const shareImg = async () => {
    setImgState('working');
    const ctx =
      status === 'won' && resolved ? { cupWin: { cupName: resolved.def.name } } : undefined;
    const result = await shareResultImage(room, localPlayerId, ctx);
    setImgState(result === 'failed' ? 'idle' : 'done');
    if (result !== 'failed') setTimeout(() => setImgState('idle'), 2200);
  };

  return (
    <div className="flex flex-col gap-4 py-4 animate-fade-in">
      {/* Scoreline */}
      <Card strong glow className="overflow-hidden p-6 text-center animate-rise-in">
        <div className="mb-2 inline-flex items-center gap-2 text-gold">
          <IconTrophy className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">
            {resolved ? `${resolved.def.name} · ${resolved.playedRound.name}` : 'Full time'}
          </span>
        </div>
        <div className="font-display text-2xl font-bold leading-tight sm:text-3xl">
          <span className={resolved?.won ? 'text-gradient-gold' : 'text-white/80'}>
            {teamName(me.name)}
          </span>{' '}
          <span className="mx-1 text-pitch">
            {me.goals}–{opp.goals}
          </span>{' '}
          <span className={resolved && !resolved.won ? 'text-gradient-gold' : 'text-white/80'}>
            {teamName(opp.name)}
          </span>
        </div>

        <div className="mt-4 text-lg font-semibold">
          {status === 'won' ? (
            <span className="text-gradient-gold">🏆 Champions! You’ve won the {resolved!.def.name}!</span>
          ) : status === 'out' ? (
            <span className="text-white/70">😖 Knocked out in the {resolved!.playedRound.name}.</span>
          ) : status === 'playing' && nextRound ? (
            <span className="text-gradient-pitch">✅ Through to the {nextRound.name}!</span>
          ) : (
            <span className="text-white/80">Full time.</span>
          )}
        </div>

        {status === 'playing' && nextRound && (
          <p className="mt-1 text-sm text-white/55">
            Next up: <span className="font-semibold text-white/80">{teamName(nextRound.opponent)}</span>
          </p>
        )}
      </Card>

      {/* Share */}
      <Button variant="secondary" fullWidth onClick={shareImg} disabled={imgState === 'working'}>
        {imgState === 'done' ? <IconCheck className="h-4 w-4 text-pitch" /> : <IconShare className="h-4 w-4" />}
        {imgState === 'working' ? 'Rendering…' : imgState === 'done' ? 'Shared!' : 'Share result'}
      </Button>

      {/* Actions */}
      {status === 'playing' && nextRound ? (
        <div className="flex flex-col gap-2">
          <Button fullWidth size="lg" onClick={continueRun}>
            Play the {nextRound.name} <IconArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" fullWidth onClick={backToCups}>
            <IconBack className="h-4 w-4" /> Save & quit run
          </Button>
        </div>
      ) : (
        <Button fullWidth size="lg" onClick={backToCups}>
          {status === 'won' ? 'Collect your trophy' : 'Back to cups'}{' '}
          <IconArrowRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
