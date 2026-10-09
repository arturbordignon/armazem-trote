import type { FreightMethodCode } from '@/models/constants';
import { Charrete, Donkey, Horse } from './animals';
import styles from './FreightStage.module.css';

/** When the animal works: never (engraving), as soon as shown, or while its card is hovered. */
export type StagePlay = 'never' | 'always' | 'hover';

const DUST_PUFFS = [
  { left: 14, delay: 0 },
  { left: 4, delay: 0.2 },
  { left: 54, delay: 0.35 },
];

function Still({ method }: { method: FreightMethodCode }) {
  switch (method) {
    case 'burro':
      return (
        <div className={styles.centered}>
          <Donkey width={84} />
        </div>
      );
    case 'cavalo':
      return (
        <div className={styles.centered}>
          <Horse width={88} />
        </div>
      );
    case 'charrete':
      return (
        <div className={`${styles.centered} ${styles.low}`}>
          <Charrete width={150} />
        </div>
      );
  }
}

function Motion({ method }: { method: FreightMethodCode }) {
  switch (method) {
    case 'burro':
      return (
        <div className={styles.trip}>
          <Donkey width={84} running grazing legDuration={0.7} legRepeat={6} />
          <span className={styles.hmpf}>Hmpf!</span>
        </div>
      );
    case 'cavalo':
      return (
        <div className={styles.gallop}>
          {DUST_PUFFS.map(({ left, delay }) => (
            <span
              key={left}
              className={styles.dust}
              style={{ left, animationDelay: `${delay}s` }}
            />
          ))}
          <div className={styles.bob}>
            <Horse width={88} running legDuration={0.32} />
          </div>
        </div>
      );
    case 'charrete':
      return (
        <div className={styles.roll}>
          <Charrete
            width={150}
            running
            legDuration={0.4}
            legRepeat={4}
            spinDuration={0.5}
            spinRepeat={3}
            bounceRepeat={7}
          />
        </div>
      );
  }
}

/** The little diorama on top of every freight card. */
export function FreightStage({ method, play }: { method: FreightMethodCode; play: StagePlay }) {
  return (
    <div className={styles.stage} data-play={play}>
      <div className={`${styles.scene} ${styles.still}`}>
        <div className={styles.ground} />
        <Still method={method} />
      </div>
      {play !== 'never' && (
        <div className={`${styles.scene} ${styles.motion}`}>
          <div className={`${styles.ground} ${method === 'cavalo' ? styles.groundMoving : ''}`} />
          <Motion method={method} />
        </div>
      )}
    </div>
  );
}
