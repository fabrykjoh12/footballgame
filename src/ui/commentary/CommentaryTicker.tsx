/** Live text commentary feed — most recent line first, gently animated in. */
export function CommentaryTicker({ lines }: { lines: readonly string[] }) {
  const recent = lines.slice(-4).reverse();
  return (
    <div
      aria-live="polite"
      className="flex flex-col gap-1.5 rounded-xl border border-white/5 bg-black/20 p-3 text-sm"
    >
      {recent.length === 0 ? (
        <span className="text-ink-muted">Awaiting kickoff…</span>
      ) : (
        recent.map((line, i) => (
          <p
            key={`${lines.length}-${i}`}
            className={[
              'animate-fade-up',
              i === 0 ? 'font-medium text-ink' : 'text-ink-muted',
            ].join(' ')}
          >
            {line}
          </p>
        ))
      )}
    </div>
  );
}
