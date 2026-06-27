import { useCallbackRef } from './useCallbackRef';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Question } from '../../types/game';
import {
  SOLO_MODES,
  pickSoloQuestions,
  gradeSoloAnswer,
  clueStageForElapsed,
  type SoloMode,
  type SoloGrade,
} from '../../lib/soloModes';
import { recordSoloResult } from '../../lib/soloProgress';
import { recentlySeenIds, recordSeenQuestions } from '../../lib/questionHistory';
import { refreshAchievements } from '../../lib/achievements';
import { useCountdown } from '../../hooks/useCountdown';
import { play } from '../../lib/sound';
import { QuestionCard } from '../game/QuestionCard';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconBack, IconCheck, IconClose, IconBolt } from '../ui/icons';

const REVEAL_MS: Record<SoloMode, number> = {
  survival: 2100,
  time_attack: 1100,
  gauntlet: 2300,
};

interface FinishedRun {
  score: number;
  survived: number;
  total: number;
  perfect: boolean;
  isBest: boolean;
}

/**
 * Drives one singleplayer run (Survival / Time Attack / Gauntlet). Self-contained
 * — it owns its own state + timers and reuses the shared QuestionCard and scoring
 * rules, so it never touches the 1v1 match engine.
 */
export function SoloGame({ mode, onExit }: { mode: SoloMode; onExit: () => void }) {
  const cfg = SOLO_MODES[mode];
  const questions = useMemo(() => pickSoloQuestions(mode, undefined, recentlySeenIds()), [mode]);

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<'question' | 'reveal' | 'finished'>('question');
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [streak, setStreak] = useState(0);
  const [lives, setLives] = useState(cfg.lives ?? Infinity);
  const [picked, setPicked] = useState<string | null>(null);
  const [grade, setGrade] = useState<SoloGrade | null>(null);
  const [answeredClue, setAnsweredClue] = useState(0);
  const [endAfterReveal, setEndAfterReveal] = useState(false);
  const [finished, setFinished] = useState<FinishedRun | null>(null);

  const [qStartedAt, setQStartedAt] = useState(() => Date.now());
  const runStartedAt = useRef(Date.now());
  const recorded = useRef(false);

  const question: Question | undefined = questions[index];
  const qClock = useCountdown(phase === 'question' ? qStartedAt : null, cfg.perQuestionMs, phase === 'question');
  const runClock = useCountdown(
    cfg.totalTimeMs ? runStartedAt.current : null,
    cfg.totalTimeMs ?? 0,
    mode === 'time_attack' && phase !== 'finished',
  );
  const clueStage = question ? clueStageForElapsed(question, qClock.elapsedMs) : 0;

  const finish = useCallbackRef(() => {
    setPhase('finished');
  });

  const answer = useCallbackRef((selected: string | null) => {
    if (phase !== 'question' || !question) return;
    const g = gradeSoloAnswer(question, selected, clueStage, qClock.elapsedMs, cfg.perQuestionMs, streak);
    play(g.isCorrect ? 'correct' : 'wrong');
    setPicked(selected);
    setGrade(g);
    setAnsweredClue(clueStage);
    setScore((s) => s + g.breakdown.total);
    setStreak(g.newStreak);
    if (g.isCorrect) setCorrect((c) => c + 1);

    const livesLeft = !g.isCorrect && cfg.lives != null ? lives - 1 : lives;
    if (!g.isCorrect && cfg.lives != null) setLives(livesLeft);

    const outOfLives = cfg.lives != null && livesLeft <= 0;
    const lastQuestion = index + 1 >= questions.length;
    const gauntletDone = mode === 'gauntlet' && index + 1 >= (cfg.length ?? questions.length);
    setEndAfterReveal(outOfLives || gauntletDone || (mode !== 'time_attack' && lastQuestion));
    setPhase('reveal');
  });

  // Per-question timeout → counts as a missed answer.
  useEffect(() => {
    if (phase === 'question' && qClock.remainingMs <= 0) answer(null);
  }, [phase, qClock.remainingMs, answer]);

  // Time Attack: the global clock ending stops the run immediately.
  useEffect(() => {
    if (mode === 'time_attack' && cfg.totalTimeMs && runClock.remainingMs <= 0 && phase !== 'finished') {
      finish();
    }
  }, [mode, cfg.totalTimeMs, runClock.remainingMs, phase, finish]);

  // Advance after the reveal pause, or finish.
  useEffect(() => {
    if (phase !== 'reveal') return;
    const id = setTimeout(() => {
      if (endAfterReveal) {
        finish();
        return;
      }
      setIndex((i) => i + 1);
      setPicked(null);
      setGrade(null);
      setQStartedAt(Date.now());
      setPhase('question');
    }, REVEAL_MS[mode]);
    return () => clearTimeout(id);
  }, [phase, endAfterReveal, mode, finish]);

  // Record the finished run exactly once.
  useEffect(() => {
    if (phase !== 'finished' || recorded.current) return;
    recorded.current = true;
    const perfect = mode === 'gauntlet' && correct === questions.slice(0, cfg.length ?? 10).length;
    const seen = questions.slice(0, Math.min(index + 1, questions.length)).map((q) => q.id);
    recordSeenQuestions(seen);
    const { isBest } = recordSoloResult({ mode, score, survived: correct, perfect });
    refreshAchievements();
    play(score > 0 ? 'win' : 'whistle');
    setFinished({ score, survived: correct, total: mode === 'gauntlet' ? (cfg.length ?? 10) : index + 1, perfect, isBest });
  }, [phase, mode, score, correct, index, questions, cfg.length]);

  if (phase === 'finished') {
    return <SoloResult mode={mode} run={finished} onExit={onExit} />;
  }

  if (!question) {
    // Pool exhausted (a very long survival run) — treat as a win.
    return <SoloResult mode={mode} run={finished} onExit={onExit} />;
  }

  return (
    <div className="flex flex-1 flex-col gap-4 py-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onExit}>
          <IconBack className="h-4 w-4" /> Quit
        </Button>
        <Badge tone="pitch">
          {cfg.icon} {cfg.label}
        </Badge>
      </div>

      <SoloHud
        mode={mode}
        score={score}
        streak={streak}
        lives={lives}
        survived={correct}
        index={index}
        total={cfg.length ?? 0}
        runSecondsLeft={runClock.secondsLeft}
      />

      {/* Per-question timer */}
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div
          className="h-full rounded-full bg-pitch transition-[width] duration-100 ease-linear"
          style={{ width: `${Math.round(qClock.fraction * 100)}%` }}
        />
      </div>

      {/* Reveal banner */}
      {phase === 'reveal' && grade && (
        <div
          role="status"
          className={[
            'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold animate-scale-in',
            grade.isCorrect
              ? 'border-pitch/40 bg-pitch/10 text-pitch'
              : 'border-danger/40 bg-danger/10 text-danger',
          ].join(' ')}
        >
          {grade.isCorrect ? <IconCheck className="h-4 w-4" /> : <IconClose className="h-4 w-4" />}
          {grade.isCorrect ? (
            <span>Correct! +{grade.breakdown.total.toLocaleString()}</span>
          ) : (
            <span>
              {picked == null ? 'Out of time' : 'Wrong'} — answer: {question.correctAnswer}
            </span>
          )}
        </div>
      )}

      <QuestionCard
        question={question}
        clueStage={phase === 'reveal' ? answeredClue : clueStage}
        selectedAnswer={picked}
        hasAnswered={phase !== 'question'}
        opponentAnswered={false}
        onAnswer={(a) => answer(a)}
      />
    </div>
  );
}

