/**
 * Tiny Web Audio sound engine — all effects are synthesized at runtime, so
 * there are no audio files to ship. Honors the existing `bk_sound` toggle.
 *
 * Browsers block audio until a user gesture, so `unlockAudio()` is called once
 * on the first interaction (see main.tsx) to create/resume the context.
 */

export type SoundName =
  | 'click'
  | 'correct'
  | 'wrong'
  | 'whistle'
  | 'goal'
  | 'win';

const SOUND_KEY = 'bk_sound';

let ctx: AudioContext | null = null;
let enabled = readInitial();

function readInitial(): boolean {
  try {
    const v = localStorage.getItem(SOUND_KEY);
    return v == null ? true : Boolean(JSON.parse(v));
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean): void {
  enabled = on;
}

export function isSoundEnabled(): boolean {
  return enabled;
}

/** Create/resume the AudioContext. Safe to call repeatedly. */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    /* audio unavailable */
  }
}

interface ToneOpts {
  type?: OscillatorType;
  gain?: number;
  sweepTo?: number;
}

function tone(freq: number, start: number, dur: number, opts: ToneOpts = {}): void {
  if (!ctx) return;
  const { type = 'sine', gain = 0.18, sweepTo } = opts;
  const t0 = ctx.currentTime + start;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, t0 + dur);
  // Click-free envelope.
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.03);
}

/** Play a named effect (no-op when muted or audio is unavailable). */
export function play(name: SoundName): void {
  if (!enabled) return;
  unlockAudio();
  if (!ctx) return;

  switch (name) {
    case 'click':
      tone(420, 0, 0.07, { type: 'triangle', gain: 0.1 });
      break;
    case 'correct':
      tone(660, 0, 0.12, { type: 'triangle', gain: 0.16 });
      tone(988, 0.1, 0.16, { type: 'triangle', gain: 0.16 });
      break;
    case 'wrong':
      tone(196, 0, 0.3, { type: 'sawtooth', gain: 0.14, sweepTo: 120 });
      break;
    case 'whistle':
      // Two short referee chirps.
      tone(2300, 0, 0.16, { type: 'sine', gain: 0.1, sweepTo: 2600 });
      tone(2400, 0.18, 0.12, { type: 'sine', gain: 0.09 });
      break;
    case 'goal':
      // Rising arpeggio "roar".
      [523, 659, 784, 1046].forEach((f, i) =>
        tone(f, i * 0.07, 0.4, { type: 'triangle', gain: 0.17 }),
      );
      break;
    case 'win':
      [523, 659, 784, 1046, 1318].forEach((f, i) =>
        tone(f, i * 0.12, 0.5, { type: 'triangle', gain: 0.18 }),
      );
      break;
  }
}
