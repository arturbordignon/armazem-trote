'use client';

import { useState } from 'react';
import type { FreightMethodCode } from '@/models/constants';
import { Charrete, Donkey, Horse } from '@/components/freight/animals';
import { Button } from '@/components/ui/Button';
import heading from '@/components/ui/Heading.module.css';
import styles from './Order.module.css';

const ROUTE_STOPS = [
  { name: 'Ouro Fino (armazém)', at: 0, dot: '#1F1A14' },
  { name: 'Pouso Alegre', at: 1 / 3, dot: '#1F1A14' },
  { name: 'Três Corações', at: 2 / 3, dot: '#FBF5E6' },
] as const;

function Traveller({ method, running }: { method: FreightMethodCode; running: boolean }) {
  switch (method) {
    case 'burro':
      return <Donkey width={70} running={running} legDuration={0.7} legRepeat={10} />;
    case 'cavalo':
      return <Horse width={76} running={running} legDuration={0.35} legRepeat={20} />;
    case 'charrete':
      return (
        <Charrete
          width={120}
          running={running}
          legDuration={0.4}
          legRepeat={17}
          spinDuration={0.5}
          spinRepeat={14}
          bounceRepeat={28}
        />
      );
  }
}

interface TrackingMapProps {
  method: FreightMethodCode;
  leagues: number;
  destination: string;
}

/** "Rastreio pela estrada": the animal walking the route; "Rever o trajecto" replays it. */
export function TrackingMap({ method, leagues, destination }: TrackingMapProps) {
  const [replays, setReplays] = useState(0);
  return (
    <div className={styles.tracking}>
      <div className={styles.trackingHead}>
        <div>
          <span className={heading.kicker}>Rastreio pela estrada</span>
          <h2 className={styles.trackingTitle}>{leagues} léguas até você</h2>
        </div>
        <Button variant="brass" size="sm" onClick={() => setReplays((n) => n + 1)}>
          Rever o trajecto
        </Button>
      </div>
      <div className={styles.map} role="img" aria-label={`Rota de Ouro Fino até ${destination}`}>
        <span className={styles.mapTitle}>Carta chorographica · Minas e arredores</span>
        <div className={styles.route} />
        <div key={replays}>
          <div className={styles.travelled} />
          <div className={styles.traveller}>
            <div className={`${styles.animal} ${styles.movingAnimal}`}>
              <Traveller method={method} running />
            </div>
            <div className={`${styles.animal} ${styles.parkedAnimal}`}>
              <Traveller method={method} running={false} />
            </div>
          </div>
        </div>
        <ol className={styles.towns}>
          {[...ROUTE_STOPS, { name: destination, at: 1, dot: '#8E2F23' }].map((stop) => (
            <li
              key={stop.name}
              className={styles.town}
              style={{ left: `calc(60px + (100% - 120px) * ${stop.at})` }}
            >
              <span className={styles.dot} style={{ background: stop.dot }} />
              <span className={styles.townName}>{stop.name}</span>
            </li>
          ))}
        </ol>
      </div>
      <p className={styles.lastNotice}>
        Último aviso: pernoite em Pouso Alegre STOP Animal alimentado e de bom humor STOP Segue
        viagem STOP
      </p>
    </div>
  );
}
