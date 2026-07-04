import type { MotifKey } from './modeTheme';

/**
 * Hand-illustrated hero artwork per mode — richly layered SVG scenes (gradients,
 * glow, depth) drawn entirely in code, so every banner ships premium art with
 * zero external assets and zero network dependency. One scene per motif key,
 * tinted by the mode's accent colours.
 *
 * Rendered behind the banner's legibility scrim, so scenes lean toward the
 * right/centre where the copy doesn't sit.
 */
export function ModeArt({ motif, color, color2 }: { motif: MotifKey; color: string; color2: string }) {
  // Unique gradient/filter ids per motif so multiple banners never collide.
  const id = (s: string) => `art-${motif}-${s}`;
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 400"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <defs>
        <filter id={id('glow')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id={id('soft')} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        <radialGradient id={id('halo')} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.55" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {motif === 'radar' && <Radar id={id} color={color} color2={color2} />}
      {motif === 'corkboard' && <Corkboard id={id} color={color} color2={color2} />}
      {motif === 'nodes' && <Nodes id={id} color={color} color2={color2} />}
      {motif === 'timeline' && <Timeline id={id} color={color} color2={color2} />}
      {motif === 'spotlights' && <Spotlights id={id} color={color} color2={color2} />}
      {motif === 'chalkboard' && <Chalkboard id={id} color={color} color2={color2} />}
      {motif === 'bracket' && <Bracket id={id} color={color} color2={color2} />}
      {motif === 'pitch' && <Pitch id={id} color={color} color2={color2} />}
      {motif === 'pulse' && <Pulse id={id} color={color} color2={color2} />}
    </svg>
  );
}

type Parts = { id: (s: string) => string; color: string; color2: string };

/* ---- The Scout: a radar / sonar scope sweeping for targets ---- */
function Radar({ id, color, color2 }: Parts) {
  const cx = 880;
  const cy = 150;
  return (
    <g>
      <circle cx={cx} cy={cy} r="260" fill={`url(#${id('halo')})`} />
      {/* faint scanning grid */}
      <g stroke={color} strokeWidth="1" opacity="0.12">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <line key={i} x1={520 + i * 110} y1="0" x2={520 + i * 110} y2="400" />
        ))}
        {[0, 1, 2, 3].map((i) => (
          <line key={`h${i}`} x1="500" y1={i * 110} x2="1200" y2={i * 110} />
        ))}
      </g>
      {/* concentric rings */}
      <g stroke={color} fill="none" opacity="0.5">
        {[60, 120, 185, 250].map((r) => (
          <circle key={r} cx={cx} cy={cy} r={r} strokeWidth="1.5" opacity="0.5" />
        ))}
        <line x1={cx - 250} y1={cy} x2={cx + 250} y2={cy} strokeWidth="1" opacity="0.35" />
        <line x1={cx} y1={cy - 250} x2={cx} y2={cy + 250} strokeWidth="1" opacity="0.35" />
      </g>
      {/* sweep wedge */}
      <defs>
        <linearGradient id={id('sweep')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.45" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`M${cx} ${cy} L${cx} ${cy - 250} A250 250 0 0 1 ${cx + 218} ${cy - 125} Z`} fill={`url(#${id('sweep')})`} />
      <line x1={cx} y1={cy} x2={cx + 218} y2={cy - 125} stroke={color} strokeWidth="2" opacity="0.7" filter={`url(#${id('glow')})`} />
      {/* target blips */}
      {[[cx + 90, cy - 150, 4], [cx - 130, cy + 80, 3], [cx + 160, cy + 60, 3.5], [cx - 60, cy - 60, 2.5]].map(
        ([x, y, r], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={i === 0 ? color2 : color} filter={`url(#${id('glow')})`} />
        ),
      )}
    </g>
  );
}

