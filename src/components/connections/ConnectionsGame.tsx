import { useEffect, useMemo, useRef, useState } from 'react';
import {
  pickConnections,
  gradeConnection,
  acceptedPlayersFor,
  suggestNames,
  recentConnectionIds,
  recordSeenConnections,
  recordConnectionsResult,
  dailyConnection,
  CONNECTIONS_QUESTION_MS,
  CONNECTIONS_RUN_LENGTH,
  type Connection,
  type ConnectionGrade,
} from '../../lib/connections';
import { recordDailyConnectionResult } from '../../lib/dailyConnections';
import { refreshAchievements } from '../../lib/achievements';
import { useCountdown } from '../../hooks/useCountdown';
import { matchIdentities, type TeamIdentity } from '../../lib/teamIdentity';
import { play } from '../../lib/sound';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconBack, IconCheck, IconClose, IconBolt, IconRoute, IconArrowRight } from '../ui/icons';

const REVEAL_MS = 3000;

interface FinishedRun {
  score: number;
  correct: number;
  total: number;
  bestStreak: number;
  isBest: boolean;
  /** Present in Daily mode: the day's solved-streak outcome. */
  daily?: { streak: number; solved: boolean };
}

/**
 * "Connections" solo run: name a player who has played for BOTH shown clubs.
 * Self-contained (own state/timers, never touches the 1v1 match engine).
 * In `daily` mode it's a single deterministic puzzle/day with its own streak.
 */
