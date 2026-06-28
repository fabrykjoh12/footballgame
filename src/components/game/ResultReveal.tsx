import { useEffect, useState } from 'react';
import type { Player, PlayerResult, QuestionResult } from '../../types/game';
import { RESULT_AUTOADVANCE_MS } from '../../services/matchEngine';
import { teamName } from '../../lib/teamName';
import { describeAttack, type AttackTone } from '../../lib/attackFraming';
import { speedComparison } from '../../lib/answerInsight';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconCheck, IconClose, IconArrowRight } from '../ui/icons';

interface ResultRevealProps {
  result: QuestionResult;
  players: Player[];
  localPlayerId: string;
  isHost: boolean;
  isLastQuestion: boolean;
  /** Per-question time budget — drives Big Chance vs Half Chance framing. */
  questionDurationMs?: number;
  /** Match minute this question landed on — drives late-game framing. */
  matchMinute?: number;
  onNext: () => void;
}

/** Map an attack-phase tone onto a Badge tone. */
const PHASE_TONE: Record<AttackTone, 'pitch' | 'gold' | 'muted' | 'danger'> = {
  goal: 'gold',
  good: 'pitch',
  neutral: 'muted',
  bad: 'danger',
};

export function ResultReveal({
  result,
  players,
  localPlayerId,
  isHost,
  isLastQuestion,
  questionDurationMs = 15000,
  matchMinute,
  onNext,
}: ResultRevealProps) {
  const [secondsLeft, setSecondsLeft] = useState(
    Math.round(RESULT_AUTOADVANCE_MS / 1000),
  );

  useEffect(() => {
    setSecondsLeft(Math.round(RESULT_AUTOADVANCE_MS / 1000));
    const id = setInterval(
      () => setSecondsLeft((s) => Math.max(0, s - 1)),
      1000,
    );
    return () => clearInterval(id);
  }, [result.questionId]);

  const local = players.find((p) => p.id === localPlayerId);
  const opponent = players.find((p) => p.id !== localPlayerId);

  const localRes = local ? result.results[local.id] : undefined;
  const oppRes = opponent ? result.results[opponent.id] : undefined;
  const insight =
    localRes && oppRes && opponent
      ? speedComparison(
          {
            correct: localRes.isCorrect,
            answered: localRes.selectedAnswer !== null,
            timeTakenMs: localRes.timeTakenMs,
          },
          {
            correct: oppRes.isCorrect,
            answered: oppRes.selectedAnswer !== null,
            timeTakenMs: oppRes.timeTakenMs,
          },
          teamName(opponent.name),
        )
      : null;

  return (
    <div className="flex flex-col gap-4 animate-slide-up">
      {/* Correct answer */}
      <Card strong className="p-5 text-center">
        <div className="text-xs uppercase tracking-[0.2em] text-white/40">
          Correct answer
        </div>
        <div className="my-1.5 font-display text-2xl font-bold text-pitch sm:text-3xl">
          {result.correctAnswer}
        </div>

        {result.revealValues && (
          <RevealValues result={result} />
        )}

        <p className="mx-auto mt-2 max-w-prose text-sm text-white/60">
          {result.explanation}
        </p>
      </Card>

      {/* Per-player breakdown */}
      <div className="grid grid-cols-2 gap-3">
        {local && (
          <PlayerResultCard
            label={teamName(local.name)}
            isYou
            result={result.results[local.id]}
            questionDurationMs={questionDurationMs}
            matchMinute={matchMinute}
            seed={0}
          />
        )}
        {opponent && (
          <PlayerResultCard
            label={teamName(opponent.name)}
            result={result.results[opponent.id]}
            questionDurationMs={questionDurationMs}
            matchMinute={matchMinute}
            seed={1}
          />
        )}
      </div>

      {/* Speed-vs-opponent insight */}
      {insight && (
        <p className="-mt-1 text-center text-xs text-white/55">{insight}</p>
      )}

      {/* Advance control */}
      {isHost ? (
        <Button size="lg" fullWidth onClick={onNext}>
          {isLastQuestion ? 'See Final Result' : 'Next Question'}
          <IconArrowRight className="h-4 w-4" />
          <span className="ml-1 font-mono text-xs opacity-70">({secondsLeft})</span>
        </Button>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3.5 text-sm text-white/55">
          {isLastQuestion ? 'Final whistle approaching…' : 'Next question in'}{' '}
          <span className="font-mono text-pitch">{secondsLeft}s</span>
        </div>
      )}
    </div>
  );
}

