import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameProvider';
import { play } from '../../lib/sound';
import type { Player } from '../../types/game';
import { MATCH_MODES } from '../../lib/matchModes';
import { teamName } from '../../lib/teamName';
import { accuracyPercent } from '../../lib/scoring';
import { getPlayerTitle } from '../../lib/playerTitle';
import { buildShareText } from '../../lib/shareResult';
import { shareResultImage } from '../../lib/shareImage';
import { recordMatchResult } from '../../lib/profileStats';
import { recordDailyResult } from '../../lib/dailyChallenge';
import { refreshAchievements } from '../../lib/achievements';
import type { AchievementDef } from '../../lib/achievements';
import { getOpponentRecord, h2hSummary } from '../../lib/headToHead';
import { dailyBoardId, submitScore, submitPersonalBest } from '../../lib/leaderboard';
import { useAuth } from '../../context/AuthProvider';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconTrophy, IconShare, IconCheck, IconBack } from '../ui/icons';

export function FinalResult() {
  const { room, localPlayerId, isHost, serviceMode, rematch, leaveRoom } = useGame();
  const { user } = useAuth();
  const [unlocked, setUnlocked] = useState<AchievementDef[]>([]);
  const [shared, setShared] = useState(false);
  const [imgState, setImgState] = useState<'idle' | 'working' | 'shared' | 'saved'>(
    'idle',
  );

  const winner = useMemo(() => {
    if (!room) return null;
    const [a, b] = room.players;
    if (!a || !b) return null;
    if (a.goals !== b.goals) return a.goals > b.goals ? a : b;
    if (a.score !== b.score) return a.score > b.score ? a : b;
    return null; // genuine draw
  }, [room]);

  // Final-whistle audio: fanfare if you won, plain whistle otherwise.
  useEffect(() => {
    if (room?.status !== 'finished') return;
    play(winner?.id === localPlayerId ? 'win' : 'whistle');
  }, [room?.status, winner?.id, localPlayerId]);

  // Record the match into the local lifetime profile (and Daily, if applicable),
  // surface any newly-unlocked achievements, and submit online scores if signed in.
  useEffect(() => {
    if (room?.status !== 'finished') return;
    recordMatchResult(room, localPlayerId);
    if (room.settings.isDaily) recordDailyResult(room, localPlayerId);
    setUnlocked(refreshAchievements());

    const me = room.players.find((p) => p.id === localPlayerId);
    if (user && me) {
      void submitPersonalBest({ uid: user.id, name: me.name, score: me.score });
      if (room.settings.isDaily) {
        void submitScore(dailyBoardId(), { uid: user.id, name: me.name, score: me.score });
      }
    }
  }, [room?.status, localPlayerId, user]);

  if (!room) return null;
  const [a, b] = room.players;
  if (!a || !b) return null;

  const total = room.selectedQuestions.length;
  const youWon = winner?.id === localPlayerId;
  const isDraw = winner === null;
  // Level on goals but a winner exists → it was decided on points.
  const onPoints = !isDraw && a.goals === b.goals;

  const share = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText(room));
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const shareImg = async () => {
    setImgState('working');
    const result = await shareResultImage(room);
    setImgState(
      result === 'shared' ? 'shared' : result === 'downloaded' ? 'saved' : 'idle',
    );
    if (result !== 'failed') setTimeout(() => setImgState('idle'), 2200);
  };

  return (
    <div className="relative flex flex-col gap-4 py-4 animate-fade-in">
      <Confetti celebratory={youWon || isDraw} />

      {/* Headline */}
      <Card strong glow className="overflow-hidden p-6 text-center animate-rise-in">
        <div className="mb-2 inline-flex items-center gap-2 text-gold">
          <IconTrophy className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-[0.2em]">
            Full time
          </span>
        </div>

        <div className="font-display text-2xl font-bold leading-tight sm:text-3xl">
          <span className={winner?.id === a.id ? 'text-gradient-gold' : 'text-white/80'}>
            {teamName(a.name)}
          </span>{' '}
          <span className="mx-1 text-pitch">
            {a.goals}–{b.goals}
          </span>{' '}
          <span className={winner?.id === b.id ? 'text-gradient-gold' : 'text-white/80'}>
            {teamName(b.name)}
          </span>
        </div>

        <div
          className={[
            'mt-1 font-mono text-sm',
            onPoints ? 'font-semibold text-pitch' : 'text-white/50',
          ].join(' ')}
        >
          {a.score} – {b.score} points
        </div>

        <div className="mt-4 text-lg font-semibold">
          {isDraw ? (
            <span className="text-white/80">🤝 Dead level — it’s a draw!</span>
          ) : youWon ? (
            <span className="text-gradient-pitch">
              🎉 You win{onPoints ? ' on points!' : '!'}
            </span>
          ) : (
            <span className="text-white/70">
              {teamName(winner!.name)} win{onPoints ? ' on points' : 's'}
            </span>
          )}
        </div>
        {onPoints && (
          <p className="mt-1 text-xs text-white/45">
            Goals were level, so the higher points total takes it.
          </p>
        )}
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard player={a} total={total} isYou={a.id === localPlayerId} isWinner={winner?.id === a.id} />
        <StatsCard player={b} total={total} isYou={b.id === localPlayerId} isWinner={winner?.id === b.id} />
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        <Badge tone="muted">Mode: {MATCH_MODES[room.settings.mode].label}</Badge>
        <Badge tone="muted">{total} questions</Badge>
      </div>

      {/* Head-to-head record vs this opponent */}
      {(() => {
        const opp = a.id === localPlayerId ? b : a;
        const rec = getOpponentRecord(opp.name);
        if (!rec || rec.played < 2) return null;
        return (
          <p className="text-center text-xs text-white/50">
            Your record vs {teamName(opp.name)}:{' '}
            <span className="font-semibold text-white/75">{h2hSummary(rec)}</span> over{' '}
            {rec.played} games
          </p>
        );
      })()}

      {/* Newly-unlocked achievements */}
      {unlocked.length > 0 && (
        <Card className="border-gold/30 p-4 text-center animate-rise-in">
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-gold">
            Achievement{unlocked.length > 1 ? 's' : ''} unlocked
          </div>
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            {unlocked.map((a2) => (
              <span
                key={a2.id}
                className="inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm"
              >
                <span aria-hidden>{a2.icon}</span>
                <span className="font-semibold">{a2.title}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      {/* Actions */}
      <div className="mt-1 flex flex-col gap-2">
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={share}>
            {shared ? <IconCheck className="h-4 w-4 text-pitch" /> : <IconShare className="h-4 w-4" />}
            {shared ? 'Copied!' : 'Copy text'}
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={shareImg}
            disabled={imgState === 'working'}
          >
            {imgState === 'shared' || imgState === 'saved' ? (
              <IconCheck className="h-4 w-4 text-pitch" />
            ) : (
              <IconShare className="h-4 w-4" />
            )}
            {imgState === 'working'
              ? 'Rendering…'
              : imgState === 'shared'
                ? 'Shared!'
                : imgState === 'saved'
                  ? 'Image saved!'
                  : 'Share image'}
          </Button>
        </div>

        <div className="flex gap-2">
          {(isHost || serviceMode === 'local') && (
            <Button fullWidth onClick={rematch}>
              Rematch
            </Button>
          )}
          <Button variant="ghost" fullWidth onClick={leaveRoom}>
            <IconBack className="h-4 w-4" /> Home
          </Button>
        </div>
        {!isHost && serviceMode === 'remote' && (
          <p className="text-center text-xs text-white/40">
            Waiting for the host to start a rematch…
          </p>
        )}
      </div>
    </div>
  );
}

function StatsCard({
  player,
  total,
  isYou,
  isWinner,
}: {
  player: Player;
  total: number;
  isYou: boolean;
  isWinner?: boolean;
}) {
  const title = getPlayerTitle({
    correctAnswers: player.correctAnswers,
    totalQuestions: total,
    bestStreak: player.bestStreak,
  });
  const fastest =
    player.fastestAnswerMs != null
      ? `${(player.fastestAnswerMs / 1000).toFixed(1)}s`
      : '—';

  return (
    <Card className={['p-4', isWinner ? 'border-gold/40 shadow-gold' : ''].join(' ')}>
      <div className="mb-2 flex items-center justify-between gap-1">
        <span className="truncate font-semibold">{teamName(player.name)}</span>
        {isYou && <Badge tone="pitch">You</Badge>}
      </div>

      <div className="mb-3 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
        <div className="text-[10px] uppercase tracking-wide text-white/40">Title</div>
        <div className="flex items-center gap-1.5 font-semibold text-gold">
          <span aria-hidden>{title.emoji}</span> {title.title}
        </div>
      </div>

      <dl className="space-y-1.5 text-sm">
        <Stat label="Goals" value={String(player.goals)} />
        <Stat label="Points" value={String(player.score)} />
        <Stat
          label="Accuracy"
          value={`${accuracyPercent(player.correctAnswers, total)}%`}
        />
        <Stat label="Correct" value={`${player.correctAnswers}/${total}`} />
        <Stat label="Best streak" value={String(player.bestStreak)} />
        <Stat label="Fastest" value={fastest} />
      </dl>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/45">{label}</dt>
      <dd className="font-mono font-semibold">{value}</dd>
    </div>
  );
}

const CONFETTI_COLORS = ['#16ff7a', '#ffd24a', '#ffffff', '#39ff9c'];

function Confetti({ celebratory }: { celebratory: boolean }) {
  const pieces = useMemo(
    () =>
      Array.from({ length: celebratory ? 40 : 0 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 1.2,
        duration: 2.2 + Math.random() * 1.4,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rotate: Math.random() * 360,
      })),
    [celebratory],
  );

  if (!celebratory) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-40 overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
