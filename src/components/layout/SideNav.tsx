/**
 * The mode navigation used by the app shell — a grouped vertical list rendered
 * both in the desktop sidebar and the mobile slide-in drawer. Each item routes
 * to a top-level `View`; the active one is highlighted.
 */

import type { View } from '../../lib/viewRoute';

interface NavItem {
  view: View;
  label: string;
  icon: string;
}

interface NavGroup {
  heading?: string;
  items: NavItem[];
}

const NAV: NavGroup[] = [
  { items: [{ view: 'home', label: 'Home', icon: '🏠' }] },
  {
    heading: 'Modes',
    items: [
      { view: 'scout', label: 'The Scout', icon: '🔍' },
      { view: 'mystery', label: 'Mystery Duel', icon: '🕵️' },
      { view: 'connections', label: 'Connections', icon: '🔗' },
      { view: 'connectionsDaily', label: 'Daily Connections', icon: '📅' },
      { view: 'careerPath', label: 'Career Path', icon: '🧭' },
      { view: 'olderYounger', label: 'Older or Younger?', icon: '🎂' },
      { view: 'managers', label: 'Managers', icon: '🎩' },
      { view: 'modes', label: 'Arcade', icon: '⚡' },
    ],
  },
  {
    heading: 'Compete',
    items: [
      { view: 'career', label: 'Career', icon: '🏟️' },
      { view: 'cup', label: 'Cup Runs', icon: '🏆' },
    ],
  },
];

export function SideNav({
  view,
  onNavigate,
}: {
  view: View;
  /** Called with the chosen view (the shell navigates + closes the drawer). */
  onNavigate: (view: View) => void;
}) {
  let n = 0; // running catalogue index across all groups
  return (
    <nav className="flex flex-col gap-7" aria-label="Game modes">
      {NAV.map((group, gi) => (
        <div key={group.heading ?? `g${gi}`} className="flex flex-col">
          {group.heading && (
            <div className="mb-2 pl-4 font-mono text-[10px] uppercase tracking-[0.2em] text-bone-faint">
              {group.heading}
            </div>
          )}
          {group.items.map((item) => {
            const active = view === item.view;
            const num = String(n++).padStart(2, '0');
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => onNavigate(item.view)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex items-baseline gap-3 border-l-2 py-1.5 pl-3.5 pr-2 text-left transition-colors',
                  active
                    ? 'border-royal text-bone'
                    : 'border-transparent text-bone-dim hover:border-bone/30 hover:text-bone',
                ].join(' ')}
              >
                <span
                  className={[
                    'font-mono text-[10px] tabular-nums',
                    active ? 'text-royal' : 'text-bone-faint',
                  ].join(' ')}
                  aria-hidden
                >
                  {num}
                </span>
                <span className={active ? 'text-[15px] font-semibold' : 'text-[15px]'}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
