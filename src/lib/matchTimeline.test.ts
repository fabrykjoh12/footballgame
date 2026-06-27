import { describe, it, expect } from 'vitest';
import {
  buildQuestionMarks,
  minuteForQuestion,
  FULL_TIME,
  type SideOutcome,
} from './matchTimeline';

const TOTAL = 20_000;

const out = (over: Partial<SideOutcome> = {}): SideOutcome => ({
  scoredGoal: false,
  isCorrect: false,
  answered: true,
  pointsEarned: 0,
  streakBonus: 0,
  timeTakenMs: TOTAL / 2,
  ...over,
});

describe('minuteForQuestion', () => {
  it('maps the last question to full time', () => {
    expect(minuteForQuestion(9, 10)).toBe(FULL_TIME);
  });
  it('maps the first question to ~9 minutes of a 10-question match', () => {
    expect(minuteForQuestion(0, 10)).toBe(9);
  });
  it('guards against a zero total', () => {
    expect(minuteForQuestion(0, 0)).toBe(FULL_TIME);
  });
});

describe('buildQuestionMarks', () => {
  it('marks a goal with goal weight', () => {
    const marks = buildQuestionMarks({
      questionId: 'q1',
      minute: 30,
      totalTimeMs: TOTAL,
      home: out({ scoredGoal: true, isCorrect: true }),
    });
    expect(marks).toHaveLength(1);
    expect(marks[0]).toMatchObject({ side: 'home', kind: 'goal', weight: 'goal', minute: 30 });
  });

  it('marks a fast correct as a big chance', () => {
    const marks = buildQuestionMarks({
      questionId: 'q2',
      minute: 12,
      totalTimeMs: TOTAL,
      home: out({ isCorrect: true, timeTakenMs: 1000 }),
    });
    expect(marks[0]).toMatchObject({ kind: 'big_chance', weight: 'chance' });
  });

  it('marks a wrong-but-answered as a save (miss weight)', () => {
    const marks = buildQuestionMarks({
      questionId: 'q3',
      minute: 50,
      totalTimeMs: TOTAL,
      away: out({ isCorrect: false, answered: true }),
    });
    expect(marks[0]).toMatchObject({ side: 'away', kind: 'shot_saved', weight: 'miss' });
  });

  it('omits plain attacks and turnovers to avoid clutter', () => {
    const marks = buildQuestionMarks({
      questionId: 'q4',
      minute: 40,
      totalTimeMs: TOTAL,
      // mid-pace correct = good_attack (not shown); no answer = turnover (not shown)
      home: out({ isCorrect: true, timeTakenMs: TOTAL / 2 }),
      away: out({ isCorrect: false, answered: false }),
    });
    expect(marks).toHaveLength(0);
  });

  it('can return one mark per side', () => {
    const marks = buildQuestionMarks({
      questionId: 'q5',
      minute: 70,
      totalTimeMs: TOTAL,
      home: out({ scoredGoal: true, isCorrect: true }),
      away: out({ isCorrect: false, answered: true }),
    });
    expect(marks.map((m) => m.side).sort()).toEqual(['away', 'home']);
  });

  it('produces stable keys per side for dedupe', () => {
    const marks = buildQuestionMarks({
      questionId: 'qX',
      minute: 20,
      totalTimeMs: TOTAL,
      home: out({ scoredGoal: true, isCorrect: true }),
    });
    expect(marks[0].key).toBe('qX-home');
  });
});
