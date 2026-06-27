import { useEffect, useRef } from 'react';
import {
  MINI_GAME_IDS,
  QUESTIONS_PER_MATCH,
  type MiniGameId,
} from '../../types/match.ts';
import { HALFTIME_AT } from '../../engine/matchReducer.ts';
import { getMiniGame } from '../../minigames/registry.ts';

const DESCRIPTIONS: Record<MiniGameId, string> = {
  multiple_choice: 'Pick the right answer from four options.',
  higher_lower: 'Decide which of two teams or stats ranks higher.',
  career_path: 'Name the player from the run of clubs they played for.',
  odd_one_out: 'Spot the one item that doesn’t belong with the rest.',
  guess_the_year: 'Slide to the year a famous moment happened — close still counts.',
  true_false: 'Snap call: is the statement true or false, against the clock?',
};

export function RulesModal({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus the close button and wire Escape-to-close for accessibility.
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rules-title"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-white/10 bg-pitch-900 p-6 shadow-neon sm:rounded-3xl"
      >
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 id="rules-title" className="font-display text-2xl font-bold">
            How to play
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-ink-muted transition hover:border-neon/50 hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-neon"
          >
            Close
          </button>
        </div>

        <div className="flex flex-col gap-5 text-sm leading-relaxed text-ink">
          <Section title="The duel">
            Two managers, one match. You answer <strong>{QUESTIONS_PER_MATCH} questions</strong>{' '}
            head-to-head against your opponent. Every match is its own scoreline — win the
            knowledge battle and you win the game, e.g. <em>Sara FC 3–2 Jonas United</em>.
          </Section>

          <Section title="Turning answers into goals">
            A correct answer is a <strong>chance on goal</strong> — but not every chance goes
            in. The <strong>faster</strong> you answer (or the <strong>closer</strong> your
            guess), the higher the quality of the finish:
            <ul className="mt-2 list-disc space-y-1 pl-5 text-ink-muted">
              <li>A clinical answer is a <span className="text-neon">goal</span>.</li>
              <li>A scrappy one can be <span className="text-amber-200">saved</span> — correct, but no goal.</li>
              <li>A wrong answer never scores.</li>
              <li>A perfect, lightning answer can even bag a <span className="text-neon">brace</span> (two goals).</li>
            </ul>
          </Section>

          <Section title="The six mini-games">
            Questions are drawn from six game types, mixed across the match:
            <ul className="mt-2 space-y-1.5">
              {MINI_GAME_IDS.map((id) => {
                const game = getMiniGame(id);
                return (
                  <li key={id} className="flex flex-col">
                    <span className="font-semibold text-neon">{game.title}</span>
                    <span className="text-ink-muted">
                      {DESCRIPTIONS[id]}{' '}
                      <span className="text-ink-muted/70">({game.timeLimitSec}s)</span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section title="Half-time & full-time">
            There’s a short <strong>half-time</strong> break after question {HALFTIME_AT} to
            check the score. If the match is <strong>level after {QUESTIONS_PER_MATCH}{' '}
            questions</strong>, it goes to <strong>sudden-death extra time</strong> — first to
            edge a round wins.
          </Section>

          <Section title="Play anywhere">
            Play offline against the CPU at three difficulty levels — no connection needed.
            Online multiplayer lights up when it’s configured.
          </Section>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-xl bg-neon-grad px-4 py-3 font-display font-bold text-pitch-950 shadow-neon transition hover:brightness-110"
        >
          Got it
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-1 font-display text-base font-semibold">{title}</h3>
      <div>{children}</div>
    </section>
  );
}
