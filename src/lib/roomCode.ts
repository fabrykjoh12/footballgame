/**
 * Room code helpers. Codes look like "BK7Q2": a "BK" (Ball Knowledge)
 * prefix followed by short, human-friendly characters. We omit ambiguous
 * characters (0/O, 1/I/L) so codes are easy to read aloud and type.
 */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PREFIX = 'BK';
// 5 body chars over a 30-char alphabet ≈ 24M combinations, so random
// collisions between concurrent rooms are vanishingly unlikely (the old
// 3-char codes gave only ~27k). Matches the league/friend code lengths.
const CODE_BODY_LENGTH = 5;

/** A uniform random index into the alphabet, crypto-backed when available. */
function randomIndex(): number {
  const n = ALPHABET.length;
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    // Rejection-sample to avoid modulo bias.
    const limit = Math.floor(0xffffffff / n) * n;
    const buf = new Uint32Array(1);
    let v: number;
    do {
      crypto.getRandomValues(buf);
      v = buf[0];
    } while (v >= limit);
    return v % n;
  }
  return Math.floor(Math.random() * n);
}

export function generateRoomCode(): string {
  let body = '';
  for (let i = 0; i < CODE_BODY_LENGTH; i++) {
    body += ALPHABET[randomIndex()];
  }
  return CODE_PREFIX + body;
}

/** Normalise user input: trim, uppercase, strip spaces/dashes. */
export function normalizeRoomCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s-]+/g, '');
}

/** Loose validity check for a typed room code. */
export function isValidRoomCode(input: string): boolean {
  const code = normalizeRoomCode(input);
  return /^BK[A-Z0-9]{3,}$/.test(code);
}
