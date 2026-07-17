import { useState } from 'react';
import { useAuth } from '../../context/AuthProvider';
import { getMyIdentity } from '../../lib/friends';
import { readLocalProgress } from '../../lib/progress';
import {
  runCloudHealth,
  type CheckResult,
  type CloudHealthBackend,
  type CloudHealthContext,
  type HealthReport,
} from '../../lib/cloudHealth';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { IconCheck } from '../ui/icons';

/** Best-effort display name for the self-test's profile write. */
function displayName(user: { email: string | null; username: string | null }): string {
  if (user.username) return user.username;
  try {
    const stored = localStorage.getItem('bk_name');
    if (stored && stored.trim()) return stored.trim();
  } catch {
    /* ignore */
  }
  return user.email?.split('@')[0] ?? 'Player';
}

/**
 * Signed-in diagnostic: round-trips every Firestore-backed social path against
 * the user's own account and shows what works + the exact fix for what doesn't.
 * Renders nothing unless sign-in is configured AND the user is signed in.
 */
export function CloudHealthPanel() {
  const { configured, user } = useAuth();
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<HealthReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!configured || !user) return null;

  const run = async () => {
    setRunning(true);
    setError(null);
    try {
      const backend = (await import(
        '../../services/firebaseBackend'
      )) as unknown as CloudHealthBackend;
      const ctx: CloudHealthContext = {
        uid: user.id,
        name: displayName(user),
        username: user.username,
        friendCode: getMyIdentity().friendCode,
        progress: readLocalProgress(),
      };
      setReport(await runCloudHealth(backend, ctx));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not run the self-test.');
    } finally {
      setRunning(false);
    }
  };

  return (
    <>
      <h3 className="mb-2 text-xs font-semibold text-white/55">Cloud health</h3>
      <Card className="mb-3 p-3">
        <p className="mb-2 text-xs text-white/55">
          Check that sign-in, sync, friends, leaderboards and leagues all work
          against your Firebase project — from this one device. Runs a few
          harmless round-trips on your own account.
        </p>
        <Button
          fullWidth
          disabled={running}
          onClick={run}
        >
          {running ? 'Running self-test…' : 'Run self-test'}
        </Button>

        {error && (
          <p className="mt-2 text-xs font-medium text-danger" role="alert">
            {error}
          </p>
        )}

        {report && (
          <div className="mt-3" aria-live="polite">
            <p className="mb-2 text-xs font-semibold">
              {report.ok ? (
                <span className="text-pitch">
                  All good — {report.passed} passed
                  {report.skipped ? `, ${report.skipped} skipped` : ''}.
                </span>
              ) : (
                <span className="text-danger">
                  {report.failed} problem{report.failed === 1 ? '' : 's'} found —
                  see the fixes below.
                </span>
              )}
            </p>
            <ul className="space-y-1.5">
              {report.results.map((r) => (
                <ResultRow key={r.id} result={r} />
              ))}
            </ul>
          </div>
        )}
      </Card>
    </>
  );
}

function ResultRow({ result }: { result: CheckResult }) {
  const { status, label, detail, remediation } = result;
  const badge =
    status === 'pass'
      ? { glyph: <IconCheck className="h-3.5 w-3.5" />, cls: 'bg-pitch/15 text-pitch', word: 'Pass' }
      : status === 'skip'
        ? { glyph: <span aria-hidden>–</span>, cls: 'bg-white/10 text-white/60', word: 'Skip' }
        : { glyph: <span aria-hidden>!</span>, cls: 'bg-danger/20 text-danger', word: 'Fail' };

  return (
    <li className="rounded-lg border border-white/10 bg-white/[0.02] p-2">
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${badge.cls}`}
        >
          {badge.glyph}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-semibold">{label}</span>
            <span className="sr-only">{badge.word}</span>
          </div>
          <p className="text-[11px] text-white/55">{detail}</p>
          {remediation && (
            <p className="mt-1 rounded border-l-2 border-danger/50 bg-danger/5 px-2 py-1 text-[11px] text-white/70">
              Fix: {remediation}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}
