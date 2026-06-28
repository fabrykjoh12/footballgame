import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  validateClubIdentity,
  suggestShortName,
  normalizeShortName,
  defaultClubIdentity,
  BADGE_STYLES,
  KIT_COLORS,
  NAME_MAX,
  STADIUM_MAX,
  NICKNAME_MAX,
  type BadgeStyle,
  type ClubIdentity,
} from '../../lib/clubIdentity';
import { ClubBadge } from './ClubBadge';
import { Button } from '../ui/Button';
import { IconClose, IconCheck } from '../ui/icons';

/** Create / edit the player's fictional club. Renders via a body portal. */
export function ClubIdentityModal({
  initial,
  onSave,
  onClose,
}: {
  initial: ClubIdentity | null;
  onSave: (identity: ClubIdentity) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ClubIdentity>(initial ?? defaultClubIdentity());
  // Track whether the user has hand-edited the tag, so it can auto-follow name.
  const [tagTouched, setTagTouched] = useState(initial != null);

  const { identity, errors, ok } = useMemo(() => validateClubIdentity(draft), [draft]);

  const set = <K extends keyof ClubIdentity>(key: K, value: ClubIdentity[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setName = (name: string) =>
    setDraft((d) => ({
      ...d,
      name,
      shortName: tagTouched ? d.shortName : suggestShortName(name),
    }));

  const body = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Create your club"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-900/80 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-ink-800 p-5 shadow-elev-2 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Your Club</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {/* Live preview */}
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <ClubBadge identity={identity} size={56} />
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-bold">{identity.name}</div>
            <div className="truncate text-xs text-white/55">
              {identity.nickname} · {identity.stadium}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <Field label="Club name" error={errors.name}>
            <input
              className="input-field"
              value={draft.name}
              maxLength={NAME_MAX}
              placeholder="Modock United"
              onChange={(e) => setName(e.target.value)}
            />
          </Field>

          <Field label="Short tag" error={errors.shortName}>
            <input
              className="input-field uppercase"
              value={draft.shortName}
              maxLength={4}
              placeholder="MOD"
              onChange={(e) => {
                setTagTouched(true);
                set('shortName', normalizeShortName(e.target.value));
              }}
            />
          </Field>

          <ColorRow
            label="Primary kit"
            value={draft.primary}
            onPick={(c) => set('primary', c)}
          />
          <ColorRow
            label="Accent"
            value={draft.secondary}
            onPick={(c) => set('secondary', c)}
            error={errors.secondary}
          />

          <Field label="Badge style">
            <div className="flex flex-wrap gap-2">
              {BADGE_STYLES.map((b) => (
                <Chip
                  key={b.id}
                  active={draft.badge === b.id}
                  onClick={() => set('badge', b.id as BadgeStyle)}
                >
                  {b.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Stadium">
            <input
              className="input-field"
              value={draft.stadium}
              maxLength={STADIUM_MAX}
              placeholder="Modock Park"
              onChange={(e) => set('stadium', e.target.value)}
            />
          </Field>

          <Field label="Nickname">
            <input
              className="input-field"
              value={draft.nickname}
              maxLength={NICKNAME_MAX}
              placeholder="The Reds"
              onChange={(e) => set('nickname', e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="ghost" fullWidth onClick={onClose}>
            Cancel
          </Button>
          <Button fullWidth disabled={!ok} onClick={() => onSave(identity)}>
            <IconCheck className="h-4 w-4" /> Save club
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(body, document.body);
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-white/45">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
    </label>
  );
}

function ColorRow({
  label,
  value,
  onPick,
  error,
}: {
  label: string;
  value: string;
  onPick: (c: string) => void;
  error?: string;
}) {
  return (
    <Field label={label} error={error}>
      <div className="flex flex-wrap gap-1.5">
        {KIT_COLORS.map((c) => {
          const active = value.toLowerCase() === c.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              aria-label={`${label} colour ${c}`}
              aria-pressed={active}
              onClick={() => onPick(c)}
              className={[
                'h-7 w-7 rounded-full border-2 transition',
                active ? 'border-pitch scale-110' : 'border-white/15',
              ].join(' ')}
              style={{ backgroundColor: c }}
            />
          );
        })}
      </div>
    </Field>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        'rounded-full border px-3 py-1.5 text-sm font-medium transition',
        active
          ? 'border-pitch/50 bg-pitch/15 text-pitch'
          : 'border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.06]',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
