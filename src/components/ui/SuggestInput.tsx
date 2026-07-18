import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';

/**
 * A keyboard-first player-name autocomplete, shared by every "type a player"
 * surface (Rondo, Scout probes, …). Type a partial name and:
 *
 *   - **Tab** cycles forward through the suggestions (Tab once → the first,
 *     twice → the second, …); **Shift+Tab** cycles back. Arrow Down/Up do the
 *     same. The input previews the highlighted suggestion as you cycle.
 *   - **Enter** commits the highlighted suggestion — or, if none is highlighted,
 *     whatever you typed.
 *   - **Escape** drops the highlight back to your typed text.
 *   - Clicking a suggestion commits it.
 *
 * Tab is only intercepted while the suggestion list is open, so an empty field
 * still tabs to the next control (and Escape reopens normal Tab behaviour).
 *
 * `onCommit` returns an error string to show inline (e.g. an unrecognised name)
 * or `null` on success — on success the field clears and keeps focus for the
 * next entry.
 */
export function SuggestInput({
  suggest,
  onCommit,
  placeholder = 'Name a player',
  disabled = false,
  autoFocus = true,
  minChars = 2,
  submitIcon,
  submitLabel,
  ariaLabel,
  listId = 'suggest-list',
}: {
  suggest: (query: string) => string[];
  onCommit: (value: string) => string | null;
  placeholder?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  minChars?: number;
  submitIcon?: ReactNode;
  /** Accessible name for the submit button (needed when submitIcon is icon-only). */
  submitLabel?: string;
  ariaLabel?: string;
  listId?: string;
}) {
  const [typed, setTyped] = useState('');
  const [active, setActive] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep `suggest` in a ref so a parent re-render (e.g. a per-second timer tick)
  // doesn't recompute suggestions — only a change to the typed text does.
  const suggestRef = useRef(suggest);
  suggestRef.current = suggest;
  const suggestions = useMemo(
    () => (typed.trim().length >= minChars ? suggestRef.current(typed) : []),
    [typed, minChars],
  );
  const open = suggestions.length > 0;
  const shown = active >= 0 && active < suggestions.length ? suggestions[active] : typed;

  const commit = (value: string) => {
    const v = value.trim();
    if (!v) return;
    const problem = onCommit(v);
    setError(problem);
    if (!problem) {
      setTyped('');
      setActive(-1);
      inputRef.current?.focus();
    }
  };

  const move = (delta: number) => {
    if (!open) return;
    setActive((i) => {
      const n = suggestions.length;
      // -1 (typed) → 0 … n-1 → wrap back to 0 (never gets "stuck" off the list).
      if (i < 0) return delta > 0 ? 0 : n - 1;
      return (i + delta + n) % n;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && open) {
      e.preventDefault();
      move(e.shiftKey ? -1 : 1);
    } else if (e.key === 'ArrowDown' && open) {
      e.preventDefault();
      move(1);
    } else if (e.key === 'ArrowUp' && open) {
      e.preventDefault();
      move(-1);
    } else if (e.key === 'Escape' && active >= 0) {
      e.preventDefault();
      setActive(-1);
    }
  };

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit(shown);
        }}
        className="flex gap-2"
      >
        <input
          ref={inputRef}
          value={shown}
          disabled={disabled}
          autoFocus={autoFocus}
          onChange={(e) => {
            setTyped(e.target.value);
            setActive(-1);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className="input-field flex-1"
          aria-label={ariaLabel ?? placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `${listId}-opt-${active}` : undefined}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />
        {submitIcon && (
          <Button type="submit" disabled={disabled || !shown.trim()} aria-label={submitLabel}>
            {submitIcon}
          </Button>
        )}
      </form>

      {open && (
        <ul
          id={listId}
          role="listbox"
          className="mt-1.5 flex flex-wrap gap-1.5"
          aria-label="Name suggestions"
        >
          {suggestions.map((s, i) => (
            <li key={s} role="none">
              <button
                type="button"
                id={`${listId}-opt-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => commit(s)}
                className={[
                  'rounded-full border px-2.5 py-1 text-[11px] transition',
                  i === active
                    ? 'border-pitch/60 bg-pitch/15 text-pitch'
                    : 'border-white/10 bg-white/[0.03] text-white/75 hover:border-pitch/40 hover:text-white',
                ].join(' ')}
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <p className="mt-1 text-[10px] text-white/35">
          <kbd className="rounded bg-white/10 px-1">Tab</kbd> to cycle · <kbd className="rounded bg-white/10 px-1">Enter</kbd> to pick
        </p>
      )}

      {error && (
        <p className="mt-1 text-[11px] font-medium text-gold" role="status">
          {error}
        </p>
      )}
    </div>
  );
}
