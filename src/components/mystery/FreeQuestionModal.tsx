import { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getCustomQuestions,
  saveCustomQuestion,
  forgetCustomQuestion,
  STARTER_QUESTIONS,
} from '../../lib/mysteryPlayer/customQuestions';
import { Button } from '../ui/Button';
import { IconClose } from '../ui/icons';

/**
 * Ask a custom (free) question — with a saved, reusable library. Shared by the
 * local hot-seat/CPU game and the online duel; free questions are answered by
 * hand, so anything goes.
 */
export function FreeQuestionModal({ onAsk, onClose }: { onAsk: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  const [remember, setRemember] = useState(true);
  const [saved, setSaved] = useState<string[]>(() => getCustomQuestions());

  const ask = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    if (remember) setSaved(saveCustomQuestion(q));
    onAsk(q);
  };
  const forget = (q: string) => setSaved(forgetCustomQuestion(q));

  // Show saved questions first, then any starters not already saved.
  const savedLower = new Set(saved.map((q) => q.toLowerCase()));
  const starters = STARTER_QUESTIONS.filter((q) => !savedLower.has(q.toLowerCase()));

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-ink-900/85 backdrop-blur-sm sm:items-center sm:px-5" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-2xl border border-white/10 bg-ink-800 p-5 shadow-elev-2 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold text-bone">Ask a custom question</h2>
          <button onClick={onClose} aria-label="Close" className="text-bone-dim hover:text-bone"><IconClose className="h-5 w-5" /></button>
        </div>
        <p className="mb-2 text-[11px] text-bone-dim">Off the record — your opponent answers by hand (Yes / No / Unsure). It won’t auto-clear the shortlist.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Did your player ever line up alongside Messi?"
          className="input-field mb-2 w-full resize-none text-sm"
        />
        <label className="mb-3 flex cursor-pointer items-center gap-2 text-[11px] text-bone-dim">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-pitch" />
          Save this question to reuse later
        </label>
        <Button fullWidth disabled={!text.trim()} onClick={() => ask(text)}>Put it to them</Button>

        {saved.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/45">Your saved questions</div>
            <div className="flex flex-col gap-1.5">
              {saved.map((q) => (
                <div key={q} className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => ask(q)}
                    className="min-w-0 flex-1 truncate rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-left text-xs text-white/80 hover:border-pitch/40 hover:text-white answer-press"
                  >
                    {q}
                  </button>
                  <button
                    type="button"
                    onClick={() => forget(q)}
                    aria-label={`Forget "${q}"`}
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/40 hover:bg-white/[0.05] hover:text-danger"
                  >
                    <IconClose className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {starters.length > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/45">Starter ideas</div>
            <div className="flex flex-wrap gap-1.5">
              {starters.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setText(q)}
                  className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] text-white/70 hover:border-pitch/40 hover:text-white answer-press"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
