import styles from './ListingSkeleton.module.css';

const BLOCKS = [
  { className: styles.photo, width: '100%' },
  { height: 12, width: '40%' },
  { height: 18, width: '85%' },
  { height: 28, width: '45%' },
];

/** Empty tags pulsing on the shelf while a listing loads (the design's loading state). */
export function ListingSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando mercadorias" className={styles.grid}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.slot}>
          <div className={styles.hanger}>
            <div className={styles.tag}>
              {BLOCKS.map((block, j) => (
                <div
                  key={j}
                  className={`${styles.block} ${block.className ?? ''}`}
                  style={{ height: block.height, width: block.width }}
                />
              ))}
              <div className={styles.block} style={{ marginTop: 'auto', height: 44 }} />
            </div>
          </div>
          <div aria-hidden="true" className={styles.plank} />
        </div>
      ))}
    </div>
  );
}
