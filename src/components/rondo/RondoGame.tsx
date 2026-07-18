import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PLAYERS } from '../../data/players';
import {
  scoutCategoryById,
  resolveScoutPlayer,
  suggestScoutPlayers,
} from '../../lib/scout/categories';
import {
  startRondoRally,
  startRondoMatch,
  nameInRondo,
  timeoutRondo,
  concludeRally,
  nextRondoRally,
  rallyTally,
  otherRondoSide,
  type RondoMatch,
  type RondoSide,
} from '../../lib/rondo/engine';
import { cpuNameInRondo, type RondoDifficulty } from '../../lib/rondo/cpu';
import {
  rondoCatalog,
  dailyRondoCategory,
  getRondoProgress,
  hasPlayedDailyRondoToday,
  recordRondoDaily,
  recordRondoDuel,
  buildRondoDailyShareText,
  buildRondoDuelShareText,
} from '../../lib/rondo/daily';
import { mulberry32, type Rng } from '../../lib/seededRandom';
import { play } from '../../lib/sound';
import { refreshAchievements } from '../../lib/achievements';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconBack, IconArrowRight, IconCheck, IconShare } from '../ui/icons';
import { ModeHeroBanner } from '../dashboard/ModeHeroBanner';
import { modeTheme } from '../dashboard/modeTheme';
import { SuggestInput } from '../ui/SuggestInput';
import { RondoOnlineGame } from './RondoOnlineGame';
import { isAblyConfigured } from '../../lib/realtimeConfig';

const TARGET_GOALS = 3;
const TURN_SECONDS = 15;
const CPU_THINK_MS = 1300;
const PLAYER_SIDE: RondoSide = 'A';

type DuelKind = 'cpu' | 'hotseat';

type Stage =
  | { name: 'lobby' }
  | { name: 'duel'; kind: DuelKind; difficulty: RondoDifficulty; match: RondoMatch }
  | { name: 'daily' }
  | { name: 'online' };

/** The player's saved display name (or a friendly default) for online play. */
function rondoPlayerName(): string {
  try {
    const n = localStorage.getItem('bk_name');
    if (n && n.trim()) return n.trim();
  } catch {
    /* ignore */
  }
  return 'Player';
}

/** A stable per-mount RNG for category picks + CPU choices (browser-seeded). */
function makeRng(): Rng {
  // Date is available at runtime; only the seeded DAILY paths must avoid it.
  return mulberry32((Date.now() ^ (PLAYERS.length * 2654435761)) >>> 0);
}

function pickCategoryId(rng: Rng, excludeId?: string): { id: string; label: string } {
  const cat = rondoCatalog();
  let choice = cat[Math.floor(rng() * cat.length)];
  if (excludeId && cat.length > 1) {
    let guard = 0;
    while (choice.id === excludeId && guard++ < 8) choice = cat[Math.floor(rng() * cat.length)];
  }
  return { id: choice.id, label: choice.label };
}

/**
 * Rondo — a head-to-head naming duel. A shared rule is drawn from the Scout
 * catalog; you and your opponent take turns naming players who fit it. Keep the
 * ball moving; a wrong name, a repeat, or the clock running out is a turnover
 * and a goal for the other side. Vs CPU · pass-and-play · daily endurance.
 */
