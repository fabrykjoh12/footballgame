import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ONBOARDING_STEPS, setOnboarded } from '../../lib/onboarding';
import { Button } from '../ui/Button';

/**
 * First-run intro carousel. Renders via a body portal; teaches the loop in
 * three taps and hands off to "Create your club" or "Play vs CPU".
 */
export function OnboardingOverlay({
  onCreateClub,
  onPlay,
  onClose,
}: {
  onCreateClub: () => void;
  onPlay: () => void;
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const last = step === ONBOARDING_STEPS.length - 1;
  const s = ONBOARDING_STEPS[step];

  const finish = (then?: () => void) => {
    setOnboarded();
    onClose();
    then?.();
  };

  const body = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to Ball Knowledge"
      className="fixed inset-0 z-[110] flex items-center justify-center bg-ink-900/90 px-5 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-sm rounded-2xl border border-white/12 bg-ink-800 p-6 text-center shadow-elev-2 animate-scale-in">
        <button
          type="button"
          onClick={() => finish()}
          className="ml-auto block text-xs text-white/40 hover:text-white"
        >
          Skip
        </button>

        <div className="mt-1 text-5xl" aria-hidden>
          {s.emoji}
        </div>
        <h2 className="mt-3 font-display text-xl font-bold text-gradient-pitch">{s.title}</h2>
        <p className="mx-auto mt-2 max-w-xs text-balance text-sm text-white/60">{s.body}</p>

        {/* Progress dots */}
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
          {ONBOARDING_STEPS.map((_, i) => (
            <span
              key={i}
              className={[
                'h-1.5 rounded-full transition-all',
                i === step ? 'w-5 bg-pitch' : 'w-1.5 bg-white/20',
              ].join(' ')}
            />
          ))}
        </div>

        <div className="mt-5">
          {last ? (
            <div className="flex flex-col gap-2">
              <Button fullWidth onClick={() => finish(onCreateClub)}>
                Create your club
              </Button>
              <Button variant="secondary" fullWidth onClick={() => finish(onPlay)}>
                Play vs CPU now
              </Button>
            </div>
          ) : (
            <Button fullWidth onClick={() => setStep((n) => n + 1)}>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}
