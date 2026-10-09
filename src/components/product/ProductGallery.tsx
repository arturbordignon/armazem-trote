'use client';

import { useState } from 'react';
import { ProductPhoto } from '@/components/ui/ProductPhoto';
import { Stamp } from '@/components/ui/Stamp';
import styles from './Product.module.css';

const VIEWS = ['Frente', 'Detalhe', 'Em uso', 'Na carroça'] as const;

/** "Photographia Trote & Cia": the plate and its four views. */
export function ProductGallery({ name, badge }: { name: string; badge: string | null }) {
  const [view, setView] = useState(0);
  return (
    <div className={styles.gallery}>
      <div className={styles.frame} role="tabpanel" aria-label={VIEWS[view]}>
        <ProductPhoto name={name} size="detail" />
        <span className={styles.caption}>Photographia Trote &amp; Cia · {VIEWS[view]}</span>
        {badge && <Stamp size="large">{badge}</Stamp>}
      </div>
      <div role="tablist" aria-label="Imagens do produto" className={styles.thumbs}>
        {VIEWS.map((label, index) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={index === view}
            className={styles.thumb}
            onClick={() => setView(index)}
          >
            <span className={styles.thumbPlate} />
            <span className={styles.thumbLabel}>{label}</span>
            {index === view && <span aria-hidden="true" className={styles.thumbActive} />}
          </button>
        ))}
      </div>
    </div>
  );
}
