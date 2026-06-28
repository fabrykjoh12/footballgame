/**
 * "Older or Younger?" — a Higher/Lower-style survival mode over player birth
 * years. One player is shown with their birth year; guess whether the next is
 * older (born earlier) or younger (born later). Correct → carry on, streak up;
 * wrong → game over. Pure selection + judging; best streak stored locally.
 */

import { PLAYERS } from '../data/players';
import type { Player } from './playerDb';
import type { Rng } from './seededRandom';

export type Guess = 'older' | 'younger';

/** Players eligible for the mode — those with a recorded birth year. */
export function olderYoungerPool(players: Player[] = PLAYERS): Player[] {
  return players.filter((p) => p.birthYear !== undefined);
}

/**
 * Judge a guess. `next` is "older" when born in an earlier year. A tie (same
 * birth year) is a free pass — either guess counts.
 */
export function judgeGuess(currentYear: number, nextYear: number, guess: Guess): boolean {
  if (nextYear === currentYear) return true;
  const nextIsOlder = nextYear < currentYear;
  return guess === (nextIsOlder ? 'older' : 'younger');
}

/** Pick a random player from the pool, excluding the given ids. */
export function pickPlayer(pool: Player[], rng: Rng, excludeIds: string[] = []): Player | null {
  const choices = pool.filter((p) => !excludeIds.includes(p.id));
  if (choices.length === 0) return null;
  return choices[Math.floor(rng() * choices.length)];
}

export interface OYRound {
  current: Player;
  next: Player;
}

/** Start a fresh round with two distinct players. */
export function startOYRound(pool: Player[], rng: Rng): OYRound | null {
  const current = pickPlayer(pool, rng);
  if (!current) return null;
  const next = pickPlayer(pool, rng, [current.id]);
  if (!next) return null;
  return { current, next };
}

/* ------------------------------------------------------------------ */
/* Best-streak persistence                                             */
/* ------------------------------------------------------------------ */

const KEY = 'bk_older_younger_v1';

export interface OYProgress {
  bestStreak: number;
  played: number;
}

const EMPTY: OYProgress = { bestStreak: 0, played: 0 };

/** Pure: fold a finished run's streak into prior progress. */
export function foldOYResult(prev: OYProgress, streak: number): OYProgress {
  return { bestStreak: Math.max(prev.bestStreak, streak), played: prev.played + 1 };
}

export function getOYProgress(): OYProgress {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...EMPTY, ...(JSON.parse(raw) as OYProgress) } : { ...EMPTY };
  } catch {
    return { ...EMPTY };
  }
}

/** Record a finished run; returns the new progress and whether it's a best. */
export function recordOYResult(streak: number): { progress: OYProgress; isBest: boolean } {
  const prev = getOYProgress();
  const isBest = streak > prev.bestStreak;
  const next = foldOYResult(prev, streak);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return { progress: next, isBest };
}
