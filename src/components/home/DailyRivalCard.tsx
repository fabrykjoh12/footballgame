import { useEffect, useMemo, useState } from 'react';
import { getDailyState, hasPlayedToday } from '../../lib/dailyChallenge';
import {
  dailyRivalName,
  dailyFixtureLabel,
  dailyFixtureMood,
  msUntilNextDay,
  formatCountdown,
  buildDailyChallengeLink,
  buildDailyShareText,
  parseDailyChallengeParams,
  type DailyChallengeParams,
} from '../../lib/dailyRival';
import { todayString } from '../../lib/seededRandom';
import { CATEGORY_OPTIONS } from '../../lib/categories';
import { teamName } from '../../lib/teamName';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { IconClock, IconShare, IconCheck } from '../ui/icons';

const OUTCOME_LABEL = { win: 'Win', loss: 'Loss', draw: 'Draw' } as const;

/** The Daily Rival Match card: a named fictional fixture, one official attempt a
 * day, scoreline + best category, "beat my result" sharing, and a countdown. */
export function DailyRivalCard({
  name,
  connecting,
  onPlay,
}: {
  name: string;
  connecting: boolean;
  onPlay: (name: string) => void;
}) {
  const [daily] = useState(() => getDailyState());
  const today = todayString();
  const rival = useMemo(() => dailyRivalName(today), [today]);
  const fixture = useMemo(() => dailyFixtureLabel(today), [today]);
  const mood = useMemo(() => dailyFixtureMood(today), [today]);
  const playedToday = hasPlayedToday(daily, today);

  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(() => formatCountdown(msUntilNextDay()));

  // Live "next match in" countdown (only needed once today's match is done).
  useEffect(() => {
    if (!playedToday) return;
    const id = setInterval(() => setCountdown(formatCountdown(msUntilNextDay())), 30_000);
    return () => clearInterval(id);
  }, [playedToday]);

  // A challenge sent by a friend (?daily=…), if any.
  const incoming = useMemo<DailyChallengeParams | null>(
    () => parseDailyChallengeParams(window.location.search),
    [],
  );

  const bestCat =
    daily.lastBestCategory &&
    CATEGORY_OPTIONS.find((c) => c.id === daily.lastBestCategory)?.label;

  const share = async () => {
    const base = window.location.origin + window.location.pathname;
    const link = buildDailyChallengeLink(base, {
      date: today,
      goalsFor: daily.lastGoalsFor,
      goalsAgainst: daily.lastGoalsAgainst,
      score: daily.lastScore,
      by: name.trim() || undefined,
    });
    const text = buildDailyShareText({
      goalsFor: daily.lastGoalsFor,
      goalsAgainst: daily.lastGoalsAgainst,
      outcome: daily.lastOutcome ?? 'draw',
      bestCategory: daily.lastBestCategory,
      link,
    });
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* user dismissed the share sheet */
    }
  };

  return (
    <Card className="mx-auto w-full max-w-md p-4 animate-fade-in">
      <div className="mb-2 flex items-center gap-2">
        <IconClock className="h-5 w-5 text-gold" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
          Daily Rival
        </h2>
        {daily.streak > 0 && (
          <span className="ml-auto text-xs font-bold text-gold">🔥 {daily.streak}-day streak</span>
        )}
      </div>

      {/* Fixture header */}
      <div className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2.5">
        <div className="text-[10px] uppercase tracking-[0.15em] text-white/40">{fixture}</div>
        <div className="mt-0.5 font-display text-lg font-bold">
          {teamName(name.trim() || 'You')}{' '}
          <span className="text-white/40">vs</span>{' '}
          <span className="text-gold">{teamName(rival)}</span>
        </div>
        <div className="mt-0.5 text-xs text-white/50">{mood}</div>
      </div>

      {/* Incoming friend challenge */}
      {incoming && incoming.date === today && (
        <p className="mt-3 rounded-lg border border-pitch/30 bg-pitch/10 px-3 py-2 text-xs text-white/75">
          {incoming.by ? `${incoming.by} scored` : 'A friend scored'}{' '}
          <span className="font-bold text-pitch">
            {incoming.goalsFor}–{incoming.goalsAgainst}
          </span>{' '}
          ({incoming.score.toLocaleString()} pts) today. Beat it!
        </p>
      )}

      {playedToday ? (
        <>
          <div className="mt-3 flex items-center justify-between gap-2">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-white/40">Full time</div>
              <div className="font-display text-2xl font-bold">
                <span className="text-pitch">
                  {daily.lastGoalsFor}–{daily.lastGoalsAgainst}
                </span>{' '}
                {daily.lastOutcome && (
                  <Badge tone={daily.lastOutcome === 'win' ? 'pitch' : 'muted'}>
                    {OUTCOME_LABEL[daily.lastOutcome]}
                  </Badge>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wide text-white/40">Score</div>
              <div className="font-mono text-lg font-bold text-white/85">
                {daily.lastScore.toLocaleString()}
              </div>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/55">
            {bestCat && <Badge tone="pitch">Best: {bestCat}</Badge>}
            <span>Best ever: {daily.bestScore.toLocaleString()}</span>
            <span className="ml-auto">Next match in {countdown}</span>
          </div>

          <div className="mt-3 flex gap-2">
            <Button variant="secondary" fullWidth onClick={share}>
              {copied ? <IconCheck className="h-4 w-4 text-pitch" /> : <IconShare className="h-4 w-4" />}
              {copied ? 'Shared!' : 'Challenge a friend'}
            </Button>
            <Button
              variant="ghost"
              fullWidth
              disabled={connecting}
              onClick={() => onPlay(name.trim() || 'You')}
            >
              Practice
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 text-xs leading-relaxed text-white/55">
            The same 10 questions for everyone today — one official attempt.{' '}
            {daily.streak > 0
              ? `Keep your ${daily.streak}-day streak alive!`
              : 'Play each day to build a streak.'}
          </p>
          <div className="mt-3">
            <Button fullWidth disabled={connecting} onClick={() => onPlay(name.trim() || 'You')}>
              Kick off vs {teamName(rival)}
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
