import { useMemo, useState } from 'react';
import { MYSTERY_PLAYERS } from '../../data/mysteryPlayers';
import { POSITION_OPTIONS } from '../../lib/mysteryPlayer/mysteryPlayerQuestions';
import type { MysteryPlayer, PlayerRole } from '../../lib/mysteryPlayer/mysteryPlayerTypes';
import { Button } from '../ui/Button';

/** Informational rarity label (never blocks selection). */
export function fameLabel(p: MysteryPlayer): 'Famous' | 'Known' | 'Deep Cut' {
  if (p.won.ballonDor || p.won.worldCup || p.won.championsLeague) return 'Famous';
  if (p.active) return 'Known';
  return 'Deep Cut';
}

/** Searchable list over the full Mystery Player database. */
export function PlayerSearch({
  onPick,
  actionLabel = 'Choose',
}: {
  onPick: (p: MysteryPlayer) => void;
  actionLabel?: string;
}) {
  const [q, setQ] = useState('');
  const [role, setRole] = useState<PlayerRole | null>(null);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return MYSTERY_PLAYERS.filter(
      (p) =>
        (!role || p.positions.includes(role)) &&
        (!needle || p.name.toLowerCase().includes(needle) || p.nationality.toLowerCase().includes(needle)),
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [q, role]);

  return (
    <div className="flex flex-col gap-3">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search player name or nationality…"
        autoComplete="off"
        className="input-field"
        aria-label="Search players"
      />
      <div className="flex flex-wrap gap-1.5">
        <RoleChip active={role === null} onClick={() => setRole(null)}>
          All
        </RoleChip>
        {POSITION_OPTIONS.map((r) => (
          <RoleChip key={r} active={role === r} onClick={() => setRole(r)}>
            {r}
          </RoleChip>
        ))}
      </div>

      <div className="max-h-[46vh] overflow-y-auto pr-1">
        {list.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">No players match.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {list.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2.5"
              >
                <Silhouette role={p.primaryPosition} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-semibold">{p.name}</span>
                    <Fame label={fameLabel(p)} />
                  </div>
                  <div className="truncate text-[11px] text-white/45">
                    {p.nationality} · {p.primaryPosition} · {p.active ? 'Active' : 'Retired'}
                  </div>
                  <div className="truncate text-[10px] text-white/35">{p.clubs.join(', ')}</div>
                </div>
                <Button onClick={() => onPick(p)}>{actionLabel}</Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RoleChip({
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
        'rounded-full border px-2.5 py-1 text-xs font-medium capitalize transition',
        active ? 'border-pitch/50 bg-pitch/15 text-pitch' : 'border-white/10 bg-white/[0.03] text-white/60',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function Fame({ label }: { label: 'Famous' | 'Known' | 'Deep Cut' }) {
  const tone =
    label === 'Famous' ? 'text-gold' : label === 'Known' ? 'text-pitch' : 'text-sky-300';
  return <span className={['shrink-0 text-[9px] font-bold uppercase tracking-wide', tone].join(' ')}>{label}</span>;
}

/** Abstract, license-free position silhouette. */
function Silhouette({ role }: { role: PlayerRole }) {
  return (
    <span
      aria-hidden
      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-gradient-to-b from-white/10 to-white/[0.02] text-xs"
    >
      {role === 'goalkeeper' ? '🧤' : role === 'defender' ? '🛡️' : role === 'midfielder' ? '🎯' : '⚽'}
    </span>
  );
}
