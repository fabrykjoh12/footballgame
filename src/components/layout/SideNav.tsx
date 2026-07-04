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
  return (
    <nav className="flex flex-col gap-5" aria-label="Game modes">
      {NAV.map((group, gi) => (
        <div key={group.heading ?? `g${gi}`} className="flex flex-col gap-1">
          {group.heading && (
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-white/35">
              {group.heading}
            </div>
          )}
          {group.items.map((item) => {
            const active = view === item.view;
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => onNavigate(item.view)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  active
                    ? 'bg-royal/15 font-semibold text-white ring-1 ring-inset ring-royal/30'
                    : 'font-medium text-white/60 hover:bg-white/[0.05] hover:text-white',
                ].join(' ')}
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center text-base" aria-hidden>
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
