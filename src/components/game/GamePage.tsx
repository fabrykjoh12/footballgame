import { useEffect, useState } from 'react';
import { useGame } from '../../context/GameProvider';
import { useCountdown } from '../../hooks/useCountdown';
import { play } from '../../lib/sound';
import { MATCH_MODES } from '../../lib/matchModes';
import { teamName } from '../../lib/teamName';
import { Scoreboard } from '../layout/Scoreboard';
import { Badge } from '../ui/Badge';
import { TimerBar } from './TimerBar';
import { QuestionCard } from './QuestionCard';
import { ResultReveal } from './ResultReveal';
import { GoalAnimation } from './GoalAnimation';
import { CommentaryTicker } from './CommentaryTicker';
import { MatchTimeline } from './MatchTimeline';

export function GamePage() {
  const {
    room,
    localPlayerId,
    isHost,
    opponent,
    submitAnswer,
    nextQuestion,
    canPause,
    pauseMatch,
    resumeMatch,
  } = useGame();

  const [picked, setPicked] = useState<string | null>(null);
  const [locked, setLocked] = useState(false);

  const stoppageRound = room?.stoppageRound ?? 0;
  const question =
    stoppageRound > 0
      ? room?.tiebreakers?.[stoppageRound - 1]
      : room?.selectedQuestions[room.currentQuestionIndex];
  const qId = question?.id;

  // Reset local answer state whenever a new question begins.
  useEffect(() => {
    setPicked(null);
    setLocked(false);
  }, [qId]);

  // Referee whistle at kick-off.
  useEffect(() => {
    if (room?.status === 'starting') play('whistle');
  }, [room?.status]);

  // Ding / buzz when this player's result is revealed.
  useEffect(() => {
    if (room?.status === 'showing_result' && room.lastResult) {
      const r = room.lastResult.results[localPlayerId];
      if (r) play(r.isCorrect ? 'correct' : 'wrong');
    }
  }, [room?.status, room?.lastResult?.questionId, localPlayerId]);

  const countdown = useCountdown(
    room?.questionStartedAt ?? null,
    room?.settings.questionDurationMs ?? 15000,
    room?.status === 'in_question' && !room?.paused,
  );

  if (!room) return null;
  const total = room.selectedQuestions.length;
  const status = room.status;

  const clueStage =
    question?.type === 'who_am_i'
      ? Math.min(Math.floor(countdown.elapsedMs / 5000), question.clues.length - 1)
      : 0;

  const roomAnswers = (qId && room.answers[qId]) || [];
  const myRoomAnswer = roomAnswers.find((a) => a.playerId === localPlayerId);
  const hasAnswered = locked || Boolean(myRoomAnswer);
  const selectedAnswer = picked ?? myRoomAnswer?.selectedAnswer ?? null;
  const opponentAnswered = roomAnswers.some((a) => a.playerId !== localPlayerId);

  const paused = Boolean(room.paused);

  const handleAnswer = (answer: string) => {
    if (hasAnswered || status !== 'in_question' || paused) return;
    play('click');
    setPicked(answer);
    setLocked(true);
    void submitAnswer({
      selectedAnswer: answer,
      clueStage,
      timeTakenMs: countdown.elapsedMs,
    });
  };

  return (
    <div className="flex flex-col gap-4 py-3">
      <GoalAnimation />

      <MatchTimeline />

      <Scoreboard
        players={room.players}
        localPlayerId={localPlayerId}
        questionNumber={Math.min(room.currentQuestionIndex + 1, total)}
        totalQuestions={total}
      />

      {opponent && !opponent.connected && (
        <div
          role="status"
          className="rounded-lg border border-gold/30 bg-gold/10 px-3 py-2 text-center text-sm text-gold"
        >
          {opponent.name} disconnected — they may rejoin, or you can finish out the match.
        </div>
      )}

      <CommentaryTicker />

      {stoppageRound > 0 && (
        <div className="flex items-center justify-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-center text-sm font-bold uppercase tracking-wider text-gold motion-safe:animate-pulse">
          ⏱ Stoppage Time — Sudden Death
          {stoppageRound > 1 ? ` · Round ${stoppageRound}` : ''}
        </div>
      )}

      {status === 'starting' && <Kickoff players={room.players} mode={room.settings.mode} />}

      {status === 'in_question' && question && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <Badge tone="muted">{MATCH_MODES[room.settings.mode].label}</Badge>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/40">
                Question {Math.min(room.currentQuestionIndex + 1, total)} of {total}
              </span>
              {canPause && (
                <button
                  type="button"
                  onClick={() => void pauseMatch()}
                  aria-label="Pause match"
                  className="rounded-lg border border-white/10 px-2 py-1 text-xs font-semibold text-white/60 transition hover:border-pitch/50 hover:text-pitch focus:outline-none focus-visible:ring-2 focus-visible:ring-pitch"
                >
                  ⏸ Pause
                </button>
              )}
            </div>
          </div>
          <TimerBar fraction={countdown.fraction} secondsLeft={countdown.secondsLeft} />
          <QuestionCard
            key={question.id}
            question={question}
            clueStage={clueStage}
            selectedAnswer={selectedAnswer}
            hasAnswered={hasAnswered}
            opponentAnswered={opponentAnswered}
            onAnswer={handleAnswer}
          />
        </div>
      )}

      {status === 'showing_result' && room.lastResult && (
        <ResultReveal
          result={room.lastResult}
          players={room.players}
          localPlayerId={localPlayerId}
          isHost={isHost}
          isLastQuestion={room.currentQuestionIndex >= total - 1}
          questionDurationMs={room.settings.questionDurationMs}
          matchMinute={
            stoppageRound > 0
              ? 90 + stoppageRound
              : Math.round(((room.currentQuestionIndex + 1) / total) * 90)
          }
          onNext={nextQuestion}
        />
      )}

      {paused && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Match paused"
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-ink-900/90 px-6 text-center backdrop-blur-sm"
        >
          <div className="font-display text-xs uppercase tracking-[0.3em] text-pitch">
            Paused
          </div>
          <div className="font-display text-3xl font-bold text-white">Match suspended</div>
          <p className="max-w-xs text-sm text-white/60">
            The clock and your opponent are frozen for both sides. Resume when you’re ready.
          </p>
          <button
            type="button"
            autoFocus
            onClick={() => void resumeMatch()}
            className="rounded-xl bg-pitch px-8 py-3.5 font-display text-base font-bold text-ink-900 shadow-glow transition hover:brightness-110"
          >
            Resume
          </button>
        </div>
      )}
    </div>
  );
}

function Kickoff({
  players,
  mode,
}: {
  players: { id: string; name: string }[];
  mode: keyof typeof MATCH_MODES;
}) {
  const [a, b] = players;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16 text-center animate-scale-in">
      <div className="relative grid h-20 w-20 place-items-center">
        <span className="absolute inset-0 animate-pulse-glow rounded-full bg-pitch/20" />
        <svg viewBox="0 0 24 24" className="h-12 w-12 animate-spin-slow text-pitch" aria-hidden>
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 7l2.6 1.9-1 3.1h-3.2l-1-3.1zM12 12.5l3 2.2-1.1 3.3h-3.8L9 14.7z"
            fill="currentColor"
          />
        </svg>
      </div>
      <div className="font-display text-3xl font-bold text-gradient-pitch">Kick off!</div>
      {a && b && (
        <div className="text-white/70">
          {teamName(a.name)} <span className="text-white/40">vs</span> {teamName(b.name)}
        </div>
      )}
      <Badge tone="pitch">{MATCH_MODES[mode].label}</Badge>
    </div>
  );
}
