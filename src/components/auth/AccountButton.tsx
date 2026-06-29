import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthProvider';
import { Button } from '../ui/Button';
import { IconUser, IconLogout, IconClose, IconCheck } from '../ui/icons';

const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * Header account control. Hidden entirely when sign-in isn't configured, so
 * anonymous-only builds are unaffected. Opens a small modal for the passwordless
 * magic-link flow (or account / sign-out when already signed in).
 */
export function AccountButton() {
  const { configured, user, needsUsername } = useAuth();
  const [open, setOpen] = useState(false);

  // Auto-open the username picker the first time after sign-in.
  useEffect(() => {
    if (needsUsername) setOpen(true);
  }, [needsUsername]);

  if (!configured) return null;

  const initial = user?.username
    ? user.username[0].toUpperCase()
    : (user?.email?.[0] ?? '?').toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={user ? 'Account' : 'Sign in'}
        title={user ? `Account${user.username ? ` (@${user.username})` : ''}` : 'Sign in'}
        className="answer-press flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-2 text-white/70 hover:bg-white/10 hover:text-white"
      >
        {user ? (
          <span className="grid h-5 w-5 place-items-center rounded-full bg-pitch/20 text-[11px] font-bold text-pitch">
            {initial}
          </span>
        ) : (
          <IconUser className="h-5 w-5" />
        )}
        <span className="hidden text-xs font-semibold sm:inline">
          {user ? (user.username ? `@${user.username}` : 'Account') : 'Sign in'}
        </span>
      </button>

      {open && <AuthModal onClose={() => setOpen(false)} />}
    </>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const {
    user,
    needsUsername,
    signInWithEmail,
    signInWithPassword,
    registerWithPassword,
    signInWithGoogle,
    setUsername,
    signOut,
  } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [password, setPassword] = useState('');
  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const emailValid = EMAIL_RE.test(email.trim());
  const passwordValid = password.length >= 6;

  /** Run an auth action; close on success, or surface the error. */
  const run = async (
    action: () => Promise<{ ok: boolean; error?: string }>,
    opts?: { magic?: boolean },
  ) => {
    setBusy(true);
    setError(null);
    const res = await action();
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Something went wrong.');
      return;
    }
    if (opts?.magic) setSent(true);
    else onClose();
  };

  const submitPassword = () => {
    if (!emailValid || !passwordValid || busy) return;
    run(() =>
      tab === 'signin'
        ? signInWithPassword(email, password)
        : registerWithPassword(email, password),
    );
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={user ? 'Account' : 'Sign in'}
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

        {user && needsUsername ? (
          <UsernameStep setUsername={setUsername} onClose={onClose} />
        ) : user ? (
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-pitch/15 text-lg font-bold text-pitch ring-1 ring-pitch/30">
              {(user.username?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
            </div>
            <h2 className="font-display text-xl font-bold">You're signed in</h2>
            {user.username && (
              <p className="mt-1 font-mono text-base font-bold text-pitch">@{user.username}</p>
            )}
            <p className="mt-1 break-all text-sm text-white/55">{user.email}</p>
            <p className="mt-3 text-xs text-white/45">
              Your Career, stats and daily streak sync automatically across your
              devices.
            </p>
            <div className="mt-5">
              <Button variant="secondary" fullWidth onClick={() => void signOut()}>
                <IconLogout className="h-4 w-4" /> Sign out
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-white/30">
              Signing out keeps your progress on this device.
            </p>
          </div>
        ) : sent ? (
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-pitch/15 text-pitch ring-1 ring-pitch/30">
              <IconCheck className="h-6 w-6" />
            </div>
            <h2 className="font-display text-xl font-bold">Check your email</h2>
            <p className="mt-2 text-sm text-white/55">
              We sent a sign-in link to{' '}
              <span className="font-semibold text-white/80">{email.trim()}</span>.
              Open it on this device to finish signing in.
            </p>
            <div className="mt-5">
              <Button variant="ghost" fullWidth onClick={onClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-pitch/15 text-pitch ring-1 ring-pitch/30">
              <IconUser className="h-6 w-6" />
            </div>
            <h2 className="text-center font-display text-xl font-bold">
              {tab === 'signin' ? 'Sign in to save progress' : 'Create your account'}
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-center text-sm text-white/55">
              Sync your Career, stats and daily streak across devices.
            </p>

            {/* Google */}
            <div className="mt-5">
              <Button
                variant="secondary"
                fullWidth
                disabled={busy}
                onClick={() => run(() => signInWithGoogle())}
              >
                <GoogleIcon className="h-4 w-4" /> Continue with Google
              </Button>
            </div>

            <div className="my-4 flex items-center gap-3 text-[11px] uppercase tracking-widest text-white/30">
              <span className="h-px flex-1 bg-white/10" />
              or
              <span className="h-px flex-1 bg-white/10" />
            </div>

            {/* Email + password */}
            <label
              htmlFor="auth-email"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50"
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
              placeholder="you@example.com"
              className="input-field text-base"
            />
            <label
              htmlFor="auth-password"
              className="mb-1.5 mt-3 block text-xs font-semibold uppercase tracking-wider text-white/50"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={tab === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && submitPassword()}
              placeholder={tab === 'signin' ? 'Your password' : 'At least 6 characters'}
              className="input-field text-base"
            />

            {error && (
              <p role="alert" className="mt-2 text-sm text-danger">
                {error}
              </p>
            )}

            <div className="mt-4">
              <Button
                fullWidth
                size="lg"
                disabled={!emailValid || !passwordValid || busy}
                onClick={submitPassword}
              >
                {busy
                  ? 'Working…'
                  : tab === 'signin'
                    ? 'Sign in'
                    : 'Create account'}
              </Button>
            </div>

            <button
              type="button"
              disabled={busy}
              onClick={() => {
                setError(null);
                setTab((t) => (t === 'signin' ? 'signup' : 'signin'));
              }}
              className="mt-3 w-full text-center text-xs text-white/55 hover:text-white"
            >
              {tab === 'signin'
                ? 'New here? Create an account'
                : 'Already have an account? Sign in'}
            </button>

            <div className="my-3 h-px bg-white/[0.06]" />

            <button
              type="button"
              disabled={!emailValid || busy}
              onClick={() => run(() => signInWithEmail(email), { magic: true })}
              className="w-full text-center text-xs text-white/45 hover:text-pitch disabled:opacity-40"
            >
              Or email me a one-tap sign-in link instead
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

/** Shown immediately after sign-up (or on next open) when the user has no username yet. */
function UsernameStep({
  setUsername,
  onClose,
}: {
  setUsername: (u: string) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}) {
  const [raw, setRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalised = raw.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20);
  const isValid = USERNAME_RE.test(normalised);

  const submit = async () => {
    if (!isValid || busy) return;
    setBusy(true);
    setError(null);
    const res = await setUsername(normalised);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Something went wrong.');
      return;
    }
    onClose();
  };

  return (
    <div>
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-pitch/15 text-pitch ring-1 ring-pitch/30">
        <IconUser className="h-6 w-6" />
      </div>
      <h2 className="text-center font-display text-xl font-bold">Pick your username</h2>
      <p className="mx-auto mt-1 max-w-xs text-center text-sm text-white/55">
        This is how friends can find and add you. Choose wisely!
      </p>

      <div className="mt-5">
        <label
          htmlFor="username-pick"
          className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/50"
        >
          Username
        </label>
        <input
          id="username-pick"
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 20));
            setError(null);
          }}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          placeholder="e.g. messi10"
          className="input-field font-mono text-base"
        />
        <p className="mt-1 text-[11px] text-white/35">
          Letters, numbers, underscores — 3 to 20 characters.
        </p>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}

      <div className="mt-4">
        <Button
          fullWidth
          size="lg"
          disabled={!isValid || busy}
          onClick={() => void submit()}
        >
          {busy ? 'Checking…' : 'Set username'}
        </Button>
      </div>

      <p className="mt-3 text-center text-[11px] text-white/30">
        You can update your username later from Account settings.
      </p>
    </div>
  );
}

/** Google "G" mark (brand colours). */
function GoogleIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 24 44c11 0 20-9 20-20 0-1.3-.1-2.3-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2A12 12 0 0 1 12.7 28l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.6l6.2 5.2C39 35.7 44 30.5 44 24c0-1.3-.1-2.3-.4-3.5z"
      />
    </svg>
  );
}
