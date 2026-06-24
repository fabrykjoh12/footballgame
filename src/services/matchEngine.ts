/**
 * MatchEngine — the authoritative game-state machine.
 *
 * It owns a single `Room`, drives the question/result/finish lifecycle,
 * manages all timers (question countdown + result auto-advance), and applies
 * the scoring rules from `lib/scoring`. It is intentionally backend-agnostic:
 *
 *   - LocalGameService runs an engine on the player's own machine (the
 *     opponent is a bot).
 *   - SupabaseGameService runs an engine ONLY on the host's machine and
 *     broadcasts each snapshot; guests just render snapshots and send actions
 *     back to the host, which feeds them into its engine.
 *
 * Everything the UI needs for a phase lives on the Room snapshot, so the
 * engine emits a fresh (cloned) Room on every transition.
 */

import type {
  GameEvent,
  GameEventKind,
  PlayerResult,
  Question,
  QuestionResult,
  Room,
  SubmitAnswerInput,
} from '../types/game';
import {
  calculateGoalsFromPoints,
  calculateQuestionPoints,
  getFootballEventLabel,
  getSoloPlayerEvents,
} from '../lib/scoring';

/** Delay before the first question after the host hits start. */
const KICKOFF_DELAY_MS = 1400;
/** Grace delay once everyone has answered, before revealing. */
const ALL_ANSWERED_REVEAL_MS = 650;
/** How long the result reveal stays up before auto-advancing. */
export const RESULT_AUTOADVANCE_MS = 9000;

export interface MatchEngineCallbacks {
  onRoom: (room: Room) => void;
  onEvent: (event: GameEvent) => void;
}

export class MatchEngine {
  private room: Room;
  private readonly cb: MatchEngineCallbacks;

  private questionTimer: ReturnType<typeof setTimeout> | null = null;
  private revealTimer: ReturnType<typeof setTimeout> | null = null;
  private advanceTimer: ReturnType<typeof setTimeout> | null = null;
  private eventNonce = 0;

  constructor(room: Room, cb: MatchEngineCallbacks) {
    this.room = room;
    this.cb = cb;
  }

  getRoom(): Room {
    return this.room;
  }

  /** Replace the room wholesale (used when a snapshot must be forced in). */
  setRoom(room: Room): void {
    this.room = room;
    this.emit();
  }

  dispose(): void {
    this.clearTimers();
  }

  /* ----------------------------- lifecycle ----------------------------- */

  /**
   * Start (or restart, for a rematch) a match with a freshly picked question
   * set. Resets every player's match stats, then runs a short "kick off"
   * phase before the first question.
   */
  beginMatch(questions: Question[], tiebreakers: Question[] = []): void {
    if (questions.length === 0) return;
    this.clearTimers();
    this.room = {
      ...this.room,
      status: 'starting',
      selectedQuestions: questions,
      tiebreakers,
      stoppageRound: 0,
      currentQuestionIndex: 0,
      questionStartedAt: null,
      lastResult: null,
      answers: {},
      scores: Object.fromEntries(this.room.players.map((p) => [p.id, 0])),
      players: this.room.players.map((p) => ({
        ...p,
        score: 0,
        goals: 0,
        correctAnswers: 0,
        streak: 0,
        bestStreak: 0,
        fastestAnswerMs: null,
      })),
    };
    this.emit();
    this.questionTimer = setTimeout(() => this.beginQuestion(0), KICKOFF_DELAY_MS);
  }

  private beginQuestion(index: number): void {
    this.clearTimers();
    const question = this.room.selectedQuestions[index];
    if (!question) {
      this.finish();
      return;
    }
    this.startQuestion(
      { ...this.room, currentQuestionIndex: index, stoppageRound: 0 },
      question,
    );
  }

  /** Begin the nth sudden-death round (1-based) from the tiebreaker reserve. */
  private beginStoppageRound(round: number): void {
    this.clearTimers();
    const question = (this.room.tiebreakers ?? [])[round - 1];
    if (!question) {
      this.finish();
      return;
    }
    this.startQuestion({ ...this.room, stoppageRound: round }, question);
  }

  /** Shared "put a question live" transition for both normal play and SD. */
  private startQuestion(baseRoom: Room, question: Question): void {
    const answers = { ...baseRoom.answers };
    answers[question.id] = [];
    this.room = {
      ...baseRoom,
      status: 'in_question',
      questionStartedAt: Date.now(),
      lastResult: null,
      answers,
    };
    this.emit();
    this.questionTimer = setTimeout(
      () => this.resolveQuestion(),
      this.room.settings.questionDurationMs,
    );
  }

