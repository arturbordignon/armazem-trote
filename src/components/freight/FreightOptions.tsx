'use client';

import { useState } from 'react';
import type { FreightMethodCode } from '@/models/constants';
import type { FreightOption } from '@/models/freight.types';
import { FreightOptionCard } from './FreightOptionCard';

interface FreightOptionsProps {
  options: readonly FreightOption[];
  selected: FreightMethodCode | null;
  onSelect?: (code: FreightMethodCode) => void;
  /** Min column width; the product page packs cards tighter than the cart. */
  minColumn?: number;
}

/**
 * The animals as a group of choices. Loaded lazily by the pages that show quotes, so the
 * illustrations' markup and styles stay out of first-load bundles.
 */
export default function FreightOptions({
  options,
  selected,
  onSelect,
  minColumn = 200,
}: FreightOptionsProps) {
  const [playCount, setPlayCount] = useState(0);
  return (
    <div
      role="group"
      aria-label="Opções de frete"
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, ${minColumn}px), 1fr))`,
        gap: 12,
      }}
    >
      {options.map((option) => (
        <FreightOptionCard
          key={option.code}
          option={option}
          selected={option.code === selected}
          playCount={playCount}
          onSelect={() => {
            setPlayCount((n) => n + 1);
            onSelect?.(option.code);
          }}
        />
      ))}
    </div>
  );
}
