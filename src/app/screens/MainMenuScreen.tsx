import { useState } from 'react';
import { useSettings } from '../providers/AppSettingsProvider.tsx';
import { useMatch } from '../providers/MatchProvider.tsx';
import { RulesModal } from './RulesModal.tsx';
import { PitchSvg } from '../../ui/pitch/PitchSvg.tsx';
import {
  onlineAvailable,
  readRuntimeEnv,
} from '../../transport/MatchTransport.ts';
import { soundEngine } from '../../lib/sound.ts';
import type { Difficulty } from '../../types/match.ts';

const DIFFICULTIES: Difficulty[] = ['casual', 'pro', 'legend'];

export function MainMenuScreen() {
  const settings = useSettings();
  const { startCpuMatch } = useMatch();
  const canPlayOnline = onlineAvailable(readRuntimeEnv());
  const [showRules, setShowRules] = useState(false);

  const handlePlay = () => {
    // Unlock audio within the user gesture before the match starts.
    if (settings.soundOn) soundEngine.resume();
    startCpuMatch(settings.playerName, settings.difficulty);
  };

  return (
    <div className="relative mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-8 px-5 py-10">
      <PitchSvg className="pointer-events-none absolute inset-0 -z-10 text-neon opacity-40" />

      <header className="text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          Ball <span className="text-neon">Knowledge</span>
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          A 1v1 football knowledge duel. Turn trivia into a live scoreline.
        </p>
      </header>

      <div className="flex flex-col gap-5 rounded-2xl border border-white/10 bg-pitch-900/60 p-6 backdrop-blur">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-muted">Your name</span>
          <input
            value={settings.playerName}
            onChange={(e) => settings.update({ playerName: e.target.value })}
            maxLength={16}
            placeholder="You"
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-3 font-display text-lg outline-none focus-visible:ring-2 focus-visible:ring-neon"
          />
        </label>

        <div className="flex flex-col gap-1.5 text-sm">
          <span className="text-ink-muted">CPU difficulty</span>
          <div className="grid grid-cols-3 gap-2">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => settings.update({ difficulty: d })}
                className={[
                  'rounded-xl border px-3 py-2.5 text-sm font-semibold capitalize transition',
                  settings.difficulty === d
                    ? 'border-neon bg-neon/10 text-neon'
                    : 'border-white/10 bg-white/5 text-ink hover:border-neon/50',
                ].join(' ')}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm">
          <span className="text-ink-muted">Sound effects</span>
          <button
            type="button"
            role="switch"
            aria-checked={settings.soundOn}
            onClick={() => settings.update({ soundOn: !settings.soundOn })}
            className={[
              'relative h-6 w-11 rounded-full transition',
              settings.soundOn ? 'bg-neon/70' : 'bg-white/15',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all',
                settings.soundOn ? 'left-[22px]' : 'left-0.5',
              ].join(' ')}
            />
          </button>
        </label>

        <button
          type="button"
          onClick={handlePlay}
          className="rounded-xl bg-neon-grad px-4 py-3.5 font-display text-base font-bold text-pitch-950 shadow-neon transition hover:brightness-110 active:scale-[0.99]"
        >
          Play vs CPU
        </button>

        <button
          type="button"
          disabled={!canPlayOnline}
          title={canPlayOnline ? undefined : 'Online needs an API key (coming soon)'}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-semibold text-ink-muted transition enabled:hover:border-neon/50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {canPlayOnline ? 'Play Online' : 'Online — not configured'}
        </button>

        <button
          type="button"
          onClick={() => setShowRules(true)}
          className="text-sm font-medium text-ink-muted underline-offset-4 transition hover:text-neon hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-neon"
        >
          How to play
        </button>
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}
