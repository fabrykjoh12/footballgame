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
  type CareerState,
} from '../../lib/career';
import { teamName } from '../../lib/teamName';
import { teamIdentity } from '../../lib/teamIdentity';
import { LeagueTable } from './LeagueTable';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  IconTrophy,
  IconArrowRight,
  IconBack,
  IconBolt,
  IconRoute,
  IconClock,
} from '../ui/icons';

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
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onExit}
          className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
        >
          <IconBack className="h-4 w-4" /> Home
        </button>
        <Badge tone="gold">
          <IconTrophy className="h-3.5 w-3.5" /> Season {career.season}
        </Badge>
      </div>

      {/* Division card */}
      <Card strong glow className="p-5 text-center animate-rise-in">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/40">
          Now managing
        </div>
        <div className="mt-1 font-display text-2xl font-bold text-gradient-pitch">
          {teamName(career.managerName)}
        </div>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm">
          <IconRoute className="h-4 w-4 text-pitch" />
          <span className="font-semibold">{division.name}</span>
        </div>
        {you && (
          <div className="mt-4 grid grid-cols-4 gap-2">
            <MiniStat value={position > 0 ? `${ordinal(position)}` : '—'} label="Position" />
            <MiniStat value={String(you.points)} label="Points" />
            <MiniStat value={`${you.won}-${you.drawn}-${you.lost}`} label="W-D-L" />
            <MiniStat value={`${career.round}/${ROUNDS_PER_SEASON}`} label="Played" />
          </div>
        )}
      </Card>

      {/* Season-over / champion panel, or the next fixture */}
      {seasonOver ? (
        <SeasonSummary career={career} onStartNext={startNext} disabled={connecting} />
      ) : fixture ? (
        <Card className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <IconClock className="h-5 w-5 text-pitch" />
            <h2 className="text-sm font-semibold uppercase tracking-wide text-white/80">
              Next fixture — Round {career.round + 1}
            </h2>
          </div>
          <div className="mb-4 flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <ClubChip name={career.managerName} you />
            <span className="font-display text-lg font-bold text-white/40">vs</span>
            <ClubChip name={fixture.opponent.name} />
          </div>
          <p className="mb-3 text-center text-xs text-white/45">
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
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
          {division.name} table
        </h2>
        <LeagueTable state={career} />
      </Card>

      {/* Trophy cabinet */}
      {career.trophies.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-white/70">
            Trophy cabinet
          </h2>
          <div className="flex flex-col gap-2">
            {career.trophies.map((t, i) => (
              <div
                key={i}
                className="flex items-center gap-2 rounded-lg border border-gold/20 bg-gold/[0.06] px-3 py-2 text-sm"
              >
                <IconTrophy className="h-4 w-4 text-gold" />
                <span className="font-semibold text-white/90">{t.label}</span>
                <span className="ml-auto text-xs text-white/40">Season {t.season}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <button
        type="button"
        onClick={abandon}
        className="mx-auto text-[11px] text-white/25 hover:text-danger"
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
      <p className="mx-auto mt-3 max-w-sm text-balance font-semibold text-white/90">
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
      <button
        type="button"
        onClick={onExit}
        className="inline-flex items-center gap-1.5 self-start text-sm text-white/50 hover:text-white"
      >
        <IconBack className="h-4 w-4" /> Home
      </button>

      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/60">
          <IconTrophy className="h-3.5 w-3.5 text-gold" /> Singleplayer
        </div>
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          <span className="text-gradient-pitch">Career Mode</span>
        </h1>
        <p className="mx-auto mt-3 max-w-md text-balance text-white/60">
          Start in League Two and climb the pyramid season by season. Win your
          fixtures, top the table, earn promotion — and chase the Premier League
          title. The higher you rise, the harder the questions.
        </p>
      </div>

      <Card strong className="mx-auto w-full max-w-md p-6 animate-rise-in">
        <label
          htmlFor="career-name"
          className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/50"
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
          <p className="mb-4 text-center text-xs text-white/45">
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

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-center">
      <div className="font-display text-lg font-bold text-pitch">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-white/40">
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
      {you && <span className="text-[10px] uppercase tracking-wide text-pitch">You</span>}
    </div>
  );
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
