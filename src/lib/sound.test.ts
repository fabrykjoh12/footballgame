import { describe, it, expect, vi } from 'vitest';
import { SoundEngine } from './sound.ts';

describe('SoundEngine', () => {
  it('reports unavailable and stays silent in jsdom (no AudioContext)', () => {
    const engine = new SoundEngine(true);
    expect(engine.isAvailable).toBe(false);
    // None of these should throw even though there is no audio backend.
    expect(() => {
      engine.kickoff();
      engine.goal();
      engine.correct();
      engine.wrong();
      engine.whistle();
      engine.halfTime();
      engine.resume();
    }).not.toThrow();
  });

  it('does nothing when disabled even if audio is available', () => {
    const create = vi.fn();
    // Simulate an environment that *has* AudioContext.
    const ctor = vi.fn(() => ({
      currentTime: 0,
      state: 'running',
      createOscillator: create,
      createGain: create,
      resume: vi.fn(),
    }));
    vi.stubGlobal('window', { AudioContext: ctor });

    const engine = new SoundEngine(false);
    expect(engine.isAvailable).toBe(true);
    engine.goal();
    expect(create).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
