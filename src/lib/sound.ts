/**
 * Synthesized sound cues via the Web Audio API.
 *
 * Every sound is generated at runtime from oscillators — there are NO audio
 * files or external media, consistent with the project's zero-asset policy.
 * The engine degrades to a silent no-op when Web Audio is unavailable (SSR,
 * tests) or when muted, and lazily creates its AudioContext on first use so it
 * cooperates with browser autoplay policies (first call should follow a gesture).
 */

type Ctor = typeof AudioContext;

function getAudioCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    AudioContext?: Ctor;
    webkitAudioContext?: Ctor;
  };
  return w.AudioContext ?? w.webkitAudioContext ?? null;
}

export interface Tone {
  freq: number;
  /** seconds */
  duration: number;
  /** start offset in seconds from now */
  at?: number;
  type?: OscillatorType;
  /** peak gain 0..1 */
  gain?: number;
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private enabled: boolean;
  private readonly available: boolean;

  constructor(enabled = true) {
    this.enabled = enabled;
    this.available = getAudioCtor() !== null;
  }

  get isAvailable(): boolean {
    return this.available;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /** Must be called from a user gesture to satisfy autoplay policies. */
  resume(): void {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (ctx && ctx.state === 'suspended') void ctx.resume();
  }

  private ensureCtx(): AudioContext | null {
    if (!this.available) return null;
    if (!this.ctx) {
      const Ctor = getAudioCtor();
      if (!Ctor) return null;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  private play(tones: Tone[]): void {
    if (!this.enabled) return;
    const ctx = this.ensureCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    for (const t of tones) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = now + (t.at ?? 0);
      const end = start + t.duration;
      const peak = t.gain ?? 0.18;
      osc.type = t.type ?? 'sine';
      osc.frequency.setValueAtTime(t.freq, start);
      // Simple AD envelope to avoid clicks.
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(end + 0.02);
    }
  }

  // --- named cues ---------------------------------------------------------

  kickoff(): void {
    this.play([{ freq: 660, duration: 0.18, type: 'square', gain: 0.12 }]);
  }

  correct(): void {
    this.play([
      { freq: 523, duration: 0.1, type: 'triangle' },
      { freq: 784, duration: 0.12, at: 0.09, type: 'triangle' },
    ]);
  }

  wrong(): void {
    this.play([
      { freq: 220, duration: 0.16, type: 'sawtooth', gain: 0.12 },
      { freq: 160, duration: 0.2, at: 0.08, type: 'sawtooth', gain: 0.12 },
    ]);
  }

  goal(): void {
    // Rising fanfare.
    this.play([
      { freq: 523, duration: 0.12, type: 'square', gain: 0.14 },
      { freq: 659, duration: 0.12, at: 0.1, type: 'square', gain: 0.14 },
      { freq: 784, duration: 0.16, at: 0.2, type: 'square', gain: 0.16 },
      { freq: 1046, duration: 0.24, at: 0.32, type: 'square', gain: 0.16 },
    ]);
  }

  whistle(): void {
    this.play([
      { freq: 1760, duration: 0.14, type: 'sine', gain: 0.1 },
      { freq: 1760, duration: 0.14, at: 0.18, type: 'sine', gain: 0.1 },
      { freq: 1976, duration: 0.3, at: 0.36, type: 'sine', gain: 0.1 },
    ]);
  }

  halfTime(): void {
    this.play([
      { freq: 1760, duration: 0.16, type: 'sine', gain: 0.1 },
      { freq: 1760, duration: 0.26, at: 0.2, type: 'sine', gain: 0.1 },
    ]);
  }
}

/** Shared singleton — created once per app session. */
export const soundEngine = new SoundEngine();
