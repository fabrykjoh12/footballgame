import { describe, it, expect } from 'vitest';
import {
  ALL_QUESTS,
  pickDailyQuestIds,
  questById,
  metricValue,
  evaluateQuest,
  type QuestContext,
} from './quests';

const ctx = (over: Partial<QuestContext> = {}): QuestContext => ({
  matchesToday: 0,
  winsToday: 0,
  correctToday: 0,
  dailyRivalDone: false,
  dailyConnDone: false,
  ...over,
});

describe('quest catalogue', () => {
  it('has unique ids and positive targets', () => {
    expect(new Set(ALL_QUESTS.map((q) => q.id)).size).toBe(ALL_QUESTS.length);
    for (const q of ALL_QUESTS) expect(q.target).toBeGreaterThan(0);
  });
});

describe('daily quest selection', () => {
  it('picks exactly three quests, one from each group, deterministically', () => {
    const ids = pickDailyQuestIds('2026-06-30');
    expect(ids).toHaveLength(3);
    expect(pickDailyQuestIds('2026-06-30')).toEqual(ids); // deterministic
    const metrics = ids.map((id) => questById(id)!.metric);
    // One engage (matches|correct), one skill (wins), one daily.
    expect(metrics.some((m) => m === 'matches' || m === 'correct')).toBe(true);
    expect(metrics).toContain('wins');
    expect(metrics.some((m) => m === 'daily_rival' || m === 'daily_conn')).toBe(true);
  });

  it('every picked id resolves to a real quest', () => {
    for (const day of ['2026-01-01', '2026-03-15', '2026-12-31', '2027-07-07']) {
      for (const id of pickDailyQuestIds(day)) {
        expect(questById(id)).toBeDefined();
      }
    }
  });

  it('varies the trio across at least some days', () => {
    const days = ['2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05'];
    const sets = new Set(days.map((d) => pickDailyQuestIds(d).join(',')));
    expect(sets.size).toBeGreaterThan(1);
  });
});

describe('metric + quest evaluation', () => {
  it('clamps counter metrics at zero', () => {
    expect(metricValue('matches', ctx({ matchesToday: -3 }))).toBe(0);
    expect(metricValue('correct', ctx({ correctToday: 12 }))).toBe(12);
  });

  it('reads boolean daily metrics', () => {
    expect(metricValue('daily_rival', ctx({ dailyRivalDone: true }))).toBe(1);
    expect(metricValue('daily_conn', ctx())).toBe(0);
  });

  it('reports progress capped at the target and completion at/after it', () => {
    const win2 = questById('win2')!;
    expect(evaluateQuest(win2, ctx({ winsToday: 1 }))).toMatchObject({ current: 1, complete: false });
    expect(evaluateQuest(win2, ctx({ winsToday: 2 }))).toMatchObject({ current: 2, complete: true });
    expect(evaluateQuest(win2, ctx({ winsToday: 5 }))).toMatchObject({ current: 2, complete: true });
  });

  it('completes a daily quest when its flag is set', () => {
    const dr = questById('daily_rival')!;
    expect(evaluateQuest(dr, ctx()).complete).toBe(false);
    expect(evaluateQuest(dr, ctx({ dailyRivalDone: true })).complete).toBe(true);
  });
});