function SoloHud({
  mode,
  score,
  streak,
  lives,
  survived,
  index,
  total,
  runSecondsLeft,
}: {
  mode: SoloMode;
  score: number;
  streak: number;
  lives: number;
  survived: number;
  index: number;
  total: number;
  runSecondsLeft: number;
}) {
  return (
    <Card className="flex items-center justify-between p-3">
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-2xl font-bold text-pitch">{score.toLocaleString()}</span>
        <span className="text-[11px] uppercase tracking-wide text-white/40">pts</span>
      </div>

      <div className="flex items-center gap-3 text-sm">
        {streak >= 2 && (
          <span className="inline-flex items-center gap-1 font-semibold text-gold">
            <IconBolt className="h-4 w-4" /> {streak}
          </span>
        )}
        {mode === 'survival' && (
          <span className="font-semibold text-white/80">
            {'❤️'.repeat(Math.max(0, Math.min(lives, 5)))} · {survived} survived
          </span>
        )}
        {mode === 'time_attack' && (
          <span
            className={[
              'font-mono text-lg font-bold tabular-nums',
              runSecondsLeft <= 10 ? 'text-danger animate-pulse' : 'text-white/85',
            ].join(' ')}
          >
            {runSecondsLeft}s
          </span>
        )}
        {mode === 'gauntlet' && (
          <span className="font-semibold text-white/80">
            {Math.min(index + 1, total)} / {total}
          </span>
        )}
      </div>
    </Card>
  );
}

function SoloResult({
  mode,
  run,
  onExit,
}: {
  mode: SoloMode;
  run: FinishedRun | null;
  onExit: () => void;
}) {
  const cfg = SOLO_MODES[mode];
  const score = run?.score ?? 0;
  const survived = run?.survived ?? 0;

  const headline =
    mode === 'survival'
      ? `${survived} question${survived === 1 ? '' : 's'} survived`
      : mode === 'time_attack'
        ? `${score.toLocaleString()} points`
        : run?.perfect
          ? 'Perfect Gauntlet!'
          : `${survived}/${run?.total ?? 10} correct`;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 py-10 text-center animate-fade-in">
      <div className="text-5xl" aria-hidden>
        {cfg.icon}
      </div>
      <div>
        <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/40">{cfg.label} — full time</div>
        <h1 className="mt-1 font-display text-3xl font-bold text-gradient-pitch">{headline}</h1>
        {run?.isBest && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-gold/30 bg-gold/10 px-3 py-1 text-sm font-semibold text-gold">
            🏆 New personal best!
          </div>
        )}
      </div>

      <Card className="w-full max-w-xs p-4">
        <div className="grid grid-cols-2 gap-2">
          <Stat label="Points" value={score.toLocaleString()} />
          <Stat
            label={mode === 'survival' ? 'Survived' : 'Correct'}
            value={mode === 'survival' ? String(survived) : `${survived}${run?.total ? `/${run.total}` : ''}`}
          />
        </div>
      </Card>

      <Button size="lg" onClick={onExit}>
        Back to modes
      </Button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center">
      <div className="font-display text-xl font-bold text-pitch">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  );
}
