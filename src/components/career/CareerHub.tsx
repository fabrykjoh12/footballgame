import { useState } from 'react';
import { useGame } from '../../context/GameProvider';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import {
  createCareer,
  getCareer,
  saveCareer,
  clearCareer,
  startNextSeason,
  currentFixture,
  careerMatchSettings,
  divisionByTier,
  computeStandings,
  yourPosition,
  ROUNDS_PER_SEASON,
  PROMOTION_SPOTS,
  RELEGATION_SPOTS,
  TEAMS_PER_DIVISION,
  TOP_TIER,
  BOTTOM_TIER,
  type CareerState,
} from '../../lib/career';
import {
  seasonObjectives,
  boardConfidence,
  managerReputation,
  seasonRival,
  rivalProfile,
  type Objective,
} from '../../lib/careerProgression';
import { seasonStorylines, type StoryTone } from '../../lib/careerStorylines';
import { teamName } from '../../lib/teamName';
import { teamIdentity } from '../../lib/teamIdentity';
import { LeagueTable } from './LeagueTable';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  IconTrophy,
  IconArrowRight,
  IconBolt,
  IconRoute,
  IconClock,
} from '../ui/icons';
import { ModeHeroBanner } from '../dashboard/ModeHeroBanner';
import { modeTheme } from '../dashboard/modeTheme';

