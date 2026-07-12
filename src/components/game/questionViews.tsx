/**
 * Per-question-type renderers, keyed by type in QUESTION_RENDERERS.
 *
 * QuestionCard is just a shell (header / how-to-play / status line). The actual
 * prompt + answer control for each mini-game lives in a small view component
 * here, so adding or removing a type is a one-line change to the registry
 * rather than editing a wall of conditionals.
 *
 * Each view is authored against its NARROWED question variant (full type
 * safety inside). The single dispatch boundary (`QuestionView`) carries one
 * contained cast, because TypeScript can't prove that
 * `QUESTION_RENDERERS[question.type]` lines up with the specific `question`
 * variant across the union.
 */

import { useState, type ReactElement } from 'react';
import type { Question, QuestionType } from '../../types/game';
import { calculateBasePoints } from '../../lib/scoring';
import { teamIdentity } from '../../lib/teamIdentity';
import { PITCH_ZONES } from '../../lib/positions';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { AnswerOption, type AnswerState } from './AnswerOption';

/** Props every question view receives. `Q` narrows to the type's variant. */
export interface QuestionViewProps<Q extends Question = Question> {
  question: Q;
  selectedAnswer: string | null;
  hasAnswered: boolean;
  /** Only meaningful for who_am_i (drives which clues are revealed). */
  clueStage: number;
  onAnswer: (answer: string) => void;
}

type QuestionView<Q extends Question> = (props: QuestionViewProps<Q>) => ReactElement;
type NarrowView<T extends QuestionType> = QuestionView<Extract<Question, { type: T }>>;

/* --------------------------- shared building blocks --------------------------- */

/** A "heading + prompt" body used by most non-clue types. */
function PromptHeading({ heading, prompt }: { heading: string; prompt: string }) {
  return (
    <div className="mb-4">
      <h2 className="mb-2 text-sm font-semibold text-white/65">{heading}</h2>
      <p className="text-lg font-semibold leading-snug sm:text-xl">{prompt}</p>
    </div>
  );
}

/** The generic 4-option answer grid shared by every multiple-choice type. */
function MultipleChoiceGrid({
  options,
  selectedAnswer,
  hasAnswered,
  onAnswer,
}: {
  options: string[];
  selectedAnswer: string | null;
  hasAnswered: boolean;
  onAnswer: (answer: string) => void;
}) {
  return (
    <div className="grid gap-2.5 sm:grid-cols-2">
      {options.map((opt, i) => {
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
  );
}

/* -------------------------------- type views -------------------------------- */

const WhoAmIQuestionView: NarrowView<'who_am_i'> = ({
  question,
  clueStage,
  selectedAnswer,
  hasAnswered,
  onAnswer,
}) => {
  const potential = calculateBasePoints('who_am_i', clueStage);
  return (
    <>
      <div className="mb-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/65">Guess the player</h2>
          <Badge tone="gold">
            <span className="nums">up to {potential} pts</span>
          </Badge>
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
                    ? 'border-white/10 bg-white/[0.03] text-white animate-fade-in'
                    : 'border-dashed border-white/10 bg-transparent text-white/40',
                ].join(' ')}
              >
                <span className="nums mr-2 font-mono text-xs text-pitch/70">{i + 1}</span>
                {revealed ? clue : `Clue unlocks at ${i * 5}s…`}
              </li>
            );
          })}
        </ul>
      </div>
      <MultipleChoiceGrid
        options={question.options}
        selectedAnswer={selectedAnswer}
        hasAnswered={hasAnswered}
        onAnswer={onAnswer}
      />
    </>
  );
};

const CareerPathQuestionView: NarrowView<'career_path'> = ({
  question,
  selectedAnswer,
  hasAnswered,
  onAnswer,
}) => (
  <>
    <div className="mb-4">
      <h2 className="mb-3 text-sm font-semibold text-white/65">Whose career path is this?</h2>
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
                    : 'border-white/10 bg-white/[0.03]',
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
              {i < question.path.length - 1 && <span className="text-pitch/60">→</span>}
            </span>
          );
        })}
      </div>
    </div>
    <MultipleChoiceGrid
      options={question.options}
      selectedAnswer={selectedAnswer}
      hasAnswered={hasAnswered}
      onAnswer={onAnswer}
    />
  </>
);