export function RondoGame({ daily = false, onExit }: { daily?: boolean; onExit: () => void }) {
  const theme = modeTheme('rondo')!;
  const rngRef = useRef<Rng>(makeRng());
  const [stage, setStage] = useState<Stage>(daily ? { name: 'daily' } : { name: 'lobby' });

  // Online play renders its own back button + menu (no hero framing).
  if (stage.name === 'online') {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-4">
        <RondoOnlineGame name={rondoPlayerName()} onExit={() => setStage({ name: 'lobby' })} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-4">
      <button
        onClick={onExit}
        className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-white/60 hover:text-white"
      >
        <IconBack className="h-4 w-4" /> Home
      </button>

      {stage.name !== 'daily' && (
        <ModeHeroBanner theme={theme} />
      )}

      {stage.name === 'lobby' && (
        <RondoLobby
          onStart={(kind, difficulty) => {
            const rng = rngRef.current;
            const first = pickCategoryId(rng);
            setStage({
              name: 'duel',
              kind,
              difficulty,
              match: startRondoMatch(TARGET_GOALS, startRondoRally(first.id, first.label, PLAYER_SIDE)),
            });
          }}
          onDaily={() => setStage({ name: 'daily' })}
          onOnline={() => setStage({ name: 'online' })}
        />
      )}

      {stage.name === 'duel' && (
        <RondoDuel
          kind={stage.kind}
          difficulty={stage.difficulty}
          match={stage.match}
          rng={rngRef.current}
          onMatch={(m) => setStage({ ...stage, match: m })}
          onExit={() => setStage({ name: 'lobby' })}
        />
      )}

      {stage.name === 'daily' && <RondoDaily onExit={onExit} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lobby                                                               */
/* ------------------------------------------------------------------ */

function RondoLobby({
  onStart,
  onDaily,
  onOnline,
}: {
  onStart: (kind: DuelKind, difficulty: RondoDifficulty) => void;
  onDaily: () => void;
  onOnline: () => void;
}) {
  const [difficulty, setDifficulty] = useState<RondoDifficulty>('pro');
  const progress = useMemo(() => getRondoProgress(), []);
  const playedToday = hasPlayedDailyRondoToday(progress);

  return (
    <div className="mt-4 space-y-3">
      <Card className="p-4">
        <p className="mb-3 text-sm text-white/70">
          A shared rule appears. Take turns naming footballers who fit it — a wrong
          name, a repeat, or letting the clock run out hands the other side a goal.
          First to {TARGET_GOALS} wins.
        </p>
        <div className="mb-3">
          <div className="mb-1.5 text-xs font-semibold text-white/55">CPU difficulty</div>
          <div className="flex gap-1.5">
            {(['casual', 'pro', 'legend'] as RondoDifficulty[]).map((d) => (
              <button
                key={d}
                onClick={() => setDifficulty(d)}
                className={[
                  'flex-1 rounded-lg border px-3 py-2 text-sm font-semibold capitalize transition',
                  difficulty === d
                    ? 'border-pitch/60 bg-pitch/15 text-pitch'
                    : 'border-white/10 text-white/60 hover:border-white/20',
                ].join(' ')}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button fullWidth onClick={() => onStart('cpu', difficulty)}>
            Play vs CPU
          </Button>
          <Button variant="secondary" fullWidth onClick={() => onStart('hotseat', difficulty)}>
            Pass &amp; play
          </Button>
        </div>
      </Card>

      {isAblyConfigured && (
        <button
          onClick={onOnline}
          className="flex w-full items-center justify-between rounded-xl border border-pitch/25 bg-pitch/[0.06] px-4 py-3 text-left transition hover:border-pitch/50"
        >
          <span className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-semibold">
              Play a friend online <Badge tone="pitch">1v1</Badge>
            </span>
            <span className="text-[11px] text-white/55">Same rules, across devices — share a code</span>
          </span>
          <IconArrowRight className="h-4 w-4 shrink-0 text-pitch" />
        </button>
      )}

      <button
        onClick={onDaily}
        className="w-full rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-left transition hover:border-white/20"
      >
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Daily endurance</span>
          <Badge tone={playedToday ? 'muted' : 'gold'}>{playedToday ? 'Played' : 'Play'}</Badge>
        </div>
        <p className="text-[11px] text-white/55">
          One rule for everyone today — name as many as you can. Best run:{' '}
          {progress.daily.bestRun}
          {progress.daily.streak > 1 ? ` · 🔥 ${progress.daily.streak}-day streak` : ''}
        </p>
      </button>

      {progress.duelsPlayed > 0 && (
        <p className="text-center text-[11px] text-white/45">
          Duels: {progress.duelsWon}W · {progress.duelsPlayed - progress.duelsWon}L
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Duel                                                                */
/* ------------------------------------------------------------------ */

function RondoDuel({
  kind,
  difficulty,
  match,
  rng,
  onMatch,
  onExit,
}: {
  kind: DuelKind;
  difficulty: RondoDifficulty;
  match: RondoMatch;
  rng: Rng;
  onMatch: (m: RondoMatch) => void;
  onExit: () => void;
}) {
  const rally = match.rally;
  const category = scoutCategoryById(rally.categoryId)!;
  const cpuTurn = kind === 'cpu' && rally.turn !== PLAYER_SIDE && rally.phase === 'playing';
  const humanTurn = rally.phase === 'playing' && !cpuTurn;

  const [msg, setMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  const recordedRef = useRef(false);

  // Record the finished match once (vs CPU only — hot-seat has no owner).
  useEffect(() => {
    if (match.phase === 'over' && !recordedRef.current) {
      recordedRef.current = true;
      play(match.winner === PLAYER_SIDE ? 'win' : 'wrong');
      if (kind === 'cpu') {
        recordRondoDuel(match.winner === PLAYER_SIDE);
        refreshAchievements();
      }
    }
  }, [match.phase, match.winner, kind]);

  // Countdown on a human turn; the interval only decrements (no side effects
  // inside the state updater, which StrictMode can double-invoke).
  useEffect(() => {
    if (!humanTurn) return;
    setTimeLeft(TURN_SECONDS);
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
    // Re-arm whenever the active turn changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rally.turn, rally.phase, humanTurn, rally.categoryId]);

  // Expiry = turnover (fires once; the conclude flips humanTurn off).
  useEffect(() => {
    if (humanTurn && timeLeft === 0) {
      play('wrong');
      onMatch(concludeRally(match, timeoutRondo(rally)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, humanTurn]);

  // CPU takes its turn after a short think.
  useEffect(() => {
    if (!cpuTurn) return;
    const id = setTimeout(() => {
      const pick = cpuNameInRondo(rally, category, PLAYERS, rng, difficulty);
      if (!pick) {
        onMatch(concludeRally(match, timeoutRondo(rally)));
        play('wrong');
      } else {
        const { rally: r } = nameInRondo(rally, otherRondoSide(PLAYER_SIDE), pick, category);
        play('click');
        onMatch({ ...match, rally: r });
      }
    }, CPU_THINK_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cpuTurn, rally.turn, rally.named.length]);

  const submit = useCallback(
    (raw: string): string | null => {
      if (rally.phase !== 'playing') return null;
      const player = resolveScoutPlayer(raw, PLAYERS);
      // An unresolved typo stays in the field with a hint; a resolved-but-wrong
      // or repeated name is a real move (it ends the rally — the turnover card
      // explains it), so it clears.
      if (!player) return 'No player found — check the spelling.';
      const { rally: r, result } = nameInRondo(rally, rally.turn, player, category);
      if (result === 'ok') {
        play('correct');
        onMatch({ ...match, rally: r });
      } else {
        play('wrong');
        onMatch(concludeRally(match, r));
      }
      return null;
    },
    [rally, category, match, onMatch],
  );

  const nextRally = () => {
    const next = pickCategoryId(rng, rally.categoryId);
    onMatch(nextRondoRally(match, next.id, next.label));
    setMsg(null);
  };

  const tally = rallyTally(rally);
  const sideLabel = (s: RondoSide) => (s === PLAYER_SIDE ? (kind === 'cpu' ? 'You' : 'Player 1') : kind === 'cpu' ? 'CPU' : 'Player 2');

  if (match.phase === 'over') {
    const youWon = match.winner === PLAYER_SIDE;
    return (
      <div className="mt-4 space-y-3">
        <Card className="p-5 text-center">
          <div className="mb-1 text-3xl font-black">
            {match.scores.A}
            <span className="mx-2 text-white/40">–</span>
            {match.scores.B}
          </div>
          <p className={`text-lg font-bold ${youWon ? 'text-pitch' : 'text-white/70'}`}>
            {kind === 'cpu'
              ? youWon
                ? 'You kept possession! 🏆'
                : 'The CPU passed you off the park.'
              : `${sideLabel(match.winner!)} wins! 🏆`}
          </p>
        </Card>
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={onExit}>
            <IconBack className="h-4 w-4" /> Lobby
          </Button>
          {kind === 'cpu' && (
            <Button
              fullWidth
              onClick={() => {
                const text = buildRondoDuelShareText({ won: youWon, a: match.scores.A, b: match.scores.B });
                navigator.clipboard?.writeText(text).catch(() => {});
                setMsg('Result copied.');
              }}
            >
              <IconShare className="h-4 w-4" /> Share
            </Button>
          )}
        </div>
        {msg && <p className="text-center text-xs font-medium text-pitch">{msg}</p>}
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {/* Scoreboard */}
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5">
        <Score label={sideLabel('A')} value={match.scores.A} active={rally.turn === 'A'} />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-white/40">
          Rally {match.rallyNumber} · first to {match.target}
        </span>
        <Score label={sideLabel('B')} value={match.scores.B} active={rally.turn === 'B'} right />
      </div>

      {/* The rule */}
      <Card className="p-4 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Name a player who…</div>
        <div className="mt-0.5 font-display text-lg font-bold text-pitch">{category.label}</div>
        <div className="mt-1 text-[11px] text-white/45">
          {tally.A + tally.B} named this rally · {sideLabel(rally.turn)} to name
        </div>
      </Card>

      {rally.phase === 'over' ? (
        <Card className="p-4 text-center">
          <p className="mb-2 text-sm font-semibold text-white/80">
            {sideLabel(otherRondoSide(rally.loser!))} scores — {sideLabel(rally.loser!)}{' '}
            {rally.reason === 'timeout' ? 'ran out of time' : rally.reason === 'repeat' ? 'repeated a name' : "named someone who didn't fit"}.
          </p>
          <Button fullWidth onClick={nextRally}>
            Next rally <IconArrowRight className="h-4 w-4" />
          </Button>
        </Card>
      ) : cpuTurn ? (
        <Card className="p-4 text-center text-sm text-white/60">CPU is thinking…</Card>
      ) : (
        <NameInput
          key={`${rally.categoryId}-${rally.named.length}`}
          disabled={false}
          timeLeft={timeLeft}
          totalTime={TURN_SECONDS}
          prompt={kind === 'hotseat' ? `${sideLabel(rally.turn)}, name one` : 'Name a player'}
          onSubmit={submit}
        />
      )}

      {msg && <p className="text-center text-xs font-medium text-gold">{msg}</p>}

      {/* Named-this-rally chips */}
      {rally.named.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {rally.named.map((n, i) => (
            <span
              key={i}
              className={[
                'rounded-full px-2.5 py-1 text-[11px] font-medium',
                n.side === 'A' ? 'bg-sky-500/15 text-sky-300' : 'bg-rose-500/15 text-rose-300',
              ].join(' ')}
            >
              {n.playerName}
            </span>
          ))}
        </div>
      )}

      <button onClick={onExit} className="mx-auto block text-[11px] text-white/40 hover:text-white/70">
        Quit to lobby
      </button>
    </div>
  );
}

function Score({ label, value, active, right }: { label: string; value: number; active: boolean; right?: boolean }) {
  return (
    <div className={`flex flex-col ${right ? 'items-end' : 'items-start'}`}>
      <span className={`text-[11px] font-semibold ${active ? 'text-pitch' : 'text-white/50'}`}>{label}</span>
      <span className="nums text-xl font-black">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Daily endurance                                                     */
/* ------------------------------------------------------------------ */

function RondoDaily({ onExit }: { onExit: () => void }) {
  const theme = modeTheme('rondo')!;
  const category = useMemo(() => dailyRondoCategory(), []);
  const [usedIds, setUsedIds] = useState<string[]>([]);
  const [names, setNames] = useState<string[]>([]);
  const [phase, setPhase] = useState<'playing' | 'over'>('playing');
  const [reason, setReason] = useState<string>('');
  const [msg, setMsg] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(TURN_SECONDS);
  const recordedRef = useRef(false);
  const progress = useMemo(() => getRondoProgress(), []);
  const alreadyPlayed = useMemo(() => hasPlayedDailyRondoToday(progress), [progress]);

  const end = useCallback(
    (why: string) => {
      setPhase('over');
      setReason(why);
      play('wrong');
      if (!recordedRef.current) {
        recordedRef.current = true;
        if (!alreadyPlayed) recordRondoDaily(usedIds.length);
      }
    },
    [usedIds.length, alreadyPlayed],
  );

  useEffect(() => {
    if (phase !== 'playing') return;
    setTimeLeft(TURN_SECONDS);
    const id = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    return () => clearInterval(id);
  }, [names.length, phase]);

  useEffect(() => {
    if (phase === 'playing' && timeLeft === 0) end('the clock ran out');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase]);

  const submit = (raw: string): string | null => {
    const player = resolveScoutPlayer(raw, PLAYERS);
    if (!player) return 'No player found — check the spelling.';
    if (usedIds.includes(player.id)) {
      end(`${player.name} was already named`);
      return null;
    }
    if (!category.test(player)) {
      end(`${player.name} doesn't fit`);
      return null;
    }
    setMsg(null);
    play('correct');
    setUsedIds((u) => [...u, player.id]);
    setNames((n) => [...n, player.name]);
    return null;
  };

  return (
    <div className="mt-4 space-y-3">
      <ModeHeroBanner theme={{ ...theme, eyebrow: 'Daily endurance', tagline: 'One rule for everyone today. How long can you keep the ball?' }} />

      <Card className="p-4 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-white/45">Name players who…</div>
        <div className="mt-0.5 font-display text-lg font-bold text-pitch">{category.label}</div>
        <div className="mt-1 nums text-3xl font-black">{usedIds.length}</div>
        <div className="text-[11px] text-white/45">named{alreadyPlayed ? ' · practice (already counted today)' : ''}</div>
      </Card>

      {phase === 'playing' ? (
        <NameInput key={names.length} disabled={false} timeLeft={timeLeft} totalTime={TURN_SECONDS} prompt="Name a player" onSubmit={submit} />
      ) : (
        <Card className="p-4 text-center">
          <p className="mb-1 text-sm font-semibold text-white/80">Run over — {reason}.</p>
          <p className="mb-3 text-2xl font-black text-pitch">{usedIds.length} named</p>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={onExit}>
              <IconBack className="h-4 w-4" /> Home
            </Button>
            <Button
              fullWidth
              onClick={() => {
                const p = getRondoProgress();
                const text = buildRondoDailyShareText({ run: usedIds.length, label: category.label, streak: p.daily.streak });
                navigator.clipboard?.writeText(text).catch(() => {});
                setMsg('Copied.');
              }}
            >
              <IconShare className="h-4 w-4" /> Share
            </Button>
          </div>
        </Card>
      )}

      {msg && <p className="text-center text-xs font-medium text-gold">{msg}</p>}

      {names.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {names.map((n, i) => (
            <span key={i} className="rounded-full bg-pitch/12 px-2.5 py-1 text-[11px] font-medium text-pitch">
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shared typed name input with autocomplete                           */
/* ------------------------------------------------------------------ */

const rondoSuggest = (q: string) => suggestScoutPlayers(q, 5);

function NameInput({
  disabled,
  timeLeft,
  totalTime,
  prompt,
  onSubmit,
}: {
  disabled: boolean;
  timeLeft: number;
  totalTime: number;
  prompt: string;
  onSubmit: (raw: string) => string | null;
}) {
  const pct = Math.max(0, Math.min(100, (timeLeft / totalTime) * 100));
  const low = timeLeft <= 5;

  return (
    <div>
      <div className="mb-1.5 h-1 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full transition-all duration-1000 ease-linear ${low ? 'bg-danger' : 'bg-pitch'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <SuggestInput
        suggest={rondoSuggest}
        onCommit={onSubmit}
        placeholder={prompt}
        disabled={disabled}
        submitIcon={<IconCheck className="h-4 w-4" />}
        submitLabel="Submit name"
        listId="rondo-name"
      />
      <div className={`mt-1 text-right text-[11px] font-semibold ${low ? 'text-danger' : 'text-white/40'}`}>
        {timeLeft}s
      </div>
    </div>
  );
}