  /** Record one player's answer. Resolves early once everyone has answered. */
  recordAnswer(playerId: string, input: SubmitAnswerInput): void {
    if (this.room.status !== 'in_question') return;
    const question = this.currentQuestion();
    if (!question) return;

    const existing = this.room.answers[question.id] ?? [];
    if (existing.some((a) => a.playerId === playerId)) return; // one answer per player

    const isCorrect = input.selectedAnswer === question.correctAnswer;
    const answers = { ...this.room.answers };
    answers[question.id] = [
      ...existing,
      {
        playerId,
        questionId: question.id,
        selectedAnswer: input.selectedAnswer,
        isCorrect,
        answeredAt: Date.now(),
        timeTakenMs: input.timeTakenMs,
        pointsEarned: 0, // finalised at reveal so streak order is deterministic
        clueStage: input.clueStage,
      },
    ];
    this.room = { ...this.room, answers };
    this.emit();

    const everyoneAnswered = this.room.players.every((p) =>
      answers[question.id].some((a) => a.playerId === p.id),
    );
    if (everyoneAnswered) {
      if (this.revealTimer) clearTimeout(this.revealTimer);
      this.revealTimer = setTimeout(
        () => this.resolveQuestion(),
        ALL_ANSWERED_REVEAL_MS,
      );
    }
  }

  /** Compute results for the current question and move to showing_result. */
  private resolveQuestion(): void {
    if (this.room.status !== 'in_question') return;
    this.clearTimers();

    const question = this.currentQuestion();
    if (!question) return;
    const inStoppage = (this.room.stoppageRound ?? 0) > 0;
    const totalTime = this.room.settings.questionDurationMs;
    const submitted = this.room.answers[question.id] ?? [];

    // Snapshot goals before applying, for cross-player events.
    const goalsBefore: Record<string, number> = {};
    for (const p of this.room.players) goalsBefore[p.id] = p.goals;

    const results: Record<string, PlayerResult> = {};
    const overlayEvents: { playerId: string; kind: GameEventKind }[] = [];

    // Update players in a stable order so scoring is deterministic.
    let players = this.room.players.map((player) => {
      const ans = submitted.find((a) => a.playerId === player.id);
      const selectedAnswer = ans?.selectedAnswer ?? null;
      const isCorrect = ans?.isCorrect ?? false;
      const timeTakenMs = ans?.timeTakenMs ?? totalTime;
      const clueStage = ans?.clueStage ?? this.maxClueStage(question);

      const newStreak = isCorrect ? player.streak + 1 : 0;
      const breakdown = calculateQuestionPoints({
        type: question.type,
        isCorrect,
        clueStage,
        timeTakenMs,
        totalTimeMs: totalTime,
        newStreak,
      });

      const newScore = player.score + breakdown.total;
      // Sudden death is decided by a golden goal, not by point thresholds.
      const newGoals = inStoppage ? player.goals : calculateGoalsFromPoints(newScore);
      const scoredGoal = !inStoppage && newGoals > goalsBefore[player.id];

      const updated = {
        ...player,
        score: newScore,
        goals: newGoals,
        streak: newStreak,
        bestStreak: Math.max(player.bestStreak, newStreak),
        correctAnswers: player.correctAnswers + (isCorrect ? 1 : 0),
        fastestAnswerMs:
          isCorrect
            ? player.fastestAnswerMs == null
              ? timeTakenMs
              : Math.min(player.fastestAnswerMs, timeTakenMs)
            : player.fastestAnswerMs,
      };

      const soloKinds = getSoloPlayerEvents({
        isCorrect,
        scoredGoal,
        newStreak,
        timeTakenMs,
      });
      for (const k of soloKinds) {
        if (k === 'goal') overlayEvents.push({ playerId: player.id, kind: k });
      }

      results[player.id] = {
        playerId: player.id,
        selectedAnswer,
        isCorrect,
        timeTakenMs,
        breakdown,
        scoredGoal,
        events: soloKinds.map(getFootballEventLabel),
      };
      return updated;
    });

    // Persist finalised points back onto the stored answers.
    const finalisedAnswers = submitted.map((a) => ({
      ...a,
      pointsEarned: results[a.playerId]?.breakdown.total ?? 0,
    }));

    const scores: Record<string, number> = {};
    for (const p of players) scores[p.id] = p.score;

    // Cross-player events (1v1 only): equalizer + late winner, by goals.
    if (players.length === 2 && !inStoppage) {
      const isLastQuestion =
        this.room.currentQuestionIndex >= this.room.selectedQuestions.length - 1;
      for (let i = 0; i < players.length; i++) {
        const me = players[i];
        const opp = players[1 - i];
        const meRes = results[me.id];
        if (!meRes.scoredGoal) continue;
        const beforeLevel = goalsBefore[me.id] === goalsBefore[opp.id];
        const beforeBehind = goalsBefore[me.id] < goalsBefore[opp.id];
        if (isLastQuestion && me.goals > opp.goals && goalsBefore[me.id] <= goalsBefore[opp.id]) {
          meRes.events.push(getFootballEventLabel('late_winner'));
          overlayEvents.push({ playerId: me.id, kind: 'late_winner' });
        } else if (beforeBehind && me.goals === opp.goals && !beforeLevel) {
          meRes.events.push(getFootballEventLabel('equalizer'));
          overlayEvents.push({ playerId: me.id, kind: 'equalizer' });
        }
      }
    }

    // Sudden-death golden goal: if exactly one side is correct, they win it.
    if (inStoppage && players.length === 2) {
      const [pa, pb] = players;
      const aOk = results[pa.id].isCorrect;
      const bOk = results[pb.id].isCorrect;
      if (aOk !== bOk) {
        const winnerId = aOk ? pa.id : pb.id;
        players = players.map((p) =>
          p.id === winnerId ? { ...p, goals: p.goals + 1 } : p,
        );
        results[winnerId].scoredGoal = true;
        results[winnerId].events.push(getFootballEventLabel('late_winner'));
        overlayEvents.push({ playerId: winnerId, kind: 'late_winner' });
      }
    }

    const lastResult: QuestionResult = {
      questionId: question.id,
      questionType: question.type,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      results,
      revealValues:
        question.type === 'higher_lower'
          ? {
              left: question.leftOption,
              right: question.rightOption,
              unit: question.unit,
            }
          : undefined,
    };

    this.room = {
      ...this.room,
      status: 'showing_result',
      questionStartedAt: null,
      players,
      scores,
      answers: { ...this.room.answers, [question.id]: finalisedAnswers },
      lastResult,
    };
    this.emit();

    // Fire overlay events (deduped, capped) just after the snapshot lands.
    for (const ev of overlayEvents) {
      this.cb.onEvent({
        kind: ev.kind,
        playerId: ev.playerId,
        label: getFootballEventLabel(ev.kind),
        nonce: this.eventNonce++,
      });
    }

    this.advanceTimer = setTimeout(() => this.nextQuestion(), RESULT_AUTOADVANCE_MS);
  }