const ClubCountryQuestionView: NarrowView<'club_country'> = ({
  question,
  selectedAnswer,
  hasAnswered,
  onAnswer,
}) => (
  <>
    <p className="mb-4 text-lg font-semibold leading-snug sm:text-xl">{question.prompt}</p>
    <MultipleChoiceGrid
      options={question.options}
      selectedAnswer={selectedAnswer}
      hasAnswered={hasAnswered}
      onAnswer={onAnswer}
    />
  </>
);

const OddOneOutQuestionView: NarrowView<'odd_one_out'> = ({
  question,
  selectedAnswer,
  hasAnswered,
  onAnswer,
}) => (
  <>
    <PromptHeading heading="Odd one out" prompt={question.prompt} />
    <MultipleChoiceGrid
      options={question.options}
      selectedAnswer={selectedAnswer}
      hasAnswered={hasAnswered}
      onAnswer={onAnswer}
    />
  </>
);

const SpotTheLieQuestionView: NarrowView<'spot_the_lie'> = ({
  question,
  selectedAnswer,
  hasAnswered,
  onAnswer,
}) => (
  <>
    <PromptHeading heading="Spot the lie" prompt={question.prompt} />
    <MultipleChoiceGrid
      options={question.options}
      selectedAnswer={selectedAnswer}
      hasAnswered={hasAnswered}
      onAnswer={onAnswer}
    />
  </>
);

const HigherLowerQuestionView: NarrowView<'higher_lower'> = ({
  question,
  selectedAnswer,
  hasAnswered,
  onAnswer,
}) => {
  const renderOption = (name: string) => {
    const chosen = selectedAnswer === name;
    const kit = teamIdentity(name);
    return (
      <button
        type="button"
        disabled={hasAnswered}
        onClick={() => onAnswer(name)}
        aria-pressed={chosen}
        className={[
          'answer-press flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center',
          chosen
            ? 'border-pitch/70 bg-pitch/10 ring-2 ring-pitch/40'
            : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]',
          hasAnswered && !chosen ? 'opacity-55' : '',
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
        {chosen && <span className="text-[11px] font-bold text-pitch">Your pick</span>}
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
        <div className="flex items-center text-sm font-bold text-white/55">VS</div>
        {renderOption(question.rightOption.name)}
      </div>
    </div>
  );
};

const GuessYearQuestionView: NarrowView<'guess_year'> = ({
  question,
  selectedAnswer,
  hasAnswered,
  onAnswer,
}) => (
  <>
    <PromptHeading heading="In which year?" prompt={question.prompt} />
    <div className="grid grid-cols-4 gap-2">
      {question.options.map((year) => {
        const chosen = selectedAnswer === year;
        return (
          <button
            key={year}
            type="button"
            disabled={hasAnswered}
            onClick={() => onAnswer(year)}
            aria-pressed={chosen}
            aria-label={`Year ${year}`}
            className={[
              'answer-press nums flex min-h-[72px] flex-col items-center justify-center rounded-xl border font-mono text-lg font-bold',
              chosen
                ? 'border-pitch/70 bg-pitch/10 text-pitch ring-2 ring-pitch/40'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]',
              hasAnswered && !chosen ? 'opacity-55' : '',
            ].join(' ')}
          >
            {year}
          </button>
        );
      })}
    </div>
  </>
);

const TransferFeeQuestionView: NarrowView<'transfer_fee'> = ({
  question,
  selectedAnswer,
  hasAnswered,
  onAnswer,
}) => (
  <>
    <PromptHeading heading="What was the fee?" prompt={question.prompt} />
    <div className="grid grid-cols-2 gap-2.5">
      {question.options.map((fee) => {
        const chosen = selectedAnswer === fee;
        return (
          <button
            key={fee}
            type="button"
            disabled={hasAnswered}
            onClick={() => onAnswer(fee)}
            aria-pressed={chosen}
            aria-label={`Fee ${fee}`}
            className={[
              'answer-press nums flex min-h-[64px] items-center justify-center rounded-xl border font-mono text-xl font-bold tracking-tight',
              chosen
                ? 'border-pitch/70 bg-pitch/10 text-pitch ring-2 ring-pitch/40'
                : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.05]',
              hasAnswered && !chosen ? 'opacity-55' : '',
            ].join(' ')}
          >
            {fee}
          </button>
        );
      })}
    </div>
  </>
);

