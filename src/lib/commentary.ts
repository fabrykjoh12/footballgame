/**
 * Live match commentary — pure text generation for the in-game ticker.
 *
 * The component feeds structured "what just happened" facts; these functions
 * turn them into a varied, football-flavoured line. Deterministic given a
 * `seed` (the question index), so it's easy to unit-test and never repeats the
 * same template twice in a row by accident.
 *
 * The line pools are intentionally generous so a 10-question match (plus
 * sudden death) rarely reuses a line. Context (the match minute, the mode, a
 * comeback or late winner) unlocks dedicated, more dramatic pools.
 */

import type { MatchMode } from '../types/game';

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

/** Optional situational context that unlocks more dramatic commentary. */
export interface CommentaryContext {
  /** Match minute the moment landed on (0–90+). */
  minute?: number;
  /** Active difficulty mode (Nightmare gets its own flavour). */
  mode?: MatchMode;
  /** A goal that drew the scores level. */
  equalizer?: boolean;
  /** A goal late on (>= 80') that put a side in front. */
  lateWinner?: boolean;
}

/** Minute from which moments read as late-game drama. */
export const LATE_MINUTE = 80;

function pick(lines: string[], seed: number): string {
  const i = ((Math.trunc(seed) % lines.length) + lines.length) % lines.length;
  return lines[i];
}

const fill = (tpl: string, team?: string, score?: string) =>
  tpl.replace('{t}', team ?? '').replace('{s}', score ?? '');

const KICKOFF = [
  "And we're underway — game on!",
  'The referee blows, and we have a match!',
  'Kick-off! Let battle commence.',
  'Here we go — both sides feeling each other out.',
  'The whistle sounds and we are live.',
  'Game on — knowledge against knowledge.',
];

const NIGHTMARE_KICKOFF = [
  'Nightmare mode. No margin for error tonight.',
  'This is the hardest test there is — kick-off.',
  'Only the brave survive this one. Here we go.',
];

const BOTH_GOALS = [
  'End to end! Goals at both ends — {s}.',
  'Breathless stuff, both find the net — {s}!',
  'Trading goals now — it’s {s} and wide open.',
];

const GOAL = [
  'GOAL! {t} find the net — it’s {s}!',
  '{t} score! The net ripples — {s}.',
  'What a finish from {t} — {s}!',
  'It’s in! {t} make it count — {s}.',
  'Clinical from {t} — {s}.',
  '{t} punish the hesitation — {s}!',
];

const LATE_GOAL = [
  'Late, late goal from {t} — {s}! Drama at the death.',
  '{t} strike when it matters most — {s}!',
  'They’ve left it late — {t} score, {s}!',
];

const EQUALIZER = [
  'EQUALISER! {t} drag it back level — {s}.',
  'Game on! {t} restore parity — {s}.',
  '{t} answer straight back — we’re level at {s}!',
];

const LATE_WINNER = [
  'LATE WINNER! {t} snatch it — {s}!',
  'Heartbreak and ecstasy — {t} go ahead, {s}!',
  '{t} find a winner at the death — {s}! Sensational.',
];

const HATTRICK = [
  'Hat-trick! {t} are absolutely rampant.',
  'Three on the bounce for {t} — unplayable right now.',
  '{t} are on fire — another, and another, and another.',
];

const COUNTER = [
  'Lightning break from {t} — answered in a flash!',
  '{t} pounce on it in an instant!',
  'Blink and you missed it — {t} are rapid.',
  'Off like a shot — {t} break at pace.',
];

const BOTH_CORRECT = [
  'Toe to toe — both sides answer in kind.',
  'Neither blinks; this one’s going the distance.',
  'Trading blows in midfield, nothing between them.',
  'A heavyweight exchange — both stand firm.',
];

const TENSE_LATE = [
  'The tension is unbearable — neither side gives an inch.',
  'Every touch matters now, and both hold their nerve.',
  'Squeaky-bum time, and still nothing between them.',
];

const BOTH_WRONG = [
  'Sloppy from both — the chance goes begging.',
  'Wayward! Neither can find the target.',
  'A scrappy passage, both squandering it.',
  'Both blink at once — the moment passes.',
];

const ONE_CORRECT = [
  '{t} grow into the half.',
  'A neat move from {t} keeps them ticking.',
  '{t} edge this exchange.',
  '{t} look the sharper side here.',
];

export function kickoffLine(seed = 0, mode?: MatchMode): string {
  if (mode === 'nightmare') return pick(NIGHTMARE_KICKOFF, seed);
  return pick(KICKOFF, seed);
}

export function stoppageLine(round: number, seed = 0): string {
  if (round > 1) {
    return pick(
      [
        `Still nothing between them — sudden-death round ${round}!`,
        `Nerves of steel required — round ${round} of sudden death.`,
        `Round ${round} of sudden death — who dares win it?`,
      ],
      seed,
    );
  }
  return pick(
    [
      'Level at full time — it’s STOPPAGE TIME. Sudden death!',
      'We cannot separate them — to sudden death we go!',
      'One answer could settle it now — sudden death!',
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
      'Time for a breather — {s} at the half.',
    ],
    seed,
  ).replace('{s}', scoreline);
}

export function fulltimeLine(
  winnerName: string | null,
  onPoints: boolean,
  seed = 0,
): string {
  if (!winnerName)
    return pick(
      ['Full time — honours even!', 'The whistle blows: a draw.', 'Nothing to separate them at the last.'],
      seed,
    );
  const tail = onPoints ? ' on points' : '';
  return pick(
    [
      `Full time! ${winnerName} take it${tail}.`,
      `That’s the lot — ${winnerName} win${tail}!`,
      `The whistle goes — ${winnerName} prevail${tail}.`,
    ],
    seed,
  );
}

/** The headline line for one revealed question (most dramatic moment wins). */
export function questionCommentary(
  home: Side,
  away: Side,
  scoreline: string,
  seed: number,
  ctx: CommentaryContext = {},
): string {
  const scorers = [home, away].filter((s) => s.scoredGoal);
  const late = (ctx.minute ?? 0) >= LATE_MINUTE;

  // Cross-player dramatic events take top billing.
  if (scorers.length === 1) {
    const scorer = scorers[0];
    if (ctx.lateWinner) return fill(pick(LATE_WINNER, seed), scorer.name, scoreline);
    if (ctx.equalizer) return fill(pick(EQUALIZER, seed), scorer.name, scoreline);
    if (late) return fill(pick(LATE_GOAL, seed), scorer.name, scoreline);
    return fill(pick(GOAL, seed), scorer.name, scoreline);
  }
  if (scorers.length === 2) return fill(pick(BOTH_GOALS, seed), undefined, scoreline);

  const hat = [home, away].find((s) => s.hatTrick);
  if (hat) return fill(pick(HATTRICK, seed), hat.name);

  const fast = [home, away].find((s) => s.fast);
  if (fast) return fill(pick(COUNTER, seed), fast.name);

  const correct = [home, away].filter((s) => s.isCorrect);
  if (correct.length === 2) return pick(late ? TENSE_LATE : BOTH_CORRECT, seed);
  if (correct.length === 0) return pick(BOTH_WRONG, seed);
  return fill(pick(ONE_CORRECT, seed), correct[0].name);
}
