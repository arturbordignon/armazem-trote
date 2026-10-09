'use client';

import { type ReactNode, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import styles from './HomeSections.module.css';

const SCROLL_STEP_PX = 280;

/**
 * Horizontal shelf with brass arrow knobs. The cards arrive as server-rendered children; this
 * component only adds the scrolling.
 */
export function ShelfCarousel({ heading, children }: { heading: ReactNode; children: ReactNode }) {
  const track = useRef<HTMLUListElement>(null);
  const scroll = (direction: 1 | -1) => {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    track.current?.scrollBy({
      left: direction * SCROLL_STEP_PX,
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  };
  return (
    <>
      <div className={styles.arrivalsHead}>
        {heading}
        <div className={styles.arrows}>
          <Button variant="knob" aria-label="Anteriores" onClick={() => scroll(-1)}>
            ←
          </Button>
          <Button variant="knob" aria-label="Próximas" onClick={() => scroll(1)}>
            →
          </Button>
        </div>
      </div>
      <ul ref={track} className={styles.track}>
        {children}
      </ul>
    </>
  );
}
