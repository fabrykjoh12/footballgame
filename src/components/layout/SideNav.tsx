/**
 * Sidebar navigation — Home plus the grouped game modes, sharing icons/labels
 * with the home dashboard via the central mode catalogue.
 */
import { Home, type LucideIcon } from 'lucide-react';
import { SidebarItem } from './SidebarItem';
import { VERSUS_MODES, DAILY_MODES, SOLO_MODES, COMPETE_MODES } from '../dashboard/modes';
import type { View } from '../../lib/viewRoute';

interface NavItem {
  view: View;
  label: string;
  icon: LucideIcon;
}

interface NavGroup {
  heading?: string;
  items: NavItem[];
}

const toItems = (modes: { view: View; label: string; icon: LucideIcon }[]): NavItem[] =>
  modes.map((m) => ({ view: m.view, label: m.label, icon: m.icon }));

const GROUPS: NavGroup[] = [
  { items: [{ view: 'home', label: 'Home', icon: Home }] },
  { heading: 'Head to head', items: toItems(VERSUS_MODES) },
  { heading: 'Daily', items: toItems(DAILY_MODES) },
  { heading: 'Solo', items: toItems(SOLO_MODES) },
  { heading: 'Compete', items: toItems(COMPETE_MODES) },
];

export function SideNav({
  view,
  onNavigate,
}: {
  view: View;
  onNavigate: (view: View) => void;
}) {
  return (
    <nav className="flex flex-col gap-5" aria-label="Game modes">
      {GROUPS.map((group, gi) => (
        <div key={group.heading ?? `g${gi}`} className="flex flex-col gap-1">
          {group.heading && (
            <div className="mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.16em] text-bone-faint">
              {group.heading}
            </div>
          )}
          {group.items.map((item) => (
            <SidebarItem
              key={item.view}
              icon={item.icon}
              label={item.label}
              active={view === item.view}
              onClick={() => onNavigate(item.view)}
            />
          ))}
        </div>
      ))}
    </nav>
  );
}
