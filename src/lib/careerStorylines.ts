/**
 * Ball Knowledge — Career season storylines (pure, derived).
 *
 * The season already has a rival, a board and objectives; what it lacked was a
 * *narrative* — the little headlines that make a fixture feel like it matters
 * ("Derby week", "Final-day promotion race", "The board are watching"). This
 * derives those beats deterministically from the current `CareerState` — no new
 * storage, no RNG — so the same situation always tells the same story and it's
 * fully unit-testable. The UI just renders the top beats.
 */

import {
  ROUNDS_PER_SEASON,
  PROMOTION_SPOTS,
  RELEGATION_SPOTS,
  TEAMS_PER_DIVISION,
  TOP_TIER,
  BOTTOM_TIER,
  YOU_ID,
  currentFixture,
  yourPosition,
  divisionByTier,
  type CareerState,
} from './career';
import { seasonRival, boardConfidence } from './careerProgression';
import { teamName } from './teamName';

export type StoryTone = 'derby' | 'promotion' | 'relegation' | 'title' | 'pressure' | 'form' | 'neutral';

export interface Storyline {
  id: string;
  tone: StoryTone;
  headline: string;
  detail: string;
  /** Higher shows first. */
  priority: number;
}

/** Your result in each round played so far (most recent last). */
function yourResults(state: CareerState): Array<'win' | 'draw' | 'loss'> {
  const out: Array<'win' | 'draw' | 'loss'> = [];
  for (const round of state.results) {
    for (const m of round) {
      if (m.homeId !== YOU_ID && m.awayId !== YOU_ID) continue;
      const youHome = m.homeId === YOU_ID;
      const gf = youHome ? m.homeGoals : m.awayGoals;
      const ga = youHome ? m.awayGoals : m.homeGoals;
      out.push(gf > ga ? 'win' : gf < ga ? 'loss' : 'draw');
    }
  }
  return out;
}

/** Length of the current unbeaten (no-loss) or winless (no-win) streak. */
function tailStreak(results: Array<'win' | 'draw' | 'loss'>, of: 'unbeaten' | 'winless'): number {
  let n = 0;
  for (let i = results.length - 1; i >= 0; i--) {
    const r = results[i];
    const keep = of === 'unbeaten' ? r !== 'loss' : r !== 'win';
    if (keep) n++;
    else break;
  }
  return n;
}

/**
 * The active storylines for the current season state, most compelling first.
 * Returns an empty array when nothing noteworthy is happening.
 */
export function seasonStorylines(state: CareerState): Storyline[] {
  const stories: Storyline[] = [];
  if (state.status !== 'in_season') return stories;

  const round = state.round; // 0-based; fixtures remaining = ROUNDS_PER_SEASON - round
  const position = yourPosition(state);
  const fixture = currentFixture(state);
  const rival = seasonRival(state);
  const division = divisionByTier(state.tier);
  const isLastFixture = round === ROUNDS_PER_SEASON - 1;
  const isRunIn = round >= ROUNDS_PER_SEASON - 2;
  const inPromotionSpots = state.tier > TOP_TIER && position > 0 && position <= PROMOTION_SPOTS;
  const inRelegationSpots =
    state.tier < BOTTOM_TIER && position > TEAMS_PER_DIVISION - RELEGATION_SPOTS;

  // New campaign.
  if (round === 0 && state.results.every((r) => r.length === 0)) {
    stories.push({
      id: 'new-season',
      tone: 'neutral',
      headline: `${division.name} — a new campaign`,
      detail:
        state.tier > TOP_TIER
          ? 'Five fixtures to earn promotion. Start strong.'
          : 'Defend your place at the top of the pyramid.',
      priority: 20,
    });
  }

  // Derby: your next fixture is the designated season rival.
  if (fixture && rival && fixture.opponent.id === rival.id) {
    stories.push({
      id: 'derby',
      tone: 'derby',
      headline: 'Derby week',
      detail: `Next up: ${teamName(rival.name)}, your rival for the season. Bragging rights on the line.`,
      priority: 70,
    });
  }

  // Final day framing.
  if (isLastFixture) {
    if (inPromotionSpots) {
      stories.push({
        id: 'final-day-promo',
        tone: 'promotion',
        headline: 'Final day — promotion on the line',
        detail: `Sitting ${ordinal(position)}. Hold your nerve and it’s up.`,
        priority: 95,
      });
    } else if (inRelegationSpots) {
      stories.push({
        id: 'final-day-releg',
        tone: 'relegation',
        headline: 'Final day — survival on the line',
        detail: `${ordinal(position)} and in the drop zone. Win, or go down.`,
        priority: 96,
      });
    } else {
      stories.push({
        id: 'final-day',
        tone: 'neutral',
        headline: 'Final day',
        detail: 'The last fixture of the season. Finish it in style.',
        priority: 60,
      });
    }
  } else if (isRunIn && inPromotionSpots) {
    stories.push({
      id: 'promotion-run-in',
      tone: 'promotion',
      headline: 'Promotion run-in',
      detail: `${ordinal(position)} with the finish line in sight. Keep winning.`,
      priority: 75,
    });
  } else if (isRunIn && inRelegationSpots) {
    stories.push({
      id: 'relegation-scrap',
      tone: 'relegation',
      headline: 'Relegation scrap',
      detail: `${ordinal(position)} and scrapping for points. Every game is a cup final.`,
      priority: 78,
    });
  }

  // Top-flight title race.
  if (state.tier === TOP_TIER && position > 0 && position <= 2 && round >= 2) {
    stories.push({
      id: 'title-race',
      tone: 'title',
      headline: 'Title race',
      detail: `${ordinal(position)} in the top flight. The championship is yours to take.`,
      priority: 80,
    });
  }

  // Board pressure.
  const confidence = boardConfidence(state);
  if (confidence.value <= 35) {
    stories.push({
      id: 'board-pressure',
      tone: 'pressure',
      headline: 'The board are watching',
      detail: `Confidence is low (${confidence.value}%). A result would ease the pressure.`,
      priority: 85,
    });
  }

  // Form streaks.
  const results = yourResults(state);
  const unbeaten = tailStreak(results, 'unbeaten');
  const winless = tailStreak(results, 'winless');
  if (unbeaten >= 3) {
    stories.push({
      id: 'unbeaten',
      tone: 'form',
      headline: `Unbeaten in ${unbeaten}`,
      detail: 'The form guide is glowing — ride the momentum.',
      priority: 50,
    });
  } else if (winless >= 3) {
    stories.push({
      id: 'winless',
      tone: 'form',
      headline: `Winless in ${winless}`,
      detail: 'A run to forget. Time to arrest the slide.',
      priority: 55,
    });
  }

  return stories.sort((a, b) => b.priority - a.priority);
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}
