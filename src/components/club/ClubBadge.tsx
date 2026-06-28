import type { BadgeStyle, ClubIdentity } from '../../lib/clubIdentity';

/** Pick black/white text for legibility on a given hex background. */
function readableOn(hex: string): string {
  try {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    // Perceived luminance.
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? '#0a0f1c' : '#ffffff';
  } catch {
    return '#ffffff';
  }
}

const SHAPE_CLASS: Record<BadgeStyle, string> = {
  shield: 'rounded-[28%_28%_50%_50%/22%_22%_60%_60%]',
  circle: 'rounded-full',
  diamond: 'rounded-[14%] rotate-45',
  hexagon: 'rounded-[18%]',
};

const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

/** A license-free, abstract club badge: shaped colour block + short tag. */
export function ClubBadge({
  identity,
  size = 56,
}: {
  identity: Pick<ClubIdentity, 'primary' | 'secondary' | 'shortName' | 'badge'>;
  size?: number;
}) {
  const text = readableOn(identity.primary);
  const counterRotate = identity.badge === 'diamond' ? '-rotate-45' : '';

  return (
    <div
      aria-hidden
      className={[
        'relative grid shrink-0 place-items-center overflow-hidden border',
        SHAPE_CLASS[identity.badge],
      ].join(' ')}
      style={{
        width: size,
        height: size,
        background: `linear-gradient(135deg, ${identity.primary} 0%, ${identity.primary} 55%, ${identity.secondary} 55%, ${identity.secondary} 100%)`,
        borderColor: identity.secondary,
        clipPath: identity.badge === 'hexagon' ? HEX_CLIP : undefined,
      }}
    >
      <span
        className={['font-display font-extrabold leading-none', counterRotate].join(' ')}
        style={{ color: text, fontSize: size * 0.34 }}
      >
        {identity.shortName}
      </span>
    </div>
  );
}
