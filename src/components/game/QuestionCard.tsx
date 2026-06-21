import type { Question } from '../../types/game';
import { calculateBasePoints } from '../../lib/scoring';
import { Card } from '../ui/Card';
import { Badge, DifficultyBadge } from '../ui/Badge';
import { AnswerOption, type AnswerState } from './AnswerOption';
import { IconUsers, IconRoute, IconScale, IconTrophy, IconCheck } from '../ui/icons';

const TYPE_META = {
  who_am_i: { label: 'Who Am I?', Icon: IconUsers },
  career_path: { label: 'Career Path', Icon: IconRoute },
  higher_lower: { label: 'Higher or Lower', Icon: IconScale },
  club_country: { label: 'Football Trivia', Icon: IconTrophy },
} as const;

interface QuestionCardProps {
  question: Question;
  clueStage: number;
  selectedAnswer: string | null;
  hasAnswered: boolean;
  opponentAnswered: boolean;
  onAnswer: (answer: string) => void;
}

export function QuestionCard({
  question,
  clueStage,
  selectedAnswer,
  hasAnswered,
  opponentAnswered,
  onAnswer,
}: QuestionCardProps) {
  const meta = TYPE_META[question.type];

  return (
    <Card strong className="p-4 sm:p-5 animate-scale-in">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="pitch">
          <meta.Icon className="h-3.5 w-3.5" /> {meta.label}
        </Badge>
        <DifficultyBadge difficulty={question.difficulty} />
        <Badge tone="muted">{question.category.replace(/_/g, ' ')}</Badge>
      </div>

      {/* Body by type */}
      {question.type === 'who_am_i' && (
        <WhoAmIBody question={question} clueStage={clueStage} />
      )}
      {question.type === 'career_path' && <CareerPathBody question={question} />}
      {question.type === 'club_country' && (
        <p className="mb-4 text-lg font-semibold leading-snug sm:text-xl">
          {question.prompt}
        </p>
      )}

      {/* Answers */}
      {question.type === 'higher_lower' ? (
        <HigherLowerPicker
          question={question}
          selectedAnswer={selectedAnswer}
          disabled={hasAnswered}
          onAnswer={onAnswer}
        />
      ) : (
        <div className="grid gap-2.5 sm:grid-cols-2">
          {question.options.map((opt, i) => {
            let state: AnswerState = 'idle';
            if (hasAnswered) {
              state = opt === selectedAnswer ? 'selected' : 'muted';
            }
            return (
              <AnswerOption
                key={opt}
                index={i}
                text={opt}
                state={state}
                disabled={hasAnswered}
                tag={hasAnswered && opt === selectedAnswer ? 'Locked' : undefined}
                onClick={() => onAnswer(opt)}
              />
            );
          })}
        </div>
      )}

      {/* Status line */}
      <div className="mt-4 flex items-center justify-between text-xs">
        <span
          className={[
            'flex items-center gap-1.5',
            opponentAnswered ? 'text-pitch' : 'text-white/40',
          ].join(' ')}
        >
          {opponentAnswered ? (
            <>
              <IconCheck className="h-3.5 w-3.5" /> Opponent answered
            </>
          ) : (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-white/30" />
              Opponent thinking…
            </>
          )}
        </span>
        {hasAnswered && (
          <span className="text-white/40">Answer locked — waiting for reveal</span>
        )}
      </div>
    </Card>
  );
}

function WhoAmIBody({
  question,
  clueStage,
}: {
  question: Extract<Question, { type: 'who_am_i' }>;
  clueStage: number;
}) {
  const potential = calculateBasePoints('who_am_i', clueStage);
  return (
    <div className="mb-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/60">
          Guess the player
        </h2>
        <Badge tone="gold">up to {potential} pts</Badge>
      </div>
      <ul className="space-y-2">
        {question.clues.map((clue, i) => {
          const revealed = i <= clueStage;
          return (
            <li
              key={i}
              className={[
                'rounded-xl border px-3.5 py-3 text-sm transition-all duration-300',
                revealed
                  ? 'border-white/10 bg-white/[0.05] text-white animate-fade-in'
                  : 'border-dashed border-white/10 bg-transparent text-white/30',
              ].join(' ')}
            >
              <span className="mr-2 font-mono text-xs text-pitch/70">
                {i + 1}
              </span>
              {revealed ? clue : `Clue unlocks at ${i * 5}s…`}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CareerPathBody({
  question,
}: {
  question: Extract<Question, { type: 'career_path' }>;
}) {
  return (
    <div className="mb-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/60">
        Whose career path is this?
      </h2>
      <div className="flex flex-wrap items-center gap-1.5">
        {question.path.map((club, i) => {
          const hidden = club === '???';
          return (
            <span key={i} className="flex items-center gap-1.5">
              <span
                className={[
                  'rounded-lg border px-3 py-2 text-sm font-medium',
                  hidden
                    ? 'border-dashed border-gold/40 bg-gold/5 text-gold'
                    : 'border-white/10 bg-white/[0.06]',
                ].join(' ')}
              >
                {club}
              </span>
              {i < question.path.length - 1 && (
                <span className="text-pitch/60">→</span>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function HigherLowerPicker({
  question,
  selectedAnswer,
  disabled,
  onAnswer,
}: {
  question: Extract<Question, { type: 'higher_lower' }>;
  selectedAnswer: string | null;
  disabled: boolean;
  onAnswer: (answer: string) => void;
}) {
  const renderOption = (name: string) => {
    const chosen = selectedAnswer === name;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onAnswer(name)}
        aria-pressed={chosen}
        className={[
          'answer-press flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center',
          chosen
            ? 'border-pitch/70 bg-pitch/10 ring-2 ring-pitch/40'
            : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.09]',
          disabled && !chosen ? 'opacity-55' : '',
        ].join(' ')}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-lg font-bold">
          {name.charAt(0)}
        </span>
        <span className="font-semibold leading-tight">{name}</span>
        {chosen && (
          <span className="text-[10px] font-bold uppercase tracking-wide text-pitch">
            Your pick
          </span>
        )}
      </button>
    );
  };

  return (
    <div>
      <p className="mb-4 text-center text-lg font-semibold leading-snug sm:text-xl">
        {question.prompt}
      </p>
      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
        {renderOption(question.leftOption.name)}
        <div className="flex items-center text-sm font-bold text-white/40">VS</div>
        {renderOption(question.rightOption.name)}
      </div>
    </div>
  );
}
