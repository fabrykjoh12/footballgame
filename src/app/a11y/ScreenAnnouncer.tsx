import { useMatch } from '../providers/MatchProvider.tsx';
import { describePhase } from './describePhase.ts';

/**
 * A visually hidden live region that announces the current match phase to
 * assistive technology. Centralises screen-reader awareness so individual
 * screens don't each need to manage announcements.
 */
export function ScreenAnnouncer() {
  const { state } = useMatch();
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {describePhase(state)}
    </div>
  );
}
