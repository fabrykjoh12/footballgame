import { useEffect, useMemo, useState } from 'react';
import { useGame } from '../../context/GameProvider';
import { play } from '../../lib/sound';
import type { Category, Player } from '../../types/game';
import { MATCH_MODES } from '../../lib/matchModes';
import { teamName } from '../../lib/teamName';
import { accuracyPercent } from '../../lib/scoring';
import { getPlayerTitle } from '../../lib/playerTitle';
import { summarizeMatch, type PlayerMatchStats } from '../../lib/matchStats';
import { punditVerdict } from '../../lib/punditry';
import { matchIdentities, type TeamIdentity } from '../../lib/teamIdentity';
import { CATEGORY_OPTIONS } from '../../lib/categories';
import { FULL_TIME, type TimelineMark } from '../../lib/matchTimeline';
import { buildShareText } from '../../lib/shareResult';
import { shareResultImage } from '../../lib/shareImage';
import { recordMatchResult } from '../../lib/profileStats';
import { recordDailyResult } from '../../lib/dailyChallenge';
import { refreshAchievements } from '../../lib/achievements';
import { recordMatchFeats } from '../../lib/feats';
import type { AchievementDef } from '../../lib/achievements';
import { getOpponentRecord, h2hSummary } from '../../lib/headToHead';
import { dailyBoardId, submitScore, submitPersonalBest } from '../../lib/leaderboard';
import { submitDailyToLeagues } from '../../lib/leaguesLocal';
import { todayString } from '../../lib/seededRandom';
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

  const summary = useMemo(() => (room ? summarizeMatch(room) : null), [room]);

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
    recordMatchFeats(room, localPlayerId);
    setUnlocked(refreshAchievements());

    const me = room.players.find((p) => p.id === localPlayerId);
    if (user && me) {
      void submitPersonalBest({ uid: user.id, name: me.name, score: me.score });
      if (room.settings.isDaily) {
        void submitScore(dailyBoardId(), { uid: user.id, name: me.name, score: me.score });
        // Feed the Daily score into every friend league the player belongs to.
        void submitDailyToLeagues({ uid: user.id, name: me.name }, todayString(), me.score);
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
  const [idA, idB] = matchIdentities(a.name, b.name);

  const verdict = punditVerdict(
    {
      winnerName: winner ? teamName(winner.name) : null,
      onPoints,
      goalDiff: winner ? Math.abs(a.goals - b.goals) : 0,
      comeback: !!winner && (summary?.players[winner.id]?.maxDeficit ?? 0) >= 2,
      lateWinner:
        !!winner && summary?.biggest?.kind === 'late_winner' && summary.biggest.playerId === winner.id,
      nightmare: !!winner && room.settings.mode === 'nightmare',
    },
    total,
  );

  const share = async () => {
    try {
      await navigator.clipboard.writeText(buildShareText(room, localPlayerId));
      setShared(true);
      setTimeout(() => setShared(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const shareImg = async () => {
    setImgState('working');
    const result = await shareResultImage(room, localPlayerId);
    setImgState(
      result === 'shared' ? 'shared' : result === 'downloaded' ? 'saved' : 'idle',
    );
    if (result !== 'failed') setTimeout(() => setImgState('idle'), 2200);
  };

  return (
    <div className="relative flex flex-col gap-4 py-4 animate-fade-in">
      <Confetti celebratory={youWon || isDraw} />

      {/* Headline — broadcast full-time panel */}
      <Card strong glow className="relative overflow-hidden p-6 text-center animate-rise-in">
        <div className="grid-tactical pointer-events-none absolute inset-0 opacity-[0.3]" aria-hidden />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 text-gold">
            <IconTrophy className="h-4 w-4" />
            <span className="text-[11px] font-bold uppercase tracking-[0.3em]">Full time</span>
          </div>

          {/* Team — score — team */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <ResultTeam name={a.name} identity={idA} won={winner?.id === a.id} />
            <div className="flex flex-col items-center px-1">
              <div className="nums font-display text-4xl font-black leading-none sm:text-5xl">
                <span style={{ color: idA.color }}>{a.goals}</span>
                <span className="mx-1.5 text-white/25">–</span>
                <span style={{ color: idB.color }}>{b.goals}</span>
              </div>
              <div
                className={[
                  'nums mt-1.5 font-mono text-xs',
                  onPoints ? 'font-bold text-pitch' : 'text-white/40',
                ].join(' ')}
              >
                {a.score}–{b.score} pts
              </div>
            </div>
            <ResultTeam name={b.name} identity={idB} won={winner?.id === b.id} />
          </div>

          {/* Result chip */}
          <div className="mt-5">
            <span
              className={[
                'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-bold',
                isDraw
                  ? 'border-white/15 bg-white/5 text-white/80'
                  : youWon
                    ? 'border-pitch/40 bg-pitch/10 text-pitch'
                    : 'border-white/15 bg-white/5 text-white/70',
              ].join(' ')}
            >
              {isDraw ? (
                <>🤝 Dead level — draw</>
              ) : youWon ? (
                <>🎉 You win{onPoints ? ' on points' : ''}</>
              ) : (
                <>{teamName(winner!.name)} win{onPoints ? ' on points' : 's'}</>
              )}
            </span>
          </div>
          {onPoints && (
            <p className="mt-2 text-xs text-white/45">
              Goals were level, so the higher points total takes it.
            </p>
          )}

          {/* Pundit's verdict — broadcast flavour. */}
          <p className="mx-auto mt-4 max-w-prose border-t border-white/10 pt-3 text-sm italic text-white/60">
            “{verdict}”
          </p>
        </div>
      </Card>

      {/* Man of the Match + biggest moment */}
      {summary && (
        <MatchHonours
          room={room}
          motmId={summary.motmId}
          biggest={summary.biggest}
          localPlayerId={localPlayerId}
        />
      )}

      {/* Possession-style knowledge share */}
      {summary && (
        <KnowledgeShareBar
          a={a}
          b={b}
          shareA={summary.players[a.id]?.knowledgeShare ?? 50}
          shareB={summary.players[b.id]?.knowledgeShare ?? 50}
        />
      )}

      {/* Timeline replay */}
      {summary && summary.timeline.length > 0 && (
        <TimelineReplay a={a} b={b} marks={summary.timeline} />
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatsCard
          player={a}
          stats={summary?.players[a.id]}
          total={total}
          isYou={a.id === localPlayerId}
          isWinner={winner?.id === a.id}
        />
        <StatsCard
          player={b}
          stats={summary?.players[b.id]}
          total={total}
          isYou={b.id === localPlayerId}
          isWinner={winner?.id === b.id}
        />
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

function categoryLabel(c: Category): string {
  return CATEGORY_OPTIONS.find((o) => o.id === c)?.label ?? c;
}

/** A team's kit-coloured crest + name in the full-time headline. */
function ResultTeam({
  name,
  identity,
  won,
}: {
  name: string;
  identity: TeamIdentity;
  won: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5">
      <div
        className="relative grid h-12 w-12 place-items-center rounded-xl font-display text-lg font-black"
        style={{
          backgroundColor: identity.soft,
          color: identity.color,
          boxShadow: won
            ? `inset 0 0 0 2px ${identity.color}, 0 0 22px -4px ${identity.color}`
            : `inset 0 0 0 2px ${identity.ring}`,
        }}
      >
        {name.charAt(0).toUpperCase()}
        {won && <span className="absolute -top-2.5 text-sm" aria-label="Winner">👑</span>}
      </div>
      <div
        className={['truncate font-display text-sm font-bold leading-tight', won ? '' : 'text-white/80'].join(' ')}
        style={won ? { color: identity.color } : undefined}
      >
        {teamName(name)}
      </div>
    </div>
  );
}

function StatsCard({
  player,
  stats,
  total,
  isYou,
  isWinner,
}: {
  player: Player;
  stats?: PlayerMatchStats;
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
        {stats && <Stat label="Shots / chances" value={`${stats.shots} / ${stats.chances}`} />}
        <Stat label="Best streak" value={String(player.bestStreak)} />
        <Stat label="Fastest" value={fastest} />
      </dl>

      {stats?.bestCategory && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge tone="pitch">
            Best: {categoryLabel(stats.bestCategory.category)} {stats.bestCategory.accuracy}%
          </Badge>
          {stats.weakestCategory &&
            stats.weakestCategory.category !== stats.bestCategory.category &&
            stats.weakestCategory.accuracy < 100 && (
              <Badge tone="danger">
                Weakest: {categoryLabel(stats.weakestCategory.category)}{' '}
                {stats.weakestCategory.accuracy}%
              </Badge>
            )}
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-white/45">{label}</dt>
      <dd className="nums font-mono font-semibold">{value}</dd>
    </div>
  );
}

function MatchHonours({
  room,
  motmId,
  biggest,
  localPlayerId,
}: {
  room: import('../../types/game').Room;
  motmId: string | null;
  biggest: import('../../lib/matchStats').BiggestMoment | null;
  localPlayerId: string;
}) {
  const motm = room.players.find((p) => p.id === motmId);
  const bigPlayer = biggest ? room.players.find((p) => p.id === biggest.playerId) : null;
  if (!motm && !biggest) return null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {motm && (
        <Card className="border-gold/30 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-gold/80">
            Man of the Match
          </div>
          <div className="mt-1 truncate font-display text-lg font-bold text-gold">
            {teamName(motm.name)}
            {motm.id === localPlayerId ? ' (You)' : ''}
          </div>
          <div className="nums mt-0.5 text-xs text-white/50">
            {motm.correctAnswers} correct · {motm.score} pts
          </div>
        </Card>
      )}
      {biggest && bigPlayer && (
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
            Biggest moment
          </div>
          <div className="mt-1 font-display text-lg font-bold text-white">
            {biggest.minute}' {biggest.label}
          </div>
          <div className="mt-0.5 truncate text-xs text-white/50">{teamName(bigPlayer.name)}</div>
        </Card>
      )}
    </div>
  );
}

function KnowledgeShareBar({
  a,
  b,
  shareA,
  shareB,
}: {
  a: Player;
  b: Player;
  shareA: number;
  shareB: number;
}) {
  const [idA, idB] = matchIdentities(a.name, b.name);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium uppercase tracking-wide text-white/40">
        <span className="nums">{shareA}% {teamName(a.name)}</span>
        <span>Knowledge</span>
        <span className="nums">{teamName(b.name)} {shareB}%</span>
      </div>
      <div
        className="flex h-2.5 overflow-hidden rounded-full bg-white/10"
        role="img"
        aria-label={`Knowledge share: ${teamName(a.name)} ${shareA} percent, ${teamName(b.name)} ${shareB} percent`}
      >
        <div style={{ width: `${shareA}%`, backgroundColor: idA.color }} />
        <div style={{ width: `${shareB}%`, backgroundColor: idB.color }} />
      </div>
    </div>
  );
}

function TimelineReplay({
  a,
  b,
  marks,
}: {
  a: Player;
  b: Player;
  marks: TimelineMark[];
}) {
  const [idA, idB] = matchIdentities(a.name, b.name);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-white/35">
        <span>0'</span>
        <span className="uppercase tracking-wide">Match replay</span>
        <span>90'</span>
      </div>
      <div className="relative h-2 rounded-full bg-white/10">
        {/* Half-time tick. */}
        <span className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-white/15" aria-hidden />
        {marks.map((m) => {
          const color = m.side === 'home' ? idA.color : idB.color;
          const left = `${(Math.min(m.minute, FULL_TIME) / FULL_TIME) * 100}%`;
          const title = `${m.label} — ${m.minute}' (${m.side === 'home' ? teamName(a.name) : teamName(b.name)})`;
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
