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
    <nav className="flex flex-col gap-6" aria-label="Game modes">
      {NAV.map((group, gi) => (
        <div key={group.heading ?? `g${gi}`} className="flex flex-col gap-0.5">
          {group.heading && (
            <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-white/55">
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
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                  active
                    ? 'bg-royal/10 font-semibold text-royal'
                    : 'font-medium text-white/65 hover:bg-white/[0.04] hover:text-white',
                ].join(' ')}
              >
                <span className="w-5 shrink-0 text-center text-base leading-none" aria-hidden>
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
