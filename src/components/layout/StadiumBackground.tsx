/**
 * Very faint pitch geometry over the gradient stage (set on `body`). Purely
 * decorative, low-opacity, and hidden from assistive tech.
 */
export function StadiumBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <svg
        className="absolute left-1/2 top-[42%] h-[130vmin] w-[130vmin] -translate-x-1/2 -translate-y-1/2 opacity-[0.03]"
        viewBox="0 0 400 600"
        fill="none"
        stroke="#ffffff"
        strokeWidth="1"
      >
        <line x1="40" y1="300" x2="360" y2="300" />
        <circle cx="200" cy="300" r="66" />
        <circle cx="200" cy="300" r="2" fill="#ffffff" />
      </svg>
    </div>
  );
}
