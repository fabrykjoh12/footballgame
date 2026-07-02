import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MINI_GAME_HELP,
  isFirstEncounter,
  resetFirstEncounterSession,
} from './miniGameHelp';
import { BASE_POINTS } from './scoring';
import type { QuestionType } from '../types/game';

describe('mini-game help catalogue', () => {
  it('covers exactly the question types scoring knows about', () => {
    const helpKeys = Object.keys(MINI_GAME_HELP).sort();
    const scoringKeys = Object.keys(BASE_POINTS).sort();
    expect(helpKeys).toEqual(scoringKeys);
  });

  it('keeps every rule and example short and non-empty', () => {
    for (const [type, help] of Object.entries(MINI_GAME_HELP)) {
      expect(help.rule.trim().length, `${type} rule`).toBeGreaterThan(0);
      expect(help.example.trim().length, `${type} example`).toBeGreaterThan(0);
      expect(help.rule.length, `${type} rule too long`).toBeLessThanOrEqual(120);
      expect(help.example.length, `${type} example too long`).toBeLessThanOrEqual(120);
    }
  });
});

describe('first-encounter tracking', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    });
    resetFirstEncounterSession();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    resetFirstEncounterSession();
  });

  const t = 'who_am_i' as QuestionType;

  it('claims the first unseen question and stays render-stable for it', () => {
    expect(isFirstEncounter(t, 'q1')).toBe(true);
    // StrictMode double-render / re-mount with the same question id.
    expect(isFirstEncounter(t, 'q1')).toBe(true);
  });

  it('denies later questions of the same type, even in the same session', () => {
    expect(isFirstEncounter(t, 'q1')).toBe(true);
    expect(isFirstEncounter(t, 'q2')).toBe(false);
  });

  it('persists across sessions (new session, already seen on device)', () => {
    expect(isFirstEncounter(t, 'q1')).toBe(true);
    resetFirstEncounterSession(); // simulate a fresh app load, same device
    expect(isFirstEncounter(t, 'q9')).toBe(false);
  });

  it('tracks types independently', () => {
    expect(isFirstEncounter(t, 'q1')).toBe(true);
    expect(isFirstEncounter('higher_lower' as QuestionType, 'q2')).toBe(true);
  });
});