/* ---- Mystery Duel: a detective evidence board with pins, string, magnifier ---- */
function Corkboard({ id, color, color2 }: Parts) {
  const pins: Array<[number, number, number]> = [
    [560, 90, -6],
    [720, 220, 4],
    [880, 110, -3],
    [1010, 250, 5],
    [640, 320, -4],
  ];
  return (
    <g>
      <circle cx="960" cy="180" r="240" fill={`url(#${id('halo')})`} opacity="0.7" />
      {/* red string connecting evidence */}
      <g stroke={color2} strokeWidth="1.5" opacity="0.45">
        <line x1="560" y1="90" x2="720" y2="220" />
        <line x1="720" y1="220" x2="880" y2="110" />
        <line x1="880" y1="110" x2="1010" y2="250" />
        <line x1="720" y1="220" x2="640" y2="320" />
      </g>
      {/* pinned note cards */}
      {pins.map(([x, y, rot], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${rot})`}>
          <rect x="-42" y="-30" width="84" height="60" rx="3" fill={color} fillOpacity="0.08" stroke={color} strokeOpacity="0.4" strokeWidth="1" />
          <line x1="-30" y1="-14" x2="30" y2="-14" stroke={color} strokeOpacity="0.3" strokeWidth="1" />
          <line x1="-30" y1="-2" x2="20" y2="-2" stroke={color} strokeOpacity="0.25" strokeWidth="1" />
          <line x1="-30" y1="10" x2="26" y2="10" stroke={color} strokeOpacity="0.25" strokeWidth="1" />
          <circle cx="0" cy="-30" r="4" fill={color2} filter={`url(#${id('glow')})`} />
        </g>
      ))}
      {/* magnifier */}
      <g transform="translate(1050 130)" filter={`url(#${id('glow')})`}>
        <circle cx="0" cy="0" r="52" fill={color} fillOpacity="0.06" stroke={color} strokeWidth="4" strokeOpacity="0.85" />
        <path d="M-14 -20 A28 28 0 0 0 -20 -6" stroke={color} strokeWidth="3" strokeOpacity="0.5" fill="none" strokeLinecap="round" />
        <line x1="37" y1="37" x2="78" y2="78" stroke={color} strokeWidth="9" strokeOpacity="0.85" strokeLinecap="round" />
      </g>
    </g>
  );
}

/* ---- Connections: a constellation of clubs/nations linked by a player ---- */
function Nodes({ id, color, color2 }: Parts) {
  const nodes: Array<[number, number, number]> = [
    [560, 120, 5],
    [700, 300, 6],
    [820, 90, 7],
    [900, 230, 10],
    [1040, 130, 6],
    [1080, 300, 5],
    [640, 210, 4],
    [980, 340, 4],
  ];
  const edges: Array<[number, number]> = [
    [0, 6],
    [6, 1],
    [1, 3],
    [3, 2],
    [2, 4],
    [3, 4],
    [3, 7],
    [4, 5],
    [1, 7],
  ];
  return (
    <g>
      <circle cx="900" cy="220" r="260" fill={`url(#${id('halo')})`} opacity="0.6" />
      <g stroke={color} strokeWidth="1.4" opacity="0.4">
        {edges.map(([a, b], i) => (
          <line key={i} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} />
        ))}
      </g>
      {nodes.map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r + 8} fill={i === 3 ? color2 : color} opacity="0.12" filter={`url(#${id('soft')})`} />
          <circle cx={x} cy={y} r={r} fill={i === 3 ? color2 : color} filter={`url(#${id('glow')})`} />
        </g>
      ))}
    </g>
  );
}

/* ---- Career Path: a winding transfer trail rising through waypoints ---- */
function Timeline({ id, color, color2 }: Parts) {
  const stops: Array<[number, number]> = [
    [540, 330],
    [680, 250],
    [820, 290],
    [950, 180],
    [1080, 120],
  ];
  const d = `M${stops[0][0]} ${stops[0][1]} Q620 300 ${stops[1][0]} ${stops[1][1]} T${stops[2][0]} ${stops[2][1]} Q890 250 ${stops[3][0]} ${stops[3][1]} T${stops[4][0]} ${stops[4][1]}`;
  return (
    <g>
      <circle cx="1050" cy="150" r="230" fill={`url(#${id('halo')})`} opacity="0.6" />
      <path d={d} stroke={color} strokeWidth="3" opacity="0.35" strokeDasharray="2 10" strokeLinecap="round" filter={`url(#${id('glow')})`} />
      {stops.map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`} filter={`url(#${id('glow')})`}>
          <path
            d="M0 8 C-11 -4 -11 -18 0 -22 C11 -18 11 -4 0 8 Z"
            fill={i === stops.length - 1 ? color2 : color}
            fillOpacity={i === stops.length - 1 ? 0.9 : 0.5}
            stroke={i === stops.length - 1 ? color2 : color}
            strokeWidth="1.5"
          />
          <circle cx="0" cy="-14" r="3.5" fill="#0b0d10" />
        </g>
      ))}
    </g>
  );
}

