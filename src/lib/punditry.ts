/**
 * Post-match "pundit verdict" — a single broadcast-style line summing up the
 * result, shown on the full-time screen. Pure + deterministic by seed so it's
 * unit-testable and varies match to match. Flavour only; license-free.
 */

export interface PunditInput {
  /** Winner's club name, or null for a draw. */
  winnerName: string | null;
  /** Win came down to the points decider (goals level). */
  onPoints: boolean;
  /** Winner's goal margin (0 for a draw). */
  goalDiff: number;
  /** Winner came from 2+ goals down. */
  comeback: boolean;
  /** Decided by a late (80'+) winner. */
  lateWinner: boolean;
  /** Won on Nightmare difficulty. */
  nightmare: boolean;
}

function pick(lines: string[], seed: number): string {
  const i = ((Math.trunc(seed) % lines.length) + lines.length) % lines.length;
  return lines[i];
}

const fill = (tpl: string, w: string) => tpl.replace(/\{w\}/g, w);

const DRAW = [
  'Honours even — neither side deserved to lose that one.',
  'A proper arm-wrestle. You couldn’t split them.',
  'Nothing between them, and the scoreline says it all.',
];

const COMEBACK = [
  'Character to match the knowledge — {w} dug themselves out of a hole.',
  'Never write {w} off. What a turnaround.',
  'From the brink, {w} found another gear. Remarkable.',
];

const LATE = [
  '{w} held their nerve when it mattered most. Scenes.',
  'Cometh the hour — {w} struck at the death.',
  'Drama to the final whistle, and {w} had the last word.',
];

const NIGHTMARE = [
  'On the hardest setting, {w} didn’t flinch. Ruthless.',
  'That was Nightmare mode — and {w} made it look routine.',
  'No margin for error, and {w} delivered anyway.',
];

const BIG = [
  'Statement win from {w}. The knowledge was ruthless.',
  '{w} were in a different class today.',
  'A statement performance — {w} ran riot.',
];

const POINTS = [
  'Not pretty, but {w} found a way. A win’s a win.',
  '{w} grind it out on the finer margins.',
  'Down to the wire, and {w} edge it on the details.',
];

const NARROW = [
  'Fine margins, but {w} take a tight one.',
  'Settled by a single goal — {w} just about deserve it.',
  '{w} do enough in a tense one.',
];

const DEFAULT_WIN = ['Composed from {w}. Job done.', 'Professional from {w} — exactly as planned.'];

/** A pundit's one-line verdict on the match. */
export function punditVerdict(input: PunditInput, seed = 0): string {
  if (!input.winnerName) return pick(DRAW, seed);
  const w = input.winnerName;
  if (input.comeback) return fill(pick(COMEBACK, seed), w);
  if (input.lateWinner) return fill(pick(LATE, seed), w);
  if (input.nightmare) return fill(pick(NIGHTMARE, seed), w);
  if (input.goalDiff >= 3) return fill(pick(BIG, seed), w);
  if (input.onPoints) return fill(pick(POINTS, seed), w);
  if (input.goalDiff === 1) return fill(pick(NARROW, seed), w);
  return fill(pick(DEFAULT_WIN, seed), w);
}
