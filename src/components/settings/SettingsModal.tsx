import { useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getSettings,
  saveSettings,
  type AppSettings,
} from '../../lib/settings';
import {
  exportBackupJson,
  encodeBackupCode,
  decodeBackupCode,
  parseBackup,
  applyBackup,
  describeBackup,
  clearAllLocalData,
} from '../../lib/backup';
import { resetOnboarding } from '../../lib/onboarding';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { IconClose, IconCheck, IconShare, IconCopy } from '../ui/icons';

/** Settings + save management. Renders via a body portal. */
export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [importText, setImportText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => describeBackup(), []);

  const update = (patch: Partial<AppSettings>) => {
    const next = saveSettings({ ...settings, ...patch });
    setSettings(next);
  };

  const flash = (m: string) => {
    setMsg(m);
    setTimeout(() => setMsg(null), 2200);
  };

  const downloadBackup = () => {
    const json = exportBackupJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ball-knowledge-backup.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash('Backup downloaded.');
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(encodeBackupCode(exportBackupJson()));
      flash('Backup code copied.');
    } catch {
      flash('Could not copy.');
    }
  };

  const doImport = () => {
    const text = importText.trim();
    if (!text) return;
    // Accept either raw JSON or a base64 backup code.
    const json = text.startsWith('{') ? text : decodeBackupCode(text);
    const file = json ? parseBackup(json) : null;
    if (!file) {
      flash('That backup didn’t look valid.');
      return;
    }
    const n = applyBackup(file.data);
    flash(`Imported ${n} item${n === 1 ? '' : 's'}. Reloading…`);
    setTimeout(() => window.location.reload(), 900);
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then((t) => setImportText(t));
  };

  const doClear = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearAllLocalData();
    flash('Local data cleared. Reloading…');
    setTimeout(() => window.location.reload(), 900);
  };

  const body = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Settings and data"
      className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-900/80 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-white/10 bg-ink-800 p-5 shadow-elev-2 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">Settings &amp; data</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {/* Accessibility / display */}
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">
          Accessibility
        </h3>
        <div className="mb-4 space-y-2">
          <Toggle
            label="Sound"
            desc="Whistles, goals and clicks"
            on={settings.sound}
            onChange={(v) => update({ sound: v })}
          />
          <Toggle
            label="Reduced motion"
            desc="Minimise animations"
            on={settings.reducedMotion}
            onChange={(v) => update({ reducedMotion: v })}
          />
          <Toggle
            label="High contrast"
            desc="Stronger text and panels"
            on={settings.highContrast}
            onChange={(v) => update({ highContrast: v })}
          />
          <Toggle
            label="Larger text"
            desc="Increase the base font size"
            on={settings.largeText}
            onChange={(v) => update({ largeText: v })}
          />
        </div>

        {/* Save management */}
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/45">
          Your save
        </h3>
        <Card className="mb-3 p-3">
          <p className="mb-2 text-xs text-white/55">
            Your progress is stored on this device. Export a backup to keep it
            safe or move it to another device.
          </p>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {items.map((it) => (
              <span
                key={it.key}
                className="rounded-full border border-white/10 bg-white/[0.03] px-2 py-0.5 text-[10px] text-white/55"
              >
                {it.label}
              </span>
            ))}
            {items.length === 0 && (
              <span className="text-[11px] text-white/40">Nothing saved yet.</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" fullWidth onClick={downloadBackup}>
              <IconShare className="h-4 w-4" /> Export file
            </Button>
            <Button variant="secondary" fullWidth onClick={copyCode}>
              <IconCopy className="h-4 w-4" /> Copy code
            </Button>
          </div>
        </Card>

        <Card className="mb-3 p-3">
          <label className="mb-1 block text-xs font-medium text-white/55">
            Import a backup (paste a code or JSON)
          </label>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder="Paste backup code here…"
            rows={3}
            className="input-field mb-2 w-full resize-none font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button variant="ghost" fullWidth onClick={() => fileRef.current?.click()}>
              Choose file
            </Button>
            <Button fullWidth disabled={!importText.trim()} onClick={doImport}>
              <IconCheck className="h-4 w-4" /> Import
            </Button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json,.txt"
            className="hidden"
            onChange={onFile}
          />
        </Card>

        <button
          type="button"
          onClick={() => {
            resetOnboarding();
            flash('Tutorial will show next time you open the home screen.');
          }}
          className="mb-2 w-full rounded-xl border border-white/10 px-3 py-2.5 text-sm font-semibold text-white/60 transition hover:border-white/25 hover:text-white"
        >
          Replay tutorial
        </button>

        <button
          type="button"
          onClick={doClear}
          className={[
            'w-full rounded-xl border px-3 py-2.5 text-sm font-semibold transition',
            confirmClear
              ? 'border-danger/60 bg-danger/15 text-danger'
              : 'border-white/10 text-white/50 hover:border-danger/40 hover:text-danger',
          ].join(' ')}
        >
          {confirmClear ? 'Tap again to erase everything' : 'Clear all local data'}
        </button>

        {msg && (
          <p className="mt-3 text-center text-xs font-medium text-pitch" role="status">
            {msg}
          </p>
        )}
      </div>
    </div>
  );

  return createPortal(body, document.body);
}

function Toggle({
  label,
  desc,
  on,
  onChange,
}: {
  label: string;
  desc: string;
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-left"
    >
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        <span className="block text-[11px] text-white/45">{desc}</span>
      </span>
      <span
        aria-hidden
        className={[
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          on ? 'bg-pitch' : 'bg-white/15',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left]',
            on ? 'left-[22px]' : 'left-0.5',
          ].join(' ')}
        />
      </span>
    </button>
  );
}
