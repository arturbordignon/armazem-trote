'use client';

import { Charrete } from '@/components/freight/animals';
import { useReplayCount } from './hero-replay';
import styles from './Hero.module.css';

/** The charrete crossing the shop window; remounted (and so replayed) on every call. */
export function HeroCharrete() {
  const replays = useReplayCount();
  return (
    <div key={replays} className={styles.road}>
      <div className={styles.drive}>
        <div className={styles.driveStart}>
          <Charrete
            width={240}
            running
            legDuration={0.4}
            legRepeat={11}
            spinDuration={0.6}
            spinRepeat={7}
            bounceRepeat={18}
          />
        </div>
      </div>
      <div className={styles.parked}>
        <Charrete width={240} />
      </div>
    </div>
  );
}
