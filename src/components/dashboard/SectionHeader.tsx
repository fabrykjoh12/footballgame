import type { ReactNode } from 'react';

/** A section label: uppercase eyebrow + optional title, with an optional action. */
export function SectionHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-bone-faint">{eyebrow}</div>
        {title && <h2 className="mt-1 text-xl font-bold tracking-tight text-bone">{title}</h2>}
      </div>
      {action}
    </div>
  );
}
