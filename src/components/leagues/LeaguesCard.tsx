import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLeagues } from '../../context/LeaguesProvider';
import { useAuth } from '../../context/AuthProvider';
import { isValidLeagueCode, type League, type StandingRow } from '../../lib/leagues';
import { isFirebaseConfigured } from '../../lib/firebaseConfig';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { IconTrophy, IconClose, IconCheck, IconCopy, IconUsers } from '../ui/icons';

/**
 * Home card for private friend leagues. Each member's Daily Challenge score
 * feeds a shared season table, so the standings are a fair comparison. Online
 * only (needs Firebase sign-in); hidden entirely when sign-in isn't built in.
 */
export function LeaguesCard() {
  const [open, setOpen] = useState(false);
  const { online, leagues } = useLeagues();

  if (!isFirebaseConfigured) return null;

  return (
    <Card className="mx-auto w-full max-w-md p-4 animate-fade-in">
      <div className="mb-2 flex items-center gap-2">
        <IconTrophy className="h-5 w-5 text-gold" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
          Friend Leagues
        </h2>
        {online && leagues.length > 0 && (
          <span className="ml-auto text-xs font-bold text-gold">{leagues.length}</span>
        )}
      </div>
      <p className="text-xs leading-relaxed text-white/55">
        Create a private league with friends — everyone’s Daily Challenge score feeds
        a shared season table. Same questions for all, so it’s a fair race.
      </p>
      <div className="mt-3">
        <Button fullWidth onClick={() => setOpen(true)}>
          {online ? (leagues.length ? 'View my leagues' : 'Create a league') : 'Sign in to play leagues'}
        </Button>
      </div>
      {open && <LeaguesModal onClose={() => setOpen(false)} />}
    </Card>
  );
}

function LeaguesModal({ onClose }: { onClose: () => void }) {
  const { online, leagues, busy, createLeague, joinByCode } = useLeagues();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (viewing ? setViewing(null) : onClose());
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, viewing]);

  const doCreate = async () => {
    setError(null);
    const res = await createLeague(name);
    if (!res.ok) setError(res.error ?? 'Could not create the league.');
    else setName('');
  };

  const doJoin = async () => {
    setError(null);
    if (!isValidLeagueCode(code)) {
      setError('That league code doesn’t look right (e.g. LG7Q2K).');
      return;
    }
    const res = await joinByCode(code);
    if (!res.ok) setError(res.error ?? 'Could not join that league.');
    else setCode('');
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Friend leagues"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-900/90 px-5 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-white/12 bg-ink-800 p-6 shadow-elev-2 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white"
        >
          <IconClose className="h-4 w-4" />
        </button>

        {viewing ? (
          <StandingsView leagueId={viewing} onBack={() => setViewing(null)} />
        ) : (
          <>
            <h2 className="mb-1 text-center font-display text-xl font-bold">Friend Leagues</h2>
            <p className="mx-auto mb-4 max-w-xs text-center text-sm text-white/55">
              Your Daily Challenge score is added to each league’s table every day.
            </p>

            {!online ? (
              <p className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-4 text-center text-sm text-white/55">
                Sign in (top-right) to create or join a private league with friends.
              </p>
            ) : (
              <>
                {/* My leagues */}
                {leagues.length > 0 && (
                  <ul className="mb-4 flex flex-col gap-1.5">
                    {leagues.map((l) => (
                      <li key={l.id}>
                        <button
                          type="button"
                          onClick={() => setViewing(l.id)}
                          className="answer-press flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-left hover:bg-white/[0.06]"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                            <IconTrophy className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold">{l.name}</span>
                            <span className="block text-[11px] text-white/40">
                              {l.members.length} member{l.members.length === 1 ? '' : 's'} · {l.code}
                            </span>
                          </span>
                          <span className="text-xs text-white/40">View →</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Create */}
                <div className="flex gap-2">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 24))}
                    placeholder="New league name"
                    className="input-field text-sm"
                    aria-label="New league name"
                  />
                  <Button disabled={busy || !name.trim()} onClick={doCreate}>
                    Create
                  </Button>
                </div>

                <div className="my-3 flex items-center gap-3 text-[11px] uppercase tracking-widest text-white/30">
                  <span className="h-px flex-1 bg-white/10" />
                  or join
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                {/* Join */}
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 7))}
                    onKeyDown={(e) => e.key === 'Enter' && doJoin()}
                    placeholder="League code (LG7Q2K)"
                    className="input-field text-center font-mono uppercase tracking-widest"
                    aria-label="League code"
                  />
                  <Button variant="secondary" disabled={busy || !code.trim()} onClick={doJoin}>
                    Join
                  </Button>
                </div>

                {error && (
                  <p role="alert" className="mt-3 text-sm text-danger">
                    {error}
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}

function StandingsView({ leagueId, onBack }: { leagueId: string; onBack: () => void }) {
  const { loadStandings } = useLeagues();
  const { user } = useAuth();
  const [data, setData] = useState<{ league: League; standings: StandingRow[] } | null | 'loading'>(
    'loading',
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setData('loading');
    void loadStandings(leagueId).then((d) => {
      if (active) setData(d);
    });
    return () => {
      active = false;
    };
  }, [leagueId, loadStandings]);

  const copyCode = async () => {
    if (data && data !== 'loading') {
      try {
        await navigator.clipboard.writeText(data.league.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      } catch {
        /* clipboard blocked */
      }
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-2 text-xs text-white/50 hover:text-white"
      >
        ← All leagues
      </button>

      {data === 'loading' ? (
        <p className="py-8 text-center text-sm text-white/50">Loading table…</p>
      ) : !data ? (
        <p className="py-8 text-center text-sm text-white/50">Couldn’t load this league.</p>
      ) : (
        <>
          <h2 className="text-center font-display text-xl font-bold">{data.league.name}</h2>
          <div className="mt-1 mb-4 flex items-center justify-center gap-2 text-xs text-white/45">
            <IconUsers className="h-3.5 w-3.5" />
            {data.league.members.length} members · invite code
            <span className="font-mono font-semibold text-gold">{data.league.code}</span>
            <button
              type="button"
              onClick={copyCode}
              aria-label="Copy league code"
              className="rounded-full p-1 text-white/50 hover:bg-white/10 hover:text-white"
            >
              {copied ? <IconCheck className="h-3.5 w-3.5 text-pitch" /> : <IconCopy className="h-3.5 w-3.5" />}
            </button>
          </div>

          {data.standings.every((r) => r.played === 0) ? (
            <p className="py-4 text-center text-sm text-white/50">
              No scores yet — play today’s Daily Challenge to get the season started!
            </p>
          ) : (
            <ol className="flex max-h-[55vh] flex-col gap-1.5 overflow-y-auto">
              {data.standings.map((row) => (
                <li
                  key={row.uid}
                  className={[
                    'flex items-center gap-3 rounded-xl border px-3 py-2',
                    user && row.uid === user.id
                      ? 'border-pitch/40 bg-pitch/[0.08]'
                      : 'border-white/10 bg-white/[0.02]',
                  ].join(' ')}
                >
                  <span className="w-6 text-center font-mono text-sm font-bold text-white/60">
                    {row.rank}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{row.name}</span>
                    <span className="block text-[11px] text-white/40">
                      {row.played} day{row.played === 1 ? '' : 's'} · best {row.best.toLocaleString()}
                    </span>
                  </span>
                  <span className="font-mono text-sm font-bold text-pitch">
                    {row.points.toLocaleString()}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
