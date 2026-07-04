import type { MotifKey } from './modeTheme';

/**
 * Code-drawn atmospheric motif per mode — a subtle themed line-art layer that
 * gives each banner its own signature without any external art asset. Purely
 * decorative and low-opacity so UI stays readable.
 */
export function ModeMotif({ motif, color }: { motif: MotifKey; color: string }) {
  return (
    <svg
      aria-hidden
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 400 160"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
      stroke={color}
    >
      {motif === 'corkboard' && (
        <g strokeWidth="1">
          <g opacity="0.5">
            <line x1="60" y1="30" x2="170" y2="120" />
            <line x1="170" y1="120" x2="300" y2="40" />
            <line x1="60" y1="30" x2="300" y2="40" />
            <line x1="300" y1="40" x2="360" y2="130" />
          </g>
          {[[60, 30], [170, 120], [300, 40], [360, 130], [110, 90]].map(([x, y], i) => (
            <g key={i} opacity="0.7">
              <rect x={x - 12} y={y - 9} width="24" height="18" rx="2" fill={color} fillOpacity="0.08" />
              <circle cx={x} cy={y - 9} r="1.6" fill={color} />
            </g>
          ))}
        </g>
      )}

      {motif === 'radar' && (
        <g strokeWidth="1" opacity="0.55">
          {[20, 45, 70, 95].map((r) => (
            <circle key={r} cx="120" cy="80" r={r} />
          ))}
          <line x1="120" y1="80" x2="120" y2="-10" />
          <line x1="120" y1="80" x2="215" y2="45" />
          <path d="M120 80 L120 -10 A 90 90 0 0 1 205 50 Z" fill={color} fillOpacity="0.05" stroke="none" />
          <circle cx="175" cy="52" r="2.5" fill={color} />
          <circle cx="90" cy="120" r="2" fill={color} />
        </g>
      )}

      {motif === 'nodes' && (
        <g strokeWidth="1" opacity="0.55">
          {[[70, 40], [150, 100], [240, 50], [320, 110], [110, 130], [280, 25]].map(([x, y], i, a) => (
            <g key={i}>
              {a.slice(i + 1).map(([x2, y2], j) => (
                Math.hypot(x - x2, y - y2) < 130 ? <line key={j} x1={x} y1={y} x2={x2} y2={y2} /> : null
              ))}
            </g>
          ))}
          {[[70, 40], [150, 100], [240, 50], [320, 110], [110, 130], [280, 25]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4" fill={color} fillOpacity="0.15" />
          ))}
        </g>
      )}

      {motif === 'timeline' && (
        <g strokeWidth="1.2" opacity="0.6">
          <line x1="20" y1="90" x2="380" y2="90" strokeDasharray="2 6" />
          {[60, 140, 220, 300, 360].map((x, i) => (
            <g key={x}>
              <circle cx={x} cy="90" r="5" fill={color} fillOpacity="0.14" />
              {i < 4 && <path d={`M${x + 8} 90 l 10 -0 m -4 -4 l 4 4 l -4 4`} strokeWidth="1" />}
            </g>
          ))}
        </g>
      )}

      {motif === 'spotlights' && (
        <g opacity="0.5">
          <path d="M60 -20 L10 170 L120 170 Z" fill={color} fillOpacity="0.06" stroke="none" />
          <path d="M340 -20 L290 170 L400 170 Z" fill={color} fillOpacity="0.06" stroke="none" />
          <circle cx="60" cy="-6" r="6" fill={color} fillOpacity="0.5" stroke="none" />
          <circle cx="340" cy="-6" r="6" fill={color} fillOpacity="0.5" stroke="none" />
        </g>
      )}

      {motif === 'chalkboard' && (
        <g strokeWidth="1.1" opacity="0.5">
          {[80, 200, 320].map((x) => (
            <circle key={x} cx={x} cy="80" r="12" />
          ))}
          <path d="M92 80 Q 140 30 188 80" strokeDasharray="3 4" />
          <path d="M212 80 Q 260 130 308 80" strokeDasharray="3 4" />
          <path d="M188 80 l -6 -3 m 6 3 l -5 5" />
          <path d="M308 80 l -6 -3 m 6 3 l -5 5" />
          <line x1="20" y1="130" x2="380" y2="130" opacity="0.4" />
        </g>
      )}

      {motif === 'bracket' && (
        <g strokeWidth="1.2" opacity="0.55">
          {[40, 80, 120].map((y) => (
            <g key={y}>
              <line x1="30" y1={y} x2="90" y2={y} />
            </g>
          ))}
          <path d="M90 40 L120 40 L120 80 L150 80" />
          <path d="M90 120 L120 120 L120 80" />
          <path d="M150 80 L220 80 L220 80 L280 80" />
          <path d="M280 80 L340 80" />
          <circle cx="340" cy="80" r="10" fill={color} fillOpacity="0.14" />
          <path d="M336 80 l4 5 l4 -5 M337 72 h6" />
        </g>
      )}

      {motif === 'pitch' && (
        <g strokeWidth="1" opacity="0.4">
          <rect x="20" y="20" width="360" height="120" rx="4" />
          <line x1="200" y1="20" x2="200" y2="140" />
          <circle cx="200" cy="80" r="26" />
          <rect x="20" y="45" width="34" height="70" />
          <rect x="346" y="45" width="34" height="70" />
        </g>
      )}

      {motif === 'pulse' && (
        <g strokeWidth="1.4" opacity="0.5">
          <path d="M10 80 H120 l 14 -46 l 20 92 l 16 -66 l 14 40 H400" />
          {[40, 120, 220, 320].map((x) => (
            <circle key={x} cx={x} cy="80" r={22 + (x % 3) * 6} opacity="0.25" />
          ))}
        </g>
      )}
    </svg>
  );
}
