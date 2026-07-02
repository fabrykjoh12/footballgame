import { useState } from 'react';
import type { Question } from '../../types/game';
import { calculateBasePoints } from '../../lib/scoring';
import { teamIdentity } from '../../lib/teamIdentity';
import { MINI_GAME_HELP, isFirstEncounter } from '../../lib/miniGameHelp';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge, DifficultyBadge } from '../ui/Badge';
import { AnswerOption, type AnswerState } from './AnswerOption';
import { PITCH_ZONES } from '../../lib/positions';
import {
  IconUsers,
  IconRoute,
  IconScale,
  IconTrophy,
  IconCheck,
  IconClock,
  IconCoins,
  IconPitch,
  IconClose,
} from '../ui/icons';

const TYPE_META = {
  who_am_i: { label: 'Who Am I?', Icon: IconUsers },
  career_path: { label: 'Career Path', Icon: IconRoute },
  higher_lower: { label: 'Higher or Lower', Icon: IconScale },
  club_country: { label: 'Football Trivia', Icon: IconTrophy },
  guess_year: { label: 'Guess the Year', Icon: IconClock },
  transfer_fee: { label: 'Transfer Fee', Icon: IconCoins },
  pitch_position: { label: 'On the Pitch', Icon: IconPitch },
  odd_one_out: { label: 'Odd One Out', Icon: IconScale },
  spot_the_lie: { label: 'Spot the Lie', Icon: IconTrophy },
  guess_the_number: { label: 'Guess the Number', Icon: IconCoins },
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

  // Teach-in: auto-shown the first time this device ever meets this mini-game
  // type (isFirstEncounter is render-stable per question id), re-openable via
  // the "?" in the header. Fully derived — no effects to fight StrictMode.
  const firstTime = isFirstEncounter(question.type, question.id);
  const [helpClosedFor, setHelpClosedFor] = useState<string | null>(null);
  const [helpOpenedFor, setHelpOpenedFor] = useState<string | null>(null);
  const help = MINI_GAME_HELP[question.type];
  const showHelp =
    helpOpenedFor === question.id || (firstTime && helpClosedFor !== question.id);
  const dismissHelp = () => {
    setHelpClosedFor(question.id);
    setHelpOpenedFor(null);
  };

  return (
    <Card strong className="p-4 sm:p-5 animate-fade-in">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="pitch">
          <meta.Icon className="h-3.5 w-3.5" /> {meta.label}
        </Badge>
        <DifficultyBadge difficulty={question.difficulty} />
        <Badge tone="muted">{question.category.replace(/_/g, ' ')}</Badge>
        <button
          type="button"
          onClick={() => (showHelp ? dismissHelp() : setHelpOpenedFor(question.id))}
          aria-label={`How to play ${meta.label}`}
          aria-expanded={showHelp}
          className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-xs font-bold text-white/50 hover:bg-white/10 hover:text-white"
        >
          ?
        </button>
      </div>

      {/* How to play — first encounter of each mini-game type */}
      {showHelp && help && (
        <div
          role="note"
          className="mb-4 flex items-start gap-2.5 rounded-xl border border-pitch/25 bg-pitch/[0.06] px-3 py-2.5 animate-fade-in"
        >
          <span className="text-base" aria-hidden>
            💡
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm leading-snug text-white/85">{help.rule}</p>
            <p className="mt-0.5 text-xs leading-snug text-white/50">{help.example}</p>
          </div>
          <button
            type="button"
            onClick={dismissHelp}
            aria-label="Dismiss how to play"
            className="shrink-0 rounded-full p-1 text-white/40 hover:bg-white/10 hover:text-white"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

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
      {question.type === 'guess_year' && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/60">
            In which year?
          </h2>
          <p className="text-lg font-semibold leading-snug sm:text-xl">
            {question.prompt}
          </p>
        </div>
      )}
      {question.type === 'transfer_fee' && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/60">
            What was the fee?
          </h2>
          <p className="text-lg font-semibold leading-snug sm:text-xl">
            {question.prompt}
          </p>
        </div>
      )}
      {question.type === 'pitch_position' && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/60">
            Where did they play?
          </h2>
          <p className="text-lg font-semibold leading-snug sm:text-xl">
            {question.prompt}
          </p>
        </div>
      )}
      {question.type === 'odd_one_out' && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/60">
            Odd one out
          </h2>
          <p className="text-lg font-semibold leading-snug sm:text-xl">
            {question.prompt}
          </p>
        </div>
      )}
      {question.type === 'spot_the_lie' && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/60">
            Spot the lie
          </h2>
          <p className="text-lg font-semibold leading-snug sm:text-xl">
            {question.prompt}
          </p>
        </div>
      )}
      {question.type === 'guess_the_number' && (
        <div className="mb-4">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-white/60">
            Guess the number — closest wins
          </h2>
          <p className="text-lg font-semibold leading-snug sm:text-xl">
            {question.prompt}
          </p>
        </div>
      )}

      {/* Answers */}
      {question.type === 'higher_lower' ? (
        <HigherLowerPicker
          question={question}
          selectedAnswer={selectedAnswer}
          disabled={hasAnswered}
          onAnswer={onAnswer}
        />
      ) : question.type === 'guess_year' ? (
        <GuessYearPicker
          question={question}
          selectedAnswer={selectedAnswer}
          disabled={hasAnswered}
          onAnswer={onAnswer}
        />
      ) : question.type === 'transfer_fee' ? (
        <TransferFeePicker
          question={question}
          selectedAnswer={selectedAnswer}
          disabled={hasAnswered}
          onAnswer={onAnswer}
        />
      ) : question.type === 'pitch_position' ? (
        <PitchGrid
          selectedAnswer={selectedAnswer}
          disabled={hasAnswered}
          onAnswer={onAnswer}
        />
      ) : question.type === 'guess_the_number' ? (
        <GuessNumberSlider
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
        <Badge tone="gold"><span className="nums">up to {potential} pts</span></Badge>
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
              <span className="nums mr-2 font-mono text-xs text-pitch/70">
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
          const kit = hidden ? null : teamIdentity(club);
          return (
            <span key={i} className="flex items-center gap-1.5">
              <span
                className={[
                  'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium',
                  hidden
                    ? 'border-dashed border-gold/40 bg-gold/5 text-gold'
                    : 'border-white/10 bg-white/[0.06]',
                ].join(' ')}
              >
                {kit && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: kit.color }}
                    aria-hidden
                  />
                )}
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
    const kit = teamIdentity(name);
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
        <span
          className="grid h-10 w-10 place-items-center rounded-full text-lg font-black"
          style={{ backgroundColor: kit.soft, color: kit.color, boxShadow: `inset 0 0 0 2px ${kit.ring}` }}
          aria-hidden
        >
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

