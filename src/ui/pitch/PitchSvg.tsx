/** Subtle SVG pitch backdrop — pure vector, no media assets. */
export function PitchSvg({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 400 260"
      fill="none"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <rect x="8" y="8" width="384" height="244" rx="6" stroke="currentColor" strokeOpacity="0.25" />
      <line x1="200" y1="8" x2="200" y2="252" stroke="currentColor" strokeOpacity="0.18" />
      <circle cx="200" cy="130" r="40" stroke="currentColor" strokeOpacity="0.2" />
      <circle cx="200" cy="130" r="2.5" fill="currentColor" fillOpacity="0.4" />
      <rect x="8" y="80" width="52" height="100" stroke="currentColor" strokeOpacity="0.18" />
      <rect x="340" y="80" width="52" height="100" stroke="currentColor" strokeOpacity="0.18" />
      <rect x="8" y="108" width="20" height="44" stroke="currentColor" strokeOpacity="0.18" />
      <rect x="372" y="108" width="20" height="44" stroke="currentColor" strokeOpacity="0.18" />
    </svg>
  );
}