function RevealValues({ result }: { result: QuestionResult }) {
  const v = result.revealValues!;
  const leftWins = result.correctAnswer === v.left.name;
  const cell = (name: string, value: number, isCorrect: boolean) => (
    <div
      className={[
        'flex-1 rounded-xl border px-3 py-2',
        isCorrect ? 'border-good/50 bg-good/10' : 'border-white/10 bg-white/[0.03]',
      ].join(' ')}
    >
      <div className="truncate text-xs text-white/55">
        {name}
        {isCorrect && <span className="sr-only"> (correct)</span>}
      </div>
      <div className="font-mono text-lg font-bold">
        {value}
        {v.unit ? <span className="ml-1 text-xs font-normal text-white/50">{v.unit}</span> : null}
      </div>
    </div>
  );
  return (
    <div className="mt-3 flex items-center gap-2">
      {cell(v.left.name, v.left.value, leftWins)}
      {cell(v.right.name, v.right.value, !leftWins)}
    </div>
  );
}

function PlayerResultCard({
  label,
  result,
  isYou = false,
  questionDurationMs,
  matchMinute,
  seed = 0,
}: {
  label: string;
  result: PlayerResult | undefined;
  isYou?: boolean;
  questionDurationMs: number;
  matchMinute?: number;
  seed?: number;
}) {
  if (!result) return null;
  const { isCorrect, selectedAnswer, breakdown, events } = result;

  const phase = describeAttack(
    {
      scoredGoal: result.scoredGoal,
      isCorrect,
      answered: selectedAnswer !== null,
      pointsEarned: breakdown.total,
      streakBonus: breakdown.streakBonus,
      timeTakenMs: result.timeTakenMs,
      totalTimeMs: questionDurationMs,
      minute: matchMinute,
    },
    seed,
  );

  return (
    <Card
      className={[
        'p-4',
        isCorrect ? 'border-good/30' : 'border-danger/30',
      ].join(' ')}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate text-sm font-semibold">{label}</span>
        {isYou && <Badge tone="pitch">You</Badge>}
      </div>

      {/* Football framing: every answer is an attack phase. */}
      <div className="mb-2.5">
        <Badge tone={PHASE_TONE[phase.tone]}>{phase.label}</Badge>
        <p className="mt-1.5 text-[11px] leading-snug text-white/55">{phase.detail}</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="sr-only">{isCorrect ? 'Correct.' : 'Incorrect.'}</span>
        <span
          className={[
            'grid h-6 w-6 place-items-center rounded-md',
            isCorrect ? 'bg-good/20 text-good' : 'bg-danger/20 text-danger',
          ].join(' ')}
          aria-hidden
        >
          {isCorrect ? <IconCheck className="h-4 w-4" /> : <IconClose className="h-4 w-4" />}
        </span>
        <span className="truncate text-sm text-white/70">
          {selectedAnswer ?? 'No answer'}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span
          className={[
            'font-display text-2xl font-bold',
            breakdown.total > 0 ? 'text-pitch' : 'text-white/40',
          ].join(' ')}
        >
          +{breakdown.total}
        </span>
        <span className="text-xs text-white/40">pts</span>
      </div>
      {breakdown.total > 0 && (breakdown.speedBonus > 0 || breakdown.streakBonus > 0) && (
        <div className="mt-0.5 text-[11px] text-white/45">
          {breakdown.base} base
          {breakdown.speedBonus > 0 && ` · +${breakdown.speedBonus} speed`}
          {breakdown.streakBonus > 0 && ` · +${breakdown.streakBonus} streak`}
        </div>
      )}

      {events.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {events.map((e, i) => (
            <Badge key={i} tone="gold">
              {e}
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}