const PitchPositionQuestionView: NarrowView<'pitch_position'> = ({
  question,
  selectedAnswer,
  hasAnswered,
  onAnswer,
}) => {
  // Forward at the top (attacking upfield), Goalkeeper at the back.
  const lines = [...PITCH_ZONES].reverse();
  return (
    <>
      <PromptHeading heading="Where did they play?" prompt={question.prompt} />
      <div className="overflow-hidden rounded-2xl border border-pitch/25 bg-gradient-to-b from-pitch/[0.1] to-pitch/[0.02]">
        {lines.map((zone, i) => {
          const chosen = selectedAnswer === zone;
          return (
            <button
              key={zone}
              type="button"
              disabled={hasAnswered}
              onClick={() => onAnswer(zone)}
              aria-pressed={chosen}
              className={[
                'answer-press flex w-full items-center justify-center py-4 text-sm font-semibold',
                i > 0 ? 'border-t border-dashed border-white/10' : '',
                chosen ? 'bg-pitch/20 text-pitch' : 'text-white/65 hover:bg-white/[0.04]',
                hasAnswered && !chosen ? 'opacity-55' : '',
              ].join(' ')}
            >
              {zone}
            </button>
          );
        })}
      </div>
    </>
  );
};

const GuessTheNumberQuestionView: NarrowView<'guess_the_number'> = ({
  question,
  selectedAnswer,
  hasAnswered,
  onAnswer,
}) => {
  const mid = Math.round((question.min + question.max) / 2);
  const [value, setValue] = useState(mid);
  const locked = selectedAnswer != null;
  const shown = locked ? Number(selectedAnswer) : value;

  return (
    <>
      <PromptHeading heading="Guess the number — closest wins" prompt={question.prompt} />
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <span className="nums font-display text-4xl font-bold text-pitch tabular-nums">{shown}</span>
          {question.unit && <span className="ml-1.5 text-sm text-white/55">{question.unit}</span>}
        </div>
        <input
          type="range"
          min={question.min}
          max={question.max}
          step={question.step ?? 1}
          value={shown}
          disabled={hasAnswered || locked}
          onChange={(e) => setValue(Number(e.target.value))}
          aria-label="Your guess"
          className="w-full accent-pitch"
        />
        <div className="flex justify-between text-xs text-white/55">
          <span>{question.min}</span>
          <span>{question.max}</span>
        </div>
        {!locked && !hasAnswered && (
          <Button fullWidth onClick={() => onAnswer(String(value))}>
            Lock it in
          </Button>
        )}
      </div>
    </>
  );
};

/* -------------------------------- registry -------------------------------- */

export const QUESTION_RENDERERS: { [T in QuestionType]: NarrowView<T> } = {
  who_am_i: WhoAmIQuestionView,
  career_path: CareerPathQuestionView,
  higher_lower: HigherLowerQuestionView,
  club_country: ClubCountryQuestionView,
  guess_year: GuessYearQuestionView,
  transfer_fee: TransferFeeQuestionView,
  pitch_position: PitchPositionQuestionView,
  odd_one_out: OddOneOutQuestionView,
  spot_the_lie: SpotTheLieQuestionView,
  guess_the_number: GuessTheNumberQuestionView,
};

/**
 * Dispatch to the registered view for this question's type. The lookup is
 * type-safe per entry; the one cast bridges the union at the call site (TS
 * can't correlate `question.type` with the matching renderer's param type).
 */
export function QuestionView(props: QuestionViewProps<Question>): ReactElement {
  const Renderer = QUESTION_RENDERERS[props.question.type] as QuestionView<Question>;
  return <Renderer {...props} />;
}
