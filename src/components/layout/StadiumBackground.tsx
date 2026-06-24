/**
 * Fixed, purely decorative stadium backdrop: deep-navy gradient, a faint
 * neon top-down pitch, and a soft green glow. Sits behind everything and is
 * hidden from assistive tech.
 */
export function StadiumBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#101a33_0%,_#080c16_45%,_#05070d_100%)]" />

      {/* Top neon glow */}
      <div className="absolute -top-40 left-1/2 h-96 w-[120vw] -translate-x-1/2 rounded-full bg-pitch/10 blur-[120px]" />

      {/* Faint pitch markings */}
      <svg
        className="absolute left-1/2 top-1/2 h-[140vmin] w-[140vmin] -translate-x-1/2 -translate-y-1/2 opacity-[0.10]"
        viewBox="0 0 400 600"
        fill="none"
        stroke="#16ff7a"
        strokeWidth="1.4"
      >
        <rect x="20" y="20" width="360" height="560" rx="6" />
        <line x1="20" y1="300" x2="380" y2="300" />
        <circle cx="200" cy="300" r="60" />
        <circle cx="200" cy="300" r="2.5" fill="#16ff7a" />
        {/* Top box */}
        <rect x="110" y="20" width="180" height="90" />
        <rect x="160" y="20" width="80" height="35" />
        {/* Bottom box */}
        <rect x="110" y="490" width="180" height="90" />
        <rect x="160" y="545" width="80" height="35" />
        {/* Penalty arcs (the "D") + spots */}
        <path d="M168 110 A 40 40 0 0 1 232 110" />
        <path d="M168 490 A 40 40 0 0 0 232 490" />
        <circle cx="200" cy="75" r="1.6" fill="#16ff7a" />
        <circle cx="200" cy="525" r="1.6" fill="#16ff7a" />
        {/* Corner arcs */}
        <path d="M20 30 A 10 10 0 0 0 30 20" />
        <path d="M370 20 A 10 10 0 0 0 380 30" />
        <path d="M30 580 A 10 10 0 0 0 20 570" />
        <path d="M380 570 A 10 10 0 0 0 370 580" />
      </svg>

      {/* Subtle vertical mowing stripes */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(90deg, #16ff7a 0 2px, transparent 2px 80px)',
        }}
      />

      {/* Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_55%,_rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}
