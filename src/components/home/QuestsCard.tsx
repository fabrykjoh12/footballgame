import { getDailyQuests } from '../../lib/quests';
import { Card } from '../ui/Card';

/**
 * Daily quests board on the home "Today" section — three rotating goals that push
 * the player across modes. Reads the pure `quests` lib; progress is derived from
 * the day's baseline + live daily state, so it stays accurate without any
 * recording-site changes.
 */
export function QuestsCard() {
  const quests = getDailyQuests();
  if (quests.length === 0) return null;
  const done = quests.filter((q) => q.complete).length;
  const allDone = done === quests.length;

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>🎯</span>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-white/70">
            Daily quests
          </h3>
        </div>
        <span
          className={[
            'nums rounded-full border px-2.5 py-0.5 text-xs font-bold',
            allDone
              ? 'border-pitch/30 bg-pitch/10 text-pitch'
              : 'border-white/10 bg-white/5 text-white/60',
          ].join(' ')}
        >
          {done}/{quests.length}
        </span>
      </div>

      <ul className="flex flex-col gap-2">
        {quests.map(({ quest, current, complete }) => {
          const pct = Math.round((current / quest.target) * 100);
          return (
            <li key={quest.id} className="flex items-center gap-3">
              <span
                className={[
                  'grid h-7 w-7 shrink-0 place-items-center rounded-lg text-sm',
                  complete ? 'bg-pitch/20 text-pitch' : 'bg-white/10',
                ].join(' ')}
                aria-hidden
              >
                {complete ? '✓' : quest.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div
                  className={[
                    'truncate text-sm font-medium',
                    complete ? 'text-white/45 line-through' : 'text-white/85',
                  ].join(' ')}
                >
                  {quest.label}
                </div>
                {quest.target > 1 && (
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={['h-full rounded-full transition-[width] duration-500', complete ? 'bg-pitch' : 'bg-pitch/60'].join(' ')}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
              {quest.target > 1 && (
                <span className="nums shrink-0 text-[11px] font-semibold text-white/45">
                  {current}/{quest.target}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {allDone && (
        <p className="mt-3 text-center text-xs font-semibold text-pitch">
          🎉 All quests done — back tomorrow for three more.
        </p>
      )}
    </Card>
  );
}