export function CareerHub({ onExit }: { onExit: () => void }) {
  const { playCareer, connecting } = useGame();
  const [name, setName] = useLocalStorage('bk_name', '');
  const [career, setCareer] = useState<CareerState | null>(() => getCareer());

  if (!career) {
    return (
      <NewCareer
        name={name}
        setName={setName}
        onStart={() => {
          const created = saveCareer(createCareer(name.trim() || 'You', Date.now() >>> 0));
          setCareer(created);
        }}
        onExit={onExit}
      />
    );
  }

  const division = divisionByTier(career.tier);
  const fixture = currentFixture(career);
  const position = yourPosition(career);
  const table = computeStandings(career);
  const you = table.find((r) => r.team.isYou);
  const seasonOver = career.status !== 'in_season';

  // Promotion / relegation stakes — same rules the league table draws.
  const showPromotion = career.tier > TOP_TIER;
  const showRelegation = career.tier < BOTTOM_TIER;
  const inPromotion = showPromotion && position > 0 && position <= PROMOTION_SPOTS;
  const inRelegation =
    showRelegation && position > TEAMS_PER_DIVISION - RELEGATION_SPOTS;
  const kit = teamIdentity(career.managerName);

  const startNext = () => {
    const next = saveCareer(startNextSeason(career));
    setCareer(next);
  };

  const abandon = () => {
    clearCareer();
    setCareer(null);
  };

  const play = () => {
    if (!fixture) return;
    playCareer(career.managerName, fixture.opponent.name, careerMatchSettings(career));
  };

  return (
    <div className="flex flex-col gap-4 py-4 animate-fade-in">
      {/* Header */}
      <ModeHeroBanner
        theme={modeTheme('career')!}
        onBack={onExit}
        compact
        right={
          <Badge tone="gold">
            <IconTrophy className="h-3.5 w-3.5" /> Season {career.season}
          </Badge>
        }
      />

      {/* Division card — manager dashboard header */}
      <Card strong glow className="relative overflow-hidden p-5 text-center animate-rise-in">
        <div className="relative">
          <div className="text-[11px] font-bold text-white/55">
            Now managing
          </div>
          <div className="mt-2 flex items-center justify-center gap-2.5">
            <span
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl font-display text-base font-black"
              style={{
                backgroundColor: kit.soft,
                color: kit.color,
                boxShadow: `inset 0 0 0 2px ${kit.ring}`,
              }}
              aria-hidden
            >
              {career.managerName.charAt(0).toUpperCase()}
            </span>
            <span className="font-display text-2xl font-bold text-gradient-pitch">
              {teamName(career.managerName)}
            </span>
          </div>
          <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-sm">
            <IconRoute className="h-4 w-4 text-pitch" />
            <span className="font-semibold">{division.name}</span>
          </div>
          {you && (
            <>
              <div className="mt-4 grid grid-cols-4 gap-2">
                <MiniStat
                  value={position > 0 ? ordinal(position) : '—'}
                  label="Position"
                  tone={inPromotion ? 'pitch' : inRelegation ? 'danger' : 'white'}
                />
                <MiniStat value={String(you.points)} label="Points" />
                <MiniStat value={`${you.won}-${you.drawn}-${you.lost}`} label="W-D-L" />
                <MiniStat value={`${career.round}/${ROUNDS_PER_SEASON}`} label="Played" />
              </div>
              {(inPromotion || inRelegation) && (
                <div
                  className={[
                    'mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
                    inPromotion
                      ? 'border-pitch/40 bg-pitch/10 text-pitch'
                      : 'border-danger/40 bg-danger/10 text-danger',
                  ].join(' ')}
                >
                  {inPromotion ? '⬆️ In the promotion places' : '⬇️ In the relegation zone'}
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Season storylines — the narrative beats of the campaign */}
      <StorylineCard career={career} />

      {/* Board: manager reputation, confidence + season objectives */}
      <BoardCard career={career} />

      {/* Season-over / champion panel, or the next fixture */}
      {seasonOver ? (
        <SeasonSummary career={career} onStartNext={startNext} disabled={connecting} />
      ) : fixture ? (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <IconClock className="h-5 w-5 text-pitch" />
            <h2 className="nums text-sm font-semibold text-white/85">
              Next fixture — Round {career.round + 1}
            </h2>
          </div>
          <div className="relative mb-4 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <div className="relative flex items-center justify-center gap-3">
              <ClubChip name={career.managerName} you />
              <span className="font-display text-lg font-black italic text-white/40">VS</span>
              <ClubChip name={fixture.opponent.name} />
            </div>
          </div>
          {(() => {
            const rival = seasonRival(career);
            const isDerby = rival?.id === fixture.opponent.id;
            const profile = rivalProfile(fixture.opponent, career.seed);
            return (
              <div className="mb-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-center">
                {isDerby && (
                  <Badge tone="danger" className="mb-1.5">
                    🔥 Rivalry match
                  </Badge>
                )}
                <div className="text-xs font-semibold text-white/65">
                  {profile.playStyle}
                </div>
                <div className="mt-0.5 text-[11px] text-white/55">{profile.personality}</div>
              </div>
            );
          })()}
          <p className="mb-3 text-center text-xs text-white/55">
            {division.mode === 'nightmare'
              ? 'Top-flight football — nightmare questions, fast clock.'
              : division.mode === 'serious'
                ? 'The questions get serious at this level.'
                : 'A friendly start to your climb.'}
          </p>
          <Button fullWidth size="lg" disabled={connecting} onClick={play}>
            <IconBolt className="h-4 w-4" /> Play match
          </Button>
        </Card>
      ) : null}

      {/* League table */}
      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold text-white/65">
          {division.name} table
        </h2>
        <LeagueTable state={career} />
      </Card>

      {/* Trophy cabinet */}
      {career.trophies.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold text-white/65">
            Trophy cabinet
          </h2>
          <div className="flex flex-col gap-2">
            {career.trophies.map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-gold/20 bg-gold/[0.06] px-3 py-2 text-sm"
              >
                <IconTrophy className="h-4 w-4 text-gold" />
                <span className="font-semibold text-white">{t.label}</span>
                <span className="nums ml-auto text-xs text-white/55">Season {t.season}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <button
        type="button"
        onClick={abandon}
        className="mx-auto text-[11px] text-white/40 hover:text-danger"
      >
        Abandon career & start over
      </button>
    </div>
  );
}

function SeasonSummary({
  career,
  onStartNext,
  disabled,
}: {
  career: CareerState;
  onStartNext: () => void;
  disabled: boolean;
}) {
  const outcome = career.lastOutcome;
  const division = divisionByTier(career.tier);
  const champion = outcome?.wonTitle;

  let headline = `You finished ${outcome ? ordinal(outcome.position) : ''} in ${division.name}.`;
  let tone: 'pitch' | 'gold' | 'danger' | 'muted' = 'muted';
  if (champion) {
    headline = '🏆 Champions of England! You conquered the Premier League.';
    tone = 'gold';
  } else if (outcome?.promoted) {
    headline = `⬆️ Promoted! Up to ${divisionByTier(outcome.toTier).name} next season.`;
    tone = 'pitch';
  } else if (outcome?.relegated) {
    headline = `⬇️ Relegated to ${divisionByTier(outcome.toTier).name}. Bounce straight back.`;
    tone = 'danger';
  }

  return (
    <Card strong glow className="p-5 text-center animate-rise-in">
      <Badge tone={tone === 'muted' ? 'muted' : tone}>Season {career.season} complete</Badge>
      <p className="mx-auto mt-3 max-w-sm text-balance font-semibold text-white">
        {headline}
      </p>
      <div className="mt-4">
        <Button fullWidth size="lg" variant={champion ? 'gold' : 'primary'} disabled={disabled} onClick={onStartNext}>
          {champion ? 'Defend the title' : 'Start next season'}{' '}
          <IconArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

function NewCareer({
  name,
  setName,
  onStart,
  onExit,
}: {
  name: string;
  setName: (v: string) => void;
  onStart: () => void;
  onExit: () => void;
}) {
  const valid = name.trim().length >= 1;
  return (
    <div className="flex flex-1 flex-col justify-center gap-6 py-6 animate-fade-in">
      <ModeHeroBanner theme={modeTheme('career')!} onBack={onExit} />

      <Card strong className="mx-auto w-full max-w-md p-6 animate-rise-in">
        <label
          htmlFor="career-name"
          className="mb-2 block text-xs font-semibold text-white/55"
        >
          Manager / club name
        </label>
        <input
          id="career-name"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 18))}
          placeholder="e.g. Sara"
          autoComplete="off"
          className="input-field mb-2 text-base"
        />
        {valid && (
          <p className="mb-4 text-center text-xs text-white/55">
            You’ll manage{' '}
            <span className="font-semibold text-pitch">{teamName(name)}</span>
          </p>
        )}
        <Button fullWidth size="lg" disabled={!valid} onClick={onStart}>
          <IconBolt className="h-4 w-4" /> Begin in League Two
        </Button>
      </Card>
    </div>
  );
}

const STORY_TONE: Record<StoryTone, { border: string; chip: string; text: string }> = {
  derby: { border: 'border-gold/40', chip: 'bg-gold/15 text-gold', text: 'text-gold' },
  promotion: { border: 'border-pitch/40', chip: 'bg-pitch/15 text-pitch', text: 'text-pitch' },
  relegation: { border: 'border-danger/40', chip: 'bg-danger/15 text-danger', text: 'text-danger' },
  title: { border: 'border-gold/40', chip: 'bg-gold/15 text-gold', text: 'text-gold' },
  pressure: { border: 'border-danger/40', chip: 'bg-danger/15 text-danger', text: 'text-danger' },
  form: { border: 'border-white/15', chip: 'bg-white/10 text-white/80', text: 'text-white/80' },
  neutral: { border: 'border-white/12', chip: 'bg-white/10 text-white/70', text: 'text-white/75' },
};

/** The season's narrative beats — the top couple of storylines, most urgent first. */
function StorylineCard({ career }: { career: CareerState }) {
  const stories = seasonStorylines(career).slice(0, 2);
  if (stories.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      {stories.map((s) => {
        const tone = STORY_TONE[s.tone];
        return (
          <div
            key={s.id}
            className={['rounded-xl border bg-white/[0.02] p-3.5 animate-rise-in', tone.border].join(' ')}
          >
            <div className="flex items-center gap-2">
              <span className={['rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', tone.chip].join(' ')}>
                Storyline
              </span>
              <h3 className={['font-display text-sm font-bold', tone.text].join(' ')}>{s.headline}</h3>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-white/60">{s.detail}</p>
          </div>
        );
      })}
    </div>
  );
}

function BoardCard({ career }: { career: CareerState }) {
  const objectives = seasonObjectives(career);
  const confidence = boardConfidence(career);
  const rep = managerReputation(career);

  const meterColor =
    confidence.value >= 70 ? 'bg-pitch' : confidence.value >= 45 ? 'bg-gold' : 'bg-danger';

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-white/65">
          The boardroom
        </h2>
        <Badge tone="gold">
          Lv {rep.level} · {rep.title}
        </Badge>
      </div>

      {/* Board confidence meter */}
      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-[11px] text-white/55">
          <span>Board confidence</span>
          <span className="font-semibold text-white/70">
            {confidence.label} · <span className="nums">{confidence.value}</span>
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className={['h-full rounded-full transition-[width] duration-500', meterColor].join(' ')}
            style={{ width: `${confidence.value}%` }}
            role="img"
            aria-label={`Board confidence ${confidence.value} out of 100`}
          />
        </div>
      </div>

      {/* Season objectives */}
      <div className="space-y-1.5">
        {objectives.map((o) => (
          <ObjectiveRow key={o.id} objective={o} />
        ))}
      </div>
    </Card>
  );
}

function ObjectiveRow({ objective }: { objective: Objective }) {
  const icon = objective.status === 'met' ? '✅' : objective.status === 'failed' ? '❌' : '◻️';
  const tone =
    objective.status === 'met'
      ? 'text-pitch'
      : objective.status === 'failed'
        ? 'text-danger'
        : 'text-white/65';
  return (
    <div className="flex items-center gap-2 text-sm">
      <span aria-hidden>{icon}</span>
      <span className={['min-w-0 flex-1 truncate', tone].join(' ')}>{objective.label}</span>
      {objective.progress && (
        <span className="shrink-0 font-mono text-[11px] text-white/55">{objective.progress}</span>
      )}
    </div>
  );
}

function MiniStat({
  value,
  label,
  tone = 'pitch',
}: {
  value: string;
  label: string;
  tone?: 'pitch' | 'danger' | 'white';
}) {
  const color = tone === 'danger' ? 'text-danger' : tone === 'white' ? 'text-white' : 'text-pitch';
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center">
      <div className={`nums font-display text-lg font-bold ${color}`}>{value}</div>
      <div className="mt-0.5 text-[11px] text-white/55">
        {label}
      </div>
    </div>
  );
}

function ClubChip({ name, you = false }: { name: string; you?: boolean }) {
  const kit = teamIdentity(name);
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <span
        aria-hidden
        className="h-8 w-8 rounded-full ring-2"
        style={{ backgroundColor: kit.soft, borderColor: kit.color, boxShadow: `inset 0 0 0 2px ${kit.color}` }}
      />
      <span className="text-center text-sm font-semibold leading-tight">
        {teamName(name)}
      </span>
      {you && <span className="text-[11px] text-pitch">You</span>}
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
