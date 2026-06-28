/**
 * First-run onboarding — a tiny "teach by pointing at the action" intro shown
 * once to brand-new players. The step content is pure data (testable); a thin
 * localStorage flag remembers that it's been seen (and can be reset from
 * Settings to replay it).
 */

const KEY = 'bk_onboarded_v1';

export interface OnboardingStep {
  emoji: string;
  title: string;
  body: string;
}

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    emoji: '⚽',
    title: 'Knowledge is your striker',
    body: 'Ball Knowledge is a 1v1 football trivia duel. Every question is an attack — answer well and you create chances.',
  },
  {
    emoji: '🥅',
    title: 'Turn answers into goals',
    body: 'Fast, correct answers become Big Chances and goals; your points convert into a real football scoreline like 3–2.',
  },
  {
    emoji: '🏆',
    title: 'Build your club & climb',
    body: 'Create your own club, chase the Daily Rival, and rise from League Two to the top flight in Career Mode.',
  },
];

export function hasOnboarded(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true; // storage blocked → don't nag
  }
}

export function setOnboarded(): void {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* storage unavailable */
  }
}

export function resetOnboarding(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable */
  }
}
