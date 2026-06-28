/**
 * Mystery Player Duel — secret-pick commit (pure).
 *
 * A lightweight commit so a locked pick can't be changed and can be verified at
 * reveal (useful for fairness now and online play later). Not cryptographically
 * strong — just a stable, non-obvious fingerprint of (playerId + salt).
 */

import { hashString } from '../seededRandom';

export function commitPick(playerId: string, salt: string): string {
  return hashString(`mystery:${playerId}:${salt}`).toString(16);
}

export function verifyCommit(playerId: string, salt: string, commit: string): boolean {
  return commitPick(playerId, salt) === commit;
}
