/**
 * Room code helpers. Codes look like "BK7Q2": a "BK" (Ball Knowledge)
 * prefix followed by short, human-friendly characters. We omit ambiguous
 * characters (0/O, 1/I/L) so codes are easy to read aloud and type.
 */

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_PREFIX = 'BK';
const CODE_BODY_LENGTH = 3;

export function generateRoomCode(): string {
  let body = '';
  for (let i = 0; i < CODE_BODY_LENGTH; i++) {
    body += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
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