function GuessNumberSlider({
  question,
  selectedAnswer,
  disabled,
  onAnswer,
}: {
  question: Extract<Question, { type: 'guess_the_number' }>;
  selectedAnswer: string | null;
  disabled: boolean;
  onAnswer: (answer: string) => void;
}) {
  const mid = Math.round((question.min + question.max) / 2);
  const [value, setValue] = useState(mid);
  const locked = selectedAnswer != null;
  const shown = locked ? Number(selectedAnswer) : value;

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <span className="nums font-display text-4xl font-bold text-pitch tabular-nums">
          {shown}
        </span>
        {question.unit && (
          <span className="ml-1.5 text-sm text-white/50">{question.unit}</span>
        )}
      </div>
      <input
        type="range"
        min={question.min}
        max={question.max}
        step={question.step ?? 1}
        value={shown}
        disabled={disabled || locked}
        onChange={(e) => setValue(Number(e.target.value))}
        aria-label="Your guess"
        className="w-full accent-pitch"
      />
      <div className="flex justify-between text-xs text-white/40">
        <span>{question.min}</span>
        <span>{question.max}</span>
      </div>
      {!locked && !disabled && (
        <Button fullWidth onClick={() => onAnswer(String(value))}>
          Lock it in
        </Button>
      )}
    </div>
  );
}

function GuessYearPicker({
  question,
  selectedAnswer,
  disabled,
  onAnswer,
}: {
  question: Extract<Question, { type: 'guess_year' }>;
  selectedAnswer: string | null;
  disabled: boolean;
  onAnswer: (answer: string) => void;
}) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {question.options.map((year) => {
        const chosen = selectedAnswer === year;
        return (
          <button
            key={year}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(year)}
            aria-pressed={chosen}
            aria-label={`Year ${year}`}
            className={[
              'answer-press nums flex min-h-[72px] flex-col items-center justify-center rounded-xl border font-mono text-lg font-bold',
              chosen
                ? 'border-pitch/70 bg-pitch/10 text-pitch ring-2 ring-pitch/40'
                : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.09]',
              disabled && !chosen ? 'opacity-55' : '',
            ].join(' ')}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
}

function TransferFeePicker({
  question,
  selectedAnswer,
  disabled,
  onAnswer,
}: {
  question: Extract<Question, { type: 'transfer_fee' }>;
  selectedAnswer: string | null;
  disabled: boolean;
  onAnswer: (answer: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {question.options.map((fee) => {
        const chosen = selectedAnswer === fee;
        return (
          <button
            key={fee}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(fee)}
            aria-pressed={chosen}
            aria-label={`Fee ${fee}`}
            className={[
              'answer-press nums flex min-h-[64px] items-center justify-center rounded-xl border font-mono text-xl font-bold tracking-tight',
              chosen
                ? 'border-pitch/70 bg-pitch/10 text-pitch ring-2 ring-pitch/40'
                : 'border-white/10 bg-white/[0.04] hover:bg-white/[0.09]',
              disabled && !chosen ? 'opacity-55' : '',
            ].join(' ')}
          >
            {fee}
          </button>
        );
      })}
    </div>
  );
}

function PitchGrid({
  selectedAnswer,
  disabled,
  onAnswer,
}: {
  selectedAnswer: string | null;
  disabled: boolean;
  onAnswer: (answer: string) => void;
}) {
  // Forward at the top (attacking upfield), Goalkeeper at the back.
  const lines = [...PITCH_ZONES].reverse();
  return (
    <div className="overflow-hidden rounded-2xl border border-pitch/25 bg-gradient-to-b from-pitch/[0.1] to-pitch/[0.02]">
      {lines.map((zone, i) => {
        const chosen = selectedAnswer === zone;
        return (
          <button
            key={zone}
            type="button"
            disabled={disabled}
            onClick={() => onAnswer(zone)}
            aria-pressed={chosen}
            className={[
              'answer-press flex w-full items-center justify-center py-4 text-sm font-semibold uppercase tracking-[0.15em]',
              i > 0 ? 'border-t border-dashed border-white/15' : '',
              chosen ? 'bg-pitch/20 text-pitch' : 'text-white/70 hover:bg-white/[0.05]',
              disabled && !chosen ? 'opacity-55' : '',
            ].join(' ')}
          >
            {zone}
          </button>
        );
      })}
    </div>
  );
}
