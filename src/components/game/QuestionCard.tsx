import { useState } from 'react';
import type { Question } from '../../types/game';
import { MINI_GAME_HELP, isFirstEncounter } from '../../lib/miniGameHelp';
import { Card } from '../ui/Card';
import { Badge, DifficultyBadge } from '../ui/Badge';
import { QuestionView } from './questionViews';
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
          className="ml-auto grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-xs font-bold text-white/55 hover:bg-white/[0.05] hover:text-white"
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
            <p className="mt-0.5 text-xs leading-snug text-white/55">{help.example}</p>
          </div>
          <button
            type="button"
            onClick={dismissHelp}
            aria-label="Dismiss how to play"
            className="shrink-0 rounded-full p-1 text-white/55 hover:bg-white/[0.05] hover:text-white"
          >
            <IconClose className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Prompt + answer control for this question type (registry-dispatched). */}
      <QuestionView
        question={question}
        clueStage={clueStage}
        selectedAnswer={selectedAnswer}
        hasAnswered={hasAnswered}
        onAnswer={onAnswer}
      />

      {/* Status line */}
      <div className="mt-4 flex items-center justify-between text-xs">
        <span
          className={[
            'flex items-center gap-1.5',
            opponentAnswered ? 'text-pitch' : 'text-white/55',
          ].join(' ')}
        >
          {opponentAnswered ? (
            <>
              <IconCheck className="h-3.5 w-3.5" /> Opponent answered
            </>
          ) : (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-ink-300" />
              Opponent thinking…
            </>
          )}
        </span>
        {hasAnswered && (
          <span className="text-white/55">Answer locked — waiting for reveal</span>
        )}
      </div>
    </Card>
  );
}