/* ---- Older or Younger: stadium floodlights under the night sky ---- */
function Spotlights({ id, color, color2 }: Parts) {
  return (
    <g>
      <defs>
        <linearGradient id={id('beam')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={id('beam2')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color2} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color2} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* light beams */}
      <path d="M700 -30 L560 430 L900 430 Z" fill={`url(#${id('beam')})`} />
      <path d="M980 -30 L820 430 L1180 430 Z" fill={`url(#${id('beam2')})`} />
      <path d="M520 -30 L440 430 L700 430 Z" fill={`url(#${id('beam2')})`} opacity="0.7" />
      {/* floodlight rigs + flares */}
      {[[700, 0], [980, 0], [520, 0]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y + 6} r="60" fill={i === 1 ? color2 : color} opacity="0.5" filter={`url(#${id('soft')})`} />
          <circle cx={x} cy={y + 6} r="9" fill={i === 1 ? color2 : color} filter={`url(#${id('glow')})`} />
          <rect x={x - 34} y={y - 8} width="68" height="16" rx="3" fill={color} fillOpacity="0.18" stroke={color} strokeOpacity="0.4" />
        </g>
      ))}
    </g>
  );
}

/* ---- Managers: a tactics chalkboard with a formation and runs ---- */
function Chalkboard({ id, color, color2 }: Parts) {
  const dots: Array<[number, number]> = [
    [560, 200],
    [660, 110],
    [660, 200],
    [660, 290],
    [780, 150],
    [780, 250],
    [900, 110],
    [900, 200],
    [900, 290],
    [1030, 160],
    [1030, 240],
  ];
  return (
    <g>
      <circle cx="900" cy="200" r="250" fill={`url(#${id('halo')})`} opacity="0.5" />
      <defs>
        <marker id={id('arrow')} markerWidth="8" markerHeight="8" refX="5" refY="4" orient="auto">
          <path d="M0 0 L6 4 L0 8" fill="none" stroke={color2} strokeWidth="1.5" />
        </marker>
      </defs>
      {/* movement runs */}
      <g fill="none" opacity="0.55">
        <path d="M660 200 Q740 140 820 190" stroke={color2} strokeWidth="2" strokeDasharray="6 6" markerEnd={`url(#${id('arrow')})`} />
        <path d="M900 200 Q980 250 1050 210" stroke={color2} strokeWidth="2" strokeDasharray="6 6" markerEnd={`url(#${id('arrow')})`} />
        <path d="M780 250 Q860 330 960 300" stroke={color2} strokeWidth="2" strokeDasharray="6 6" markerEnd={`url(#${id('arrow')})`} />
      </g>
      {/* players */}
      {dots.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="9" fill={color} fillOpacity="0.18" stroke={color} strokeWidth="2" strokeOpacity="0.8" filter={`url(#${id('glow')})`} />
      ))}
    </g>
  );
}

