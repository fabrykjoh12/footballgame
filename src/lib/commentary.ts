/**
 * Live match commentary — pure text generation for the in-game ticker.
 *
 * The component feeds structured "what just happened" facts; these functions
 * turn them into a varied, football-flavoured line. Deterministic given a
 * `seed` (the question index), so it's easy to unit-test and never repeats the
 * same template twice in a row by accident.
 */

/** Per-player facts for one revealed question. */
export interface Side {
  name: string;
  isCorrect: boolean;
  scoredGoal: boolean;
  /** Correct AND quick (a counterattack). */
  fast: boolean;
  /** Hit a streak milestone (3, 6, 9…). */
  hatTrick: boolean;
}

function pick(lines: string[], seed: number): string {
  const i = ((seed % lines.length) + lines.length) % lines.length;
  return lines[i];
}

const fill = (tpl: string, team?: string, score?: string) =>
  tpl.replace('{t}', team ?? '').replace('{s}', score ?? '');

const KICKOFF = [
  "And we're underway — game on!",
  'The referee blows, and we have a match!',
  'Kick-off! Let battle commence.',
  'Here we go — both sides feeling each other out.',
];

const BOTH_GOALS = [
  'End to end! Goals at both ends — {s}.',
  'Breathless stuff, both find the net — {s}!',
];

const GOAL = [
  'GOAL! {t} find the net — it’s {s}!',
  '{t} score! The net ripples — {s}.',
  'What a finish from {t} — {s}!',
  'It’s in! {t} make it count — {s}.',
];

const HATTRICK = [
  'Hat-trick! {t} are absolutely rampant.',
  'Three on the bounce for {t} — unplayable right now.',
];

const COUNTER = [
  'Lightning break from {t} — answered in a flash!',
  '{t} pounce on it in an instant!',
  'Blink and you missed it — {t} are rapid.',
];

const BOTH_CORRECT = [
  'Toe to toe — both sides answer in kind.',
  'Neither blinks; this one’s going the distance.',
  'Trading blows in midfield, nothing between them.',
];

const BOTH_WRONG = [
  'Sloppy from both — the chance goes begging.',
  'Wayward! Neither can find the target.',
  'A scrappy passage, both squandering it.',
];

const ONE_CORRECT = [
  '{t} grow into the half.',
  'A neat move from {t} keeps them ticking.',
  '{t} edge this exchange.',
];

export function kickoffLine(seed = 0): string {
  return pick(KICKOFF, seed);
}

export function stoppageLine(round: number, seed = 0): string {
  if (round > 1) {
    return pick(
      [
        `Still nothing between them — sudden-death round ${round}!`,
        `Nerves of steel required — round ${round} of sudden death.`,
      ],
      seed,
    );
  }
  return pick(
    [
      'Level at full time — it’s STOPPAGE TIME. Sudden death!',
      'We cannot separate them — to sudden death we go!',
    ],
    seed,
  );
}

export function halftimeLine(scoreline: string, seed = 0): string {
  return pick(
    [
      'Half-time. It’s {s} — all to play for.',
      'The whistle goes for the break: {s}.',
      'Forty-five in the books — {s} at the interval.',
    ],
    seed,
  ).replace('{s}', scoreline);
}

export function fulltimeLine(
  winnerName: string | null,
  onPoints: boolean,
  seed = 0,
): string {
  if (!winnerName) return pick(['Full time — honours even!', 'The whistle blows: a draw.'], seed);
  const tail = onPoints ? ' on points' : '';
  return pick(
    [`Full time! ${winnerName} take it${tail}.`, `That’s the lot — ${winnerName} win${tail}!`],
    seed,
  );
}

/** The headline line for one revealed question (most dramatic moment wins). */
export function questionCommentary(
  home: Side,
  away: Side,
  scoreline: string,
  seed: number,
): string {
  const scorers = [home, away].filter((s) => s.scoredGoal);
  if (scorers.length === 2) return fill(pick(BOTH_GOALS, seed), undefined, scoreline);
  if (scorers.length === 1) return fill(pick(GOAL, seed), scorers[0].name, scoreline);

  const hat = [home, away].find((s) => s.hatTrick);
  if (hat) return fill(pick(HATTRICK, seed), hat.name);

  const fast = [home, away].find((s) => s.fast);
  if (fast) return fill(pick(COUNTER, seed), fast.name);

  const correct = [home, away].filter((s) => s.isCorrect);
  if (correct.length === 2) return pick(BOTH_CORRECT, seed);
  if (correct.length === 0) return pick(BOTH_WRONG, seed);
  return fill(pick(ONE_CORRECT, seed), correct[0].name);
}