  /** Advance from the result reveal to the next question (or finish). */
  nextQuestion(): void {
    if (this.room.status !== 'showing_result') return;
    this.clearTimers();
    const round = this.room.stoppageRound ?? 0;
    const [a, b] = this.room.players;
    const reserve = this.room.tiebreakers ?? [];

    if (round > 0) {
      // A golden goal made the scoreline decisive — otherwise play on.
      if (a && b && a.goals !== b.goals) {
        this.finish();
      } else if (round < reserve.length) {
        this.beginStoppageRound(round + 1);
      } else {
        this.finish(); // reserves exhausted — fall back to the points decider
      }
      return;
    }

    const nextIndex = this.room.currentQuestionIndex + 1;
    if (nextIndex < this.room.selectedQuestions.length) {
      this.beginQuestion(nextIndex);
      return;
    }

    // End of regulation: sudden death when level on goals and reserves exist.
    if (a && b && a.goals === b.goals && reserve.length > 0) {
      this.beginStoppageRound(1);
    } else {
      this.finish();
    }
  }

  private finish(): void {
    this.clearTimers();
    this.room = {
      ...this.room,
      status: 'finished',
      questionStartedAt: null,
    };
    this.emit();
  }

  /* ----------------------------- helpers ----------------------------- */

  currentQuestion(): Question | undefined {
    const round = this.room.stoppageRound ?? 0;
    if (round > 0) return (this.room.tiebreakers ?? [])[round - 1];
    return this.room.selectedQuestions[this.room.currentQuestionIndex];
  }

  private maxClueStage(question: Question): number {
    return question.type === 'who_am_i'
      ? Math.max(0, question.clues.length - 1)
      : 0;
  }

  private emit(): void {
    // Always hand out a fresh reference so React state updates fire.
    this.cb.onRoom({ ...this.room });
  }

  private clearTimers(): void {
    if (this.questionTimer) clearTimeout(this.questionTimer);
    if (this.revealTimer) clearTimeout(this.revealTimer);
    if (this.advanceTimer) clearTimeout(this.advanceTimer);
    this.questionTimer = null;
    this.revealTimer = null;
    this.advanceTimer = null;
  }
}
