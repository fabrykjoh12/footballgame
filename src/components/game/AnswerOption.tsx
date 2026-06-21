import { IconCheck, IconClose } from '../ui/icons';

export type AnswerState =
  | 'idle'
  | 'selected' // chosen, result not shown yet
  | 'correct' // the right answer (reveal)
  | 'incorrect' // chosen but wrong (reveal)
  | 'muted'; // not chosen, not correct (reveal)

const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

interface AnswerOptionProps {
  text: string;
  index: number;
  state: AnswerState;
  disabled?: boolean;
  /** Shown e.g. "Your pick" so we never rely on colour alone. */
  tag?: string;
  onClick?: () => void;
}

const STATE_CLASSES: Record<AnswerState, string> = {
  idle: 'border-white/10 bg-white/[0.04] hover:bg-white/[0.09] hover:border-white/20',
  selected: 'border-pitch/70 bg-pitch/10 ring-2 ring-pitch/40',
  correct: 'border-good/70 bg-good/15 ring-2 ring-good/50 animate-pulse-glow',
  incorrect: 'border-danger/70 bg-danger/15 animate-shake',
  muted: 'border-white/10 bg-white/[0.02] opacity-55',
};

export function AnswerOption({
  text,
  index,
  state,
  disabled,
  tag,
  onClick,
}: AnswerOptionProps) {
  const showCheck = state === 'correct';
  const showCross = state === 'incorrect';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Option ${LETTERS[index]}: ${text}${
        state === 'correct' ? ' (correct answer)' : state === 'incorrect' ? ' (your answer, wrong)' : ''
      }`}
      className={[
        'answer-press group flex w-full items-center gap-3 rounded-xl border px-4 py-3.5 text-left',
        'transition-colors duration-150 disabled:cursor-default',
        STATE_CLASSES[state],
      ].join(' ')}
    >
      <span
        className={[
          'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold',
          state === 'correct'
            ? 'bg-good/25 text-good'
            : state === 'incorrect'
              ? 'bg-danger/25 text-danger'
              : 'bg-white/10 text-white/60',
        ].join(' ')}
      >
        {showCheck ? (
          <IconCheck className="h-4 w-4" />
        ) : showCross ? (
          <IconClose className="h-4 w-4" />
        ) : (
          LETTERS[index]
        )}
      </span>
      <span className="flex-1 font-medium leading-tight">{text}</span>
      {tag && (
        <span className="shrink-0 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">
          {tag}
        </span>
      )}
    </button>
  );
}
