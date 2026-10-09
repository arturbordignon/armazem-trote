import { RATING_LEVELS } from '@/models/constants';
import { formatRating } from '@/lib/format';

const HORSESHOE_PATH =
  'M5 3h4v2.5C7.5 8 7.5 13 9.5 15.5c1.4 1.7 3.6 1.7 5 0C16.5 13 16.5 8 15 5.5V3h4v2.5c1.8 3.5 1.6 9-1.2 12.4-3 3.4-8.6 3.4-11.6 0C3.4 14.5 3.2 9 5 5.5Z';
/** A horseshoe counts as earned from three quarters up, as in the design. */
const EARNED_FROM = 0.25;

/** Rating in horseshoes (the shop's stars). */
export function Horseshoes({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <span
      role="img"
      aria-label={`Nota ${formatRating(rating)} de ${RATING_LEVELS} ferraduras`}
      style={{ display: 'inline-flex', gap: size > 16 ? 3 : 2 }}
    >
      {Array.from({ length: RATING_LEVELS }, (_, i) => {
        const earned = rating >= i + 1 - EARNED_FROM;
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
            <path
              d={HORSESHOE_PATH}
              fill={earned ? '#7C5A1E' : 'none'}
              stroke={earned ? undefined : '#7C5A1E'}
              strokeWidth={earned ? undefined : 1.5}
            />
          </svg>
        );
      })}
    </span>
  );
}
