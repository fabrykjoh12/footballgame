import { useEffect, useState, type ReactNode } from 'react';
import type { Player, PlayerResult, QuestionResult, QuestionType } from '../../types/game';
import { RESULT_AUTOADVANCE_MS } from '../../services/matchEngine';
import { teamName } from '../../lib/teamName';
import { describeAttack, type AttackTone } from '../../lib/attackFraming';
import { speedComparison } from '../../lib/answerInsight';
import { guessAccuracy, guessProximity, guessProximityLabel, type GuessProximity } from '../../lib/scoring';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconCheck, IconClose, IconArrowRight } from '../ui/icons';

/**
 * How the reveal frames the "answer" per mini-game. Most types reveal a plain
 * correct answer, but a couple read better with their own language: Spot the
 * Lie surfaces the *false* claim (a VAR call), Odd One Out names the exception
 * and then the link the others share.
 */
function revealFraming(type: QuestionType): {
  eyebrow: string;
  icon: ReactNode;
  explainLabel: string | null;
  tone: string;
  valueTone: string;
} {
  switch (type) {
    case 'spot_the_lie':
      return {
        eyebrow: 'VAR — the false claim',
        icon: <span aria-hidden>🚩</span>,
        explainLabel: 'Why it’s false:',
        tone: 'text-danger',
        valueTone: 'text-danger',
      };
    case 'odd_one_out':
      return {
        eyebrow: 'The odd one out',
        icon: <span aria-hidden>🎯</span>,
        explainLabel: 'What links the others:',
        tone: 'text-gold',
        valueTone: 'text-gold',
      };
    default:
      return {
        eyebrow: 'Correct answer',
        icon: <IconCheck className="h-3.5 w-3.5" />,
        explainLabel: null,
        tone: 'text-pitch',
        valueTone: 'text-pitch',
      };
  }
}

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
      {/* Correct answer — framed by the mini-game type */}
      {(() => {
        const reveal = revealFraming(result.questionType);
        return (
          <Card strong className="relative overflow-hidden p-5 text-center">
            <div className="relative">
              <div className={['inline-flex items-center gap-1.5 text-xs', reveal.tone].join(' ')}>
                {reveal.icon} {reveal.eyebrow}
              </div>
              <div className={['my-1.5 font-display text-2xl font-bold sm:text-3xl', reveal.valueTone].join(' ')}>
                {result.correctAnswer}
              </div>

              {result.revealValues && <RevealValues result={result} />}

              {result.explanation && (
                <p className="mx-auto mt-2 max-w-prose text-sm text-white/65">
                  {reveal.explainLabel && (
                    <span className="font-semibold text-white/80">{reveal.explainLabel} </span>
                  )}
                  {result.explanation}
                </p>
              )}
            </div>
          </Card>
        );
      })()}

      {/* Guess the Number — hot/cold proximity for each side's guess */}
      {result.questionType === 'guess_the_number' && (
        <GuessNumberReveal
          correct={result.correctAnswer}
          rows={[
            local ? { label: teamName(local.name), isYou: true, guess: localRes?.selectedAnswer ?? null } : null,
            opponent ? { label: teamName(opponent.name), isYou: false, guess: oppRes?.selectedAnswer ?? null } : null,
          ].filter(Boolean) as GuessRow[]}
        />
      )}

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
          <span className="nums ml-1 font-mono text-xs opacity-70">({secondsLeft})</span>
        </Button>
      ) : (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] py-3.5 text-sm text-white/55">
          {isLastQuestion ? 'Final whistle approaching…' : 'Next question in'}{' '}
          <span className="nums font-mono text-pitch">{secondsLeft}s</span>
        </div>
      )}
    </div>
  );
}

interface GuessRow {
  label: string;
  isYou: boolean;
  guess: string | null;
}

const PROXIMITY_STYLE: Record<GuessProximity, { text: string; bar: string }> = {
  bang_on: { text: 'text-pitch', bar: 'bg-pitch' },
  warm: { text: 'text-gold', bar: 'bg-gold' },
  cool: { text: 'text-brand-blue', bar: 'bg-brand-blue' },
  cold: { text: 'text-white/50', bar: 'bg-white/30' },
};

/** How close each side's numeric guess landed — a hot/cold proximity bar. */
function GuessNumberReveal({ correct, rows }: { correct: string; rows: GuessRow[] }) {
  const target = Number(correct);
  return (
    <Card className="p-4">
      <div className="mb-2 text-center text-[11px] font-bold uppercase tracking-wide text-white/45">
        How close?
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((r) => {
          const g = r.guess == null ? null : Number(r.guess);
          const has = g != null && Number.isFinite(g);
          const acc = has ? guessAccuracy(g, target) : 0;
          const tier = guessProximity(acc);
          const style = PROXIMITY_STYLE[tier];
          return (
            <div key={r.label}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="flex items-center gap-1.5 truncate">
                  <span className="truncate font-semibold">{r.label}</span>
                  {r.isYou && <span className="text-[10px] font-bold uppercase text-white/45">You</span>}
                </span>
                <span className="nums flex items-center gap-2">
                  <span className="font-mono text-white/85">{has ? g : '—'}</span>
                  {has && <span className={['text-xs font-bold', style.text].join(' ')}>{guessProximityLabel(tier)}</span>}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]" aria-hidden>
                <div
                  className={['h-full rounded-full transition-[width] duration-500 ease-out', style.bar].join(' ')}
                  style={{ width: `${Math.round(acc * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="nums mt-3 text-center text-xs text-white/45">
        Answer: <span className="font-semibold text-white/70">{correct}</span>
      </p>
    </Card>
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
      <div className="flex items-center gap-1 truncate text-xs text-white/55">
        {isCorrect && <IconCheck className="h-3 w-3 shrink-0 text-good" aria-hidden />}
        <span className="truncate">{name}</span>
        {isCorrect && <span className="sr-only"> (correct)</span>}
      </div>
      <div className={['nums font-mono text-lg font-bold', isCorrect ? 'text-good' : 'text-white/85'].join(' ')}>
        {value}
        {v.unit ? <span className="ml-1 text-xs font-normal text-white/55">{v.unit}</span> : null}
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
        'relative overflow-hidden p-4',
        isCorrect ? 'border-good/30' : 'border-danger/30',
      ].join(' ')}
    >
      {/* Correctness accent bar — quick scan without relying on colour alone. */}
      <span
        aria-hidden
        className={['absolute inset-y-0 left-0 w-1', isCorrect ? 'bg-good' : 'bg-danger'].join(' ')}
      />
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
        <span className="truncate text-sm text-white/65">
          {selectedAnswer ?? 'No answer'}
        </span>
      </div>

      <div className="mt-3 flex items-baseline gap-1">
        <span
          className={[
            'nums font-display text-2xl font-bold',
            breakdown.total > 0 ? 'text-pitch' : 'text-white/55',
            result.scoredGoal ? 'motion-safe:animate-goal-pop' : '',
          ].join(' ')}
        >
          +{breakdown.total}
        </span>
        <span className="text-xs text-white/55">pts</span>
        {result.scoredGoal && (
          <span className="ml-auto text-base" aria-label="Goal">⚽</span>
        )}
      </div>
      {breakdown.total > 0 && (breakdown.speedBonus > 0 || breakdown.streakBonus > 0) && (
        <div className="nums mt-0.5 text-[11px] text-white/55">
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
