import { useMemo } from 'react';
import { useMatch } from '../providers/MatchProvider.tsx';
import { currentScoreline, type MatchState } from '../../engine/matchReducer.ts';
import { tallyScoreline } from '../../engine/scoring.ts';
import { getMiniGame } from '../../minigames/registry.ts';
import { MiniGameShell } from '../../minigames/MiniGameShell.tsx';
import { Scoreboard } from '../../ui/scoreboard/Scoreboard.tsx';
import { MatchTimeline } from '../../ui/timeline/MatchTimeline.tsx';
import { CommentaryTicker } from '../../ui/commentary/CommentaryTicker.tsx';
import {
  commentForResult,
  kickoffLine,
  type CommentaryContext,
} from '../../ui/commentary/commentaryEngine.ts';
import { QUESTIONS_PER_MATCH, type AnswerValue } from '../../types/match.ts';

export function GameplayScreen() {
  const { state, question, answer } = useMatch();
  const { player, opponent, phase } = state;

  const scoreline = currentScoreline(state);
  const commentary = useCommentary(state);

  if (!player || !opponent) return null;

  const inQuestion = phase.kind === 'in_question';
  const isReveal = phase.kind === 'question_reveal';
  const isTiebreak = phase.kind === 'tiebreaker';

  const locked =
    isReveal ||
    (inQuestion && phase.playerOutcome !== null) ||
    (isTiebreak && phase.playerOutcome !== null);

  const questionNumber = Math.min(state.results.length + 1, QUESTIONS_PER_MATCH);
  const clock = isTiebreak ? 'ET' : `${questionNumber} / ${QUESTIONS_PER_MATCH}`;
  const deadline = inQuestion ? phase.deadline : null;

  const game = question ? getMiniGame(question.gameId) : null;
  const Body = game?.Component;

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 py-5">
      <Scoreboard player={player} opponent={opponent} scoreline={scoreline} clock={clock} />
      <MatchTimeline results={state.results} currentIndex={state.results.length} />

      <div className="flex-1">
        {isTiebreak && (
          <p className="mb-3 text-center text-sm font-semibold uppercase tracking-widest text-neon">
            Sudden death · round {phase.round}
          </p>
        )}
        {Body && question ? (
          <MiniGameShell title={game?.title ?? ''} deadline={deadline}>
            <Body
              key={question.wireIndex}
              payload={question.payload as never}
              onAnswer={answer as (a: AnswerValue) => void}
              locked={locked}
            />
          </MiniGameShell>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-pitch-900/60 p-8 text-center text-ink-muted">
            Loading question…
          </div>
        )}

        {isReveal && (
          <RevealBanner
            correct={phase.result.player.correct}
            goals={phase.result.playerGoals}
          />
        )}
      </div>

      <CommentaryTicker lines={commentary} />
    </div>
  );
}

function RevealBanner({ correct, goals }: { correct: boolean; goals: number }) {
  return (
    <div
      className={[
        'mt-3 animate-fade-up rounded-xl px-4 py-3 text-center text-sm font-semibold',
        goals > 0
          ? 'bg-neon/15 text-neon'
          : correct
            ? 'bg-amber-400/10 text-amber-200'
            : 'bg-red-400/10 text-red-200',
      ].join(' ')}
    >
      {goals > 1
        ? 'What a strike — that’s a brace!'
        : goals === 1
          ? 'GOAL! Clinical finish.'
          : correct
            ? 'Correct, but the chance went begging.'
            : 'Missed it — no goal.'}
    </div>
  );
}

function useCommentary(state: MatchState): string[] {
  return useMemo(() => {
    const { player, opponent, results } = state;
    if (!player || !opponent) return [];
    const baseCtx: CommentaryContext = {
      playerTeam: player.team.name,
      opponentTeam: opponent.team.name,
      playerSide: player.side,
      scoreline: { home: 0, away: 0 },
    };
    const lines: string[] = [kickoffLine(baseCtx)];
    results.forEach((r, i) => {
      const scoreline = tallyScoreline(results.slice(0, i + 1), player.side);
      lines.push(...commentForResult(r, { ...baseCtx, scoreline }));
    });
    return lines;
  }, [state]);
}
