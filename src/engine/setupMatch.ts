/**
 * Pure helpers to assemble the data a new match needs: player + opponent
 * identities and the mini-game sequence. Kept React-free for testability.
 */

import {
  MINI_GAME_IDS,
  QUESTIONS_PER_MATCH,
  type Difficulty,
  type MiniGameId,
  type OpponentInfo,
  type PlayerInfo,
} from '../types/match.ts';
import { createRng, seedFromString } from '../lib/rng.ts';
import { generateMatchTeams } from '../ui/theme/teamThemes.ts';
import { buildSequence } from '../minigames/registry.ts';

const CPU_NAMES = ['Jonas', 'Mara', 'Diego', 'Lena', 'Tariq', 'Ines', 'Kai', 'Yuki'];

export interface MatchSetup {
  matchId: string;
  player: PlayerInfo;
  opponent: OpponentInfo;
  sequence: MiniGameId[];
  /** Seed for the transport's CPU RNG (kept distinct from layout seeds). */
  transportSeed: number;
}

export function setupCpuMatch(
  playerName: string,
  difficulty: Difficulty,
  matchId: string,
): MatchSetup {
  const rng = createRng(seedFromString(matchId));
  const cpuName = rng.pick(CPU_NAMES);
  const { home, away } = generateMatchTeams(playerName, cpuName, matchId);

  const player: PlayerInfo = {
    id: 'player',
    displayName: playerName.trim() || 'You',
    side: 'home',
    team: home,
  };
  const opponent: OpponentInfo = {
    id: 'cpu',
    displayName: cpuName,
    difficulty,
    team: away,
  };
  const sequence = buildSequence(MINI_GAME_IDS, QUESTIONS_PER_MATCH, rng);

  return {
    matchId,
    player,
    opponent,
    sequence,
    transportSeed: seedFromString(`${matchId}:cpu`),
  };
}

/** Map a difficulty to a 0..1 skill value for mini-game cpuAnswer fallbacks. */
export function difficultyToSkill(difficulty: Difficulty): number {
  return { casual: 0.45, pro: 0.65, legend: 0.85 }[difficulty];
}
