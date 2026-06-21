/**
 * Awards a tongue-in-cheek "football IQ" title based on match performance.
 * Used on the final results screen and in the shareable summary.
 */

import { accuracyPercent } from './scoring';

export interface PlayerTitleInput {
  correctAnswers: number;
  totalQuestions: number;
  bestStreak: number;
}

export interface PlayerTitle {
  title: string;
  emoji: string;
  blurb: string;
}

export function getPlayerTitle(input: PlayerTitleInput): PlayerTitle {
  const acc = accuracyPercent(input.correctAnswers, input.totalQuestions);

  if (acc >= 90) {
    return {
      title: 'Football Professor',
      emoji: '🎓',
      blurb: 'Tenured in pure ball knowledge.',
    };
  }
  if (input.bestStreak >= 5) {
    return {
      title: 'Career Path Demon',
      emoji: '😈',
      blurb: 'Read transfer sagas like bedtime stories.',
    };
  }
  if (acc >= 70) {
    return {
      title: 'Ball Knowledge Merchant',
      emoji: '🧠',
      blurb: 'Trades in elite football facts.',
    };
  }
  if (acc >= 40) {
    return {
      title: 'Tap-in Expert',
      emoji: '⚽',
      blurb: 'Got the easy ones. Room to grow.',
    };
  }
  return {
    title: 'VAR Victim',
    emoji: '🚩',
    blurb: 'The lines did not fall in your favour.',
  };
}