export function ConnectionsGame({ onExit, daily = false }: { onExit: () => void; daily?: boolean }) {
  const puzzles = useMemo(
    () => (daily ? [dailyConnection()] : pickConnections(recentConnectionIds())),
    [daily],
  );

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'question' | 'reveal' | 'finished'>('question');
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [input, setInput] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [grade, setGrade] = useState<ConnectionGrade | null>(null);
  const [finished, setFinished] = useState<FinishedRun | null>(null);

  const [qStartedAt, setQStartedAt] = useState(() => Date.now());
  const recorded = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const puzzle: Connection | undefined = puzzles[index];
  const qClock = useCountdown(phase === 'question' ? qStartedAt : null, CONNECTIONS_QUESTION_MS, phase === 'question');
  const [idA, idB] = puzzle ? matchIdentities(puzzle.clubA, puzzle.clubB) : [null, null];
  const timeLow = phase === 'question' && qClock.fraction < 0.25;

  const suggestions = useMemo(
    () => (phase === 'question' ? suggestNames(input) : []),
    [input, phase],
  );

  const submit = (raw: string | null) => {
    if (phase !== 'question' || !puzzle) return;
    const answer = raw == null ? null : raw.trim();
    // Ignore an empty manual submit; only the timeout passes a real null.
    if (raw != null && !answer) return;

    const g = gradeConnection(puzzle, answer, qClock.fraction, streak);
    play(g.isCorrect ? 'correct' : 'wrong');
    setSubmitted(answer);
    setGrade(g);
    setScore((s) => s + g.breakdown.total);
    setStreak(g.newStreak);
    setBestStreak((b) => Math.max(b, g.newStreak));
    if (g.isCorrect) setCorrect((c) => c + 1);
    setPhase('reveal');
  };

  // Per-puzzle timeout → counts as a miss.
  useEffect(() => {
    if (phase === 'question' && qClock.remainingMs <= 0) submit(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qClock.remainingMs]);

  // Focus the input at the start of each puzzle.
  useEffect(() => {
    if (phase === 'question') inputRef.current?.focus();
  }, [phase, index]);

  // Advance after the reveal pause (or finish on the last puzzle).
  useEffect(() => {
    if (phase !== 'reveal') return;
    const id = setTimeout(() => {
      if (index + 1 >= puzzles.length) {
        setPhase('finished');
        return;
      }
      setIndex((i) => i + 1);
      setInput('');
      setSubmitted(null);
      setGrade(null);
      setQStartedAt(Date.now());
      setPhase('question');
    }, REVEAL_MS);
    return () => clearTimeout(id);
  }, [phase, index, puzzles.length]);

  // Record the finished run exactly once.
  useEffect(() => {
    if (phase !== 'finished' || recorded.current) return;
    recorded.current = true;
    if (daily) {
      const solved = correct > 0;
      const st = recordDailyConnectionResult(solved);
      play(solved ? 'win' : 'whistle');
      setFinished({ score, correct, total: puzzles.length, bestStreak, isBest: false, daily: { streak: st.streak, solved } });
      return;
    }
    recordSeenConnections(puzzles.map((p) => p.id));
    const { isBest } = recordConnectionsResult({ score, correct, bestStreak });
    refreshAchievements();
    play(score > 0 ? 'win' : 'whistle');
    setFinished({ score, correct, total: puzzles.length, bestStreak, isBest });
  }, [phase, score, correct, bestStreak, puzzles, daily]);

  if (phase === 'finished') {
    return <ConnectionsResult run={finished} onExit={onExit} />;
  }
  if (!puzzle) return <ConnectionsResult run={finished} onExit={onExit} />;

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <IconBack className="h-4 w-4" /> Quit
        </Button>
        <div className="flex items-center gap-2">
          <Badge tone="pitch">
            <IconRoute className="h-4 w-4" /> {daily ? 'Daily Connections' : 'Connections'}
          </Badge>
        </div>
      </div>

      {/* HUD */}
      <Card className="flex items-center justify-between p-3">
        <div className="flex items-baseline gap-1.5">
          <span className="nums font-display text-2xl font-bold text-pitch">{score.toLocaleString()}</span>
          <span className="text-[11px] uppercase tracking-wide text-white/40">pts</span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {streak >= 2 && (
            <span className="nums inline-flex items-center gap-1 font-semibold text-gold">
              <IconBolt className="h-4 w-4" /> {streak}
            </span>
          )}
          <span className="nums font-semibold text-white/80">
            {Math.min(index + 1, puzzles.length)} / {puzzles.length}
          </span>
        </div>
      </Card>

      {/* Per-puzzle timer */}
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div
          className={[
            'h-full rounded-full transition-[width] duration-100 ease-linear',
            timeLow ? 'bg-danger shadow-[0_0_12px_rgba(255,77,94,0.6)]' : 'bg-pitch',
          ].join(' ')}
          style={{ width: `${Math.round(qClock.fraction * 100)}%` }}
        />
      </div>

      {/* Reveal banner */}
      {phase === 'reveal' && grade && (
        <div
          role="status"
          className={[
            'rounded-xl border px-3 py-2 text-sm font-semibold animate-scale-in',
            grade.isCorrect
              ? 'border-pitch/40 bg-pitch/10 text-pitch'
              : 'border-danger/40 bg-danger/10 text-danger',
          ].join(' ')}
        >
          <div className="flex items-center gap-2">
            {grade.isCorrect ? <IconCheck className="h-4 w-4" /> : <IconClose className="h-4 w-4" />}
            {grade.isCorrect ? (
              <span className="nums">Correct! +{grade.breakdown.total.toLocaleString()}</span>
            ) : (
              <span>{submitted == null ? 'Out of time' : 'Not quite'}</span>
            )}
          </div>
          <p className="mt-1 font-normal text-white/75">
            Accepted:{' '}
            <span className="font-semibold text-white/90">
              {(() => {
                const all = acceptedPlayersFor(puzzle);
                const shown = all.slice(0, 8);
                return shown.join(', ') + (all.length > shown.length ? ', …' : '');
              })()}
            </span>
          </p>
          {puzzle.note && <p className="mt-0.5 text-xs font-normal text-white/50">{puzzle.note}</p>}
        </div>
      )}

      {/* The two clubs — a connection to solve */}
      <Card strong glow className="relative overflow-hidden p-6 text-center animate-rise-in">
        <div className="grid-tactical pointer-events-none absolute inset-0 opacity-[0.3]" aria-hidden />
        <div className="relative">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/45">
            Name a player who played for both
          </p>
          <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-start gap-1">
            <ClubChip name={puzzle.clubA} identity={idA} />
            <Connector />
            <ClubChip name={puzzle.clubB} identity={idB} />
          </div>
        </div>
      </Card>

      {/* Typed answer + autocomplete */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(input);
        }}
        className="relative flex flex-col gap-2"
      >
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            className="input-field flex-1"
            placeholder="Type a player’s name…"
            aria-label="Your answer: a player who played for both clubs"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            value={input}
            disabled={phase !== 'question'}
            onChange={(e) => setInput(e.target.value)}
          />
          <Button type="submit" disabled={phase !== 'question' || !input.trim()}>
            Submit
          </Button>
        </div>

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5" role="listbox" aria-label="Name suggestions">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                role="option"
                aria-selected={false}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/75 transition hover:border-pitch/40 hover:text-white answer-press"
                onClick={() => {
                  setInput(name);
                  inputRef.current?.focus();
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </form>

      <p className="text-center text-[11px] text-white/35">
        Surnames are fine — accents and capitals don’t matter.
      </p>
    </div>
  );
}

function ClubChip({ name, identity }: { name: string; identity: TeamIdentity | null }) {
  const id = identity ?? { color: '#16ff7a', soft: 'rgba(22,255,122,0.1)', ring: 'rgba(22,255,122,0.3)' };
  return (
    <div className="flex min-w-0 flex-col items-center gap-2">
      <span
        className="grid h-12 w-12 shrink-0 place-items-center rounded-xl font-display text-lg font-black"
        style={{ backgroundColor: id.soft, color: id.color, boxShadow: `inset 0 0 0 2px ${id.ring}` }}
        aria-hidden
      >
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="text-balance font-display text-sm font-bold leading-tight text-white/90">
        {name}
      </span>
    </div>
  );
}

/** The mystery player who links the two clubs. */
function Connector() {
  return (
    <div className="flex items-center pt-3">
      <span className="h-px w-2 bg-white/15 sm:w-3" aria-hidden />
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-pitch/40 bg-pitch/10 font-display text-sm font-bold text-pitch">
        ?
      </span>
      <span className="h-px w-2 bg-white/15 sm:w-3" aria-hidden />
    </div>
  );
}

function ConnectionsResult({ run, onExit }: { run: FinishedRun | null; onExit: () => void }) {
  const score = run?.score ?? 0;
  const correct = run?.correct ?? 0;
  const total = run?.total ?? CONNECTIONS_RUN_LENGTH;

  if (run?.daily) {
    const { solved, streak } = run.daily;
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center animate-fade-in">
        <div className="text-5xl" aria-hidden>{solved ? '🔗' : '🫥'}</div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Daily Connections</div>
          <h1 className="mt-1 font-display text-3xl font-bold text-gradient-pitch">
            {solved ? 'Solved!' : 'Missed today'}
          </h1>
          <div className="nums mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm font-semibold text-gold">
            🔥 {streak} day{streak === 1 ? '' : 's'} streak
          </div>
        </div>
        <p className="max-w-xs text-sm text-white/55">
          One puzzle a day — come back tomorrow to keep the streak going.
        </p>
        <Button size="lg" onClick={onExit}>
          Back to home <IconArrowRight className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center animate-fade-in">
      <div className="text-5xl" aria-hidden>
        🔗
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">Connections — full time</div>
        <h1 className="nums mt-1 font-display text-3xl font-bold text-gradient-pitch">
          {correct}/{total} correct
        </h1>
        {run?.isBest && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm font-semibold text-gold">
            🏆 New personal best!
          </div>
        )}
      </div>

      <Card className="w-full max-w-xs p-4">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Points" value={score.toLocaleString()} />
          <Stat label="Correct" value={`${correct}/${total}`} />
          <Stat label="Best run" value={String(run?.bestStreak ?? 0)} />
        </div>
      </Card>

      <Button size="lg" onClick={onExit}>
        Back to home <IconArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center">
      <div className="nums font-display text-xl font-bold text-pitch">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  );
}
