/**
 * Fixed backdrop. The base gradient lives on `body`; this adds only a single,
 * very faint centre-circle marking so the stage reads as a pitch without the
 * old glow/floodlight/pattern decoration. Hidden from assistive tech.
 */
export function StadiumBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="absolute left-1/2 top-[46%] h-[150vmin] w-[150vmin] -translate-x-1/2 -translate-y-1/2 opacity-[0.05]"
        viewBox="0 0 400 600"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1.2"
      >
        <line x1="20" y1="300" x2="380" y2="300" />
        <circle cx="200" cy="300" r="62" />
        <circle cx="200" cy="300" r="2" fill="#ffffff" />
      </svg>
    </div>
  );
}