/* ---- Cup Runs: a knockout bracket resolving into the trophy ---- */
function Bracket({ id, color, color2 }: Parts) {
  return (
    <g>
      <circle cx="1050" cy="200" r="230" fill={`url(#${id('halo')})`} />
      {/* bracket lines converging to the right */}
      <g stroke={color} strokeWidth="2" opacity="0.45" fill="none">
        {[80, 150, 250, 320].map((y, i) => (
          <path key={i} d={`M520 ${y} H610 V${y < 200 ? 130 : 270} H700`} opacity="0.5" />
        ))}
        <path d="M700 130 V200 H800" />
        <path d="M700 270 V200" />
        <path d="M800 200 H900" />
      </g>
      {/* seed dots */}
      {[80, 150, 250, 320].map((y, i) => (
        <circle key={i} cx="520" cy={y} r="4" fill={color} opacity="0.6" />
      ))}
      {/* trophy */}
      <g transform="translate(1010 175)" filter={`url(#${id('glow')})`}>
        {/* rays */}
        <g stroke={color2} strokeWidth="2" opacity="0.4">
          {[-60, -30, 0, 30, 60, 90, 120].map((a) => (
            <line key={a} x1="0" y1="0" x2={90 * Math.cos((a * Math.PI) / 180)} y2={90 * Math.sin((a * Math.PI) / 180)} />
          ))}
        </g>
        <path d="M-26 -34 H26 V-18 A26 26 0 0 1 -26 -18 Z" fill={color2} fillOpacity="0.85" stroke={color2} strokeWidth="1.5" />
        <path d="M-26 -30 C-46 -30 -46 -6 -26 -6" fill="none" stroke={color2} strokeWidth="3" />
        <path d="M26 -30 C46 -30 46 -6 26 -6" fill="none" stroke={color2} strokeWidth="3" />
        <rect x="-5" y="6" width="10" height="18" fill={color2} fillOpacity="0.85" />
        <rect x="-20" y="24" width="40" height="9" rx="2" fill={color2} fillOpacity="0.85" />
      </g>
    </g>
  );
}

/* ---- Career: an aerial floodlit pitch in perspective ---- */
function Pitch({ id, color, color2 }: Parts) {
  return (
    <g>
      <defs>
        <linearGradient id={id('grass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.16" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <circle cx="700" cy="40" r="240" fill={`url(#${id('halo')})`} opacity="0.5" />
      {/* warm floodlight wash from above */}
      <circle cx="980" cy="20" r="150" fill={color2} opacity="0.14" filter={`url(#${id('soft')})`} />
      {/* pitch in perspective (trapezoid) */}
      <path d="M470 380 L560 90 L1140 90 L1200 380 Z" fill={`url(#${id('grass')})`} stroke={color} strokeOpacity="0.4" strokeWidth="2" />
      {/* mow stripes */}
      <g fill={color} opacity="0.05">
        <path d="M470 380 L560 90 L680 90 L620 380 Z" />
        <path d="M760 380 L800 90 L920 90 L900 380 Z" />
        <path d="M1040 380 L1020 90 L1140 90 L1200 380 Z" />
      </g>
      {/* halfway line + centre circle */}
      <g stroke={color} strokeOpacity="0.4" strokeWidth="2" fill="none">
        <line x1="515" y1="235" x2="1170" y2="235" />
        <ellipse cx="840" cy="235" rx="95" ry="40" />
        {/* penalty boxes */}
        <path d="M560 90 L560 140 L720 140 L720 90" />
        <path d="M1140 90 L1140 140 L980 140 L980 90" />
      </g>
      <circle cx="840" cy="235" r="4" fill={color} opacity="0.6" />
    </g>
  );
}

/* ---- Arcade: a neon equaliser / heartbeat pulse ---- */
function Pulse({ id, color, color2 }: Parts) {
  return (
    <g>
      <circle cx="850" cy="200" r="250" fill={`url(#${id('halo')})`} opacity="0.5" />
      {/* EQ bars */}
      <g>
        {[520, 580, 640, 700, 760, 820, 880, 940, 1000, 1060, 1120].map((x, i) => {
          const h = [60, 120, 80, 170, 100, 210, 130, 180, 90, 150, 70][i];
          return (
            <rect key={x} x={x - 12} y={235 - h / 2} width="24" height={h} rx="6" fill={i % 3 === 0 ? color2 : color} opacity="0.35" />
          );
        })}
      </g>
      {/* heartbeat line */}
      <path
        d="M480 235 H620 L650 160 L690 320 L730 120 L760 235 H900 L930 190 L960 280 L990 235 H1160"
        stroke={color}
        strokeWidth="3"
        fill="none"
        opacity="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#${id('glow')})`}
      />
      {/* combo rings */}
      {[[700, 235], [960, 235]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="30" stroke={color2} strokeWidth="2" opacity="0.4" fill="none" filter={`url(#${id('glow')})`} />
      ))}
    </g>
  );
}
