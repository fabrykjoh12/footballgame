import { describe, it, expect } from 'vitest';
import { generateRoomCode, normalizeRoomCode, isValidRoomCode } from './roomCode';

describe('roomCode', () => {
  it('generates BK-prefixed codes of the expected length', () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRoomCode();
      expect(code).toMatch(/^BK[A-Z0-9]{5}$/);
      expect(isValidRoomCode(code)).toBe(true);
    }
  });

  it('omits ambiguous characters (0/O, 1/I/L)', () => {
    const body = generateRoomCode().slice(2);
    expect(body).not.toMatch(/[01OIL]/);
  });

  it('has a large enough space to rarely collide', () => {
    const codes = new Set<string>();
    for (let i = 0; i < 2000; i++) codes.add(generateRoomCode());
    // 24M combinations → 2k samples should essentially never collide.
    expect(codes.size).toBeGreaterThan(1995);
  });

  it('normalises user input', () => {
    expect(normalizeRoomCode('  bk-7q2  ')).toBe('BK7Q2');
    expect(normalizeRoomCode('bk 2 3 4')).toBe('BK234');
  });
});
