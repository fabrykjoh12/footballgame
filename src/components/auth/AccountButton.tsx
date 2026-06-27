import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../context/AuthProvider';
import { Button } from '../ui/Button';
import { IconUser, IconLogout, IconClose, IconCheck } from '../ui/icons';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

/**
 * Header account control. Hidden entirely when sign-in isn't configured, so
 * anonymous-only builds are unaffected. Opens a small modal for the passwordless
 * magic-link flow (or account / sign-out when already signed in).
 */
export function AccountButton() {
  const { configured, user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!configured) return null;

  const initial = (user?.email?.[0] ?? '?').toUpperCase();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={user ? 'Account' : 'Sign in'}
        title={user ? 'Account' : 'Sign in'}
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
          {user ? 'Account' : 'Sign in'}
        </span>
      </button>

      {open && <AuthModal onClose={() => setOpen(false)} />}
    </>
  );
}

function AuthModal({ onClose }: { onClose: () => void }) {
  const { user, signInWithEmail, signOut } = useAuth();
  const [email, setEmail] = useState(user?.email ?? '');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const valid = EMAIL_RE.test(email.trim());

  const send = async () => {
    if (!valid) return;
    setState('sending');
    const res = await signInWithEmail(email);
    if (res.ok) {
      setState('sent');
    } else {
      setState('error');
      setMessage(res.error ?? 'Something went wrong. Try again.');
    }
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

        {user ? (
          <div className="text-center">
            <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-pitch/15 text-lg font-bold text-pitch ring-1 ring-pitch/30">
              {(user.email?.[0] ?? '?').toUpperCase()}
            </div>
            <h2 className="font-display text-xl font-bold">You’re signed in</h2>
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
        ) : state === 'sent' ? (
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
              Sign in to save progress
            </h2>
            <p className="mx-auto mt-1 max-w-xs text-center text-sm text-white/55">
              Sync your Career, stats and daily streak across devices. No
              password — we’ll email you a one-tap sign-in link.
            </p>
            <label
              htmlFor="auth-email"
              className="mb-1.5 mt-5 block text-xs font-semibold uppercase tracking-wider text-white/50"
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
                if (state === 'error') setState('idle');
              }}
              onKeyDown={(e) => e.key === 'Enter' && send()}
              placeholder="you@example.com"
              className="input-field text-base"
            />
            {state === 'error' && (
              <p role="alert" className="mt-2 text-sm text-danger">
                {message}
              </p>
            )}
            <div className="mt-4">
              <Button
                fullWidth
                size="lg"
                disabled={!valid || state === 'sending'}
                onClick={send}
              >
                {state === 'sending' ? 'Sending…' : 'Send magic link'}
              </Button>
            </div>
            <p className="mt-3 text-center text-[11px] text-white/35">
              Progress already on this device stays — signing in just backs it up.
            </p>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
