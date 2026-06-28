import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CLUB_OPTIONS,
  COUNTRY_OPTIONS,
  LEAGUE_OPTIONS,
  CONTINENT_OPTIONS,
  POSITION_OPTIONS,
  TROPHY_OPTIONS,
  STATUS_OPTIONS,
  ERA_OPTIONS,
  questionLabel,
  optionLabel,
} from '../../lib/mysteryPlayer/mysteryPlayerQuestions';
import type { VerifiedQuestion } from '../../lib/mysteryPlayer/mysteryPlayerTypes';
import { IconClose, IconBack } from '../ui/icons';

type Category = 'club' | 'league' | 'country' | 'continent' | 'position' | 'trophy' | 'status' | 'era';

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'club', label: 'Club' },
  { id: 'league', label: 'League' },
  { id: 'country', label: 'Country' },
  { id: 'continent', label: 'Continent' },
  { id: 'position', label: 'Position' },
  { id: 'trophy', label: 'Trophy' },
  { id: 'status', label: 'Career' },
  { id: 'era', label: 'Era' },
];

/** Two-step verified question builder: pick a category, then a value. */
export function QuestionBuilder({
  onAsk,
  onClose,
}: {
  onAsk: (q: VerifiedQuestion) => void;
  onClose: () => void;
}) {
  const [cat, setCat] = useState<Category | null>(null);
  const [search, setSearch] = useState('');

  const searchable = cat === 'club' || cat === 'country';
  const values = listFor(cat, search);

  const body = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ask a verified question"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-900/85 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-ink-800 p-5 shadow-elev-2 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">
            {cat ? 'Choose a value' : 'Ask about…'}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {!cat ? (
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  setCat(c.id);
                  setSearch('');
                }}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3 text-left text-sm font-semibold hover:border-pitch/40 hover:bg-pitch/5"
              >
                {c.label}
              </button>
            ))}
          </div>
        ) : (
          <>
            <button
              onClick={() => setCat(null)}
              className="mb-3 inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white"
            >
              <IconBack className="h-4 w-4" /> Categories
            </button>
            {searchable && (
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={`Search ${cat}…`}
                autoComplete="off"
                className="input-field mb-3"
              />
            )}
            <div className="flex max-h-[52vh] flex-col gap-1.5 overflow-y-auto">
              {values.map((q) => (
                <button
                  key={`${q.kind}:${q.value}`}
                  onClick={() => onAsk(q)}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left text-sm hover:border-pitch/40 hover:bg-pitch/5"
                >
                  {questionLabel(q)}
                </button>
              ))}
              {values.length === 0 && (
                <p className="py-4 text-center text-sm text-white/40">No matches.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );

  return createPortal(body, document.body);
}

function listFor(cat: Category | null, search: string): VerifiedQuestion[] {
  const needle = search.trim().toLowerCase();
  const match = (s: string) => !needle || s.toLowerCase().includes(needle);
  switch (cat) {
    case 'club':
      return CLUB_OPTIONS.filter(match).slice(0, 60).map((value) => ({ kind: 'club', value }));
    case 'country':
      return COUNTRY_OPTIONS.filter(match).map((value) => ({ kind: 'country', value }));
    case 'league':
      return LEAGUE_OPTIONS.map((value) => ({ kind: 'league', value }));
    case 'continent':
      return CONTINENT_OPTIONS.map((value) => ({ kind: 'continent', value }));
    case 'position':
      return POSITION_OPTIONS.map((value) => ({ kind: 'position', value }));
    case 'trophy':
      return TROPHY_OPTIONS.map((value) => ({ kind: 'trophy', value }));
    case 'status':
      return STATUS_OPTIONS.map((value) => ({ kind: 'status', value }));
    case 'era':
      return ERA_OPTIONS.map((value) => ({ kind: 'era', value }));
    default:
      return [];
  }
}

/** Re-exported so callers can label chips if needed. */
export { optionLabel };
