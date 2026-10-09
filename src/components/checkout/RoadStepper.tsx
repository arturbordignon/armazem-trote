import { Horse } from '@/components/freight/animals';
import styles from './Checkout.module.css';

const STEPS = ['Endereço', 'Frete', 'Pagamento'] as const;
const NUMERALS = ['I', 'II', 'III'] as const;
const POSITIONS = ['0%', '50%', '100%'] as const;
const ALIGN = [
  { transform: 'translateX(0)', alignItems: 'flex-start' },
  { transform: 'translateX(-50%)', alignItems: 'center' },
  { transform: 'translateX(-100%)', alignItems: 'flex-end' },
] as const;

/** The checkout's progress as a road with three milestones; the horse trots to the current one. */
export function RoadStepper({ step }: { step: 1 | 2 | 3 }) {
  return (
    <div
      role="img"
      aria-label={`Etapa ${step} de ${STEPS.length}: ${STEPS[step - 1]}`}
      className={styles.road}
    >
      <div className={styles.roadBed} />
      <ol className={styles.milestones}>
        {STEPS.map((label, index) => {
          const done = index + 1 < step;
          return (
            <li
              key={label}
              className={`${styles.milestone} ${index + 1 === step ? styles.current : ''}`}
              style={{ left: POSITIONS[index], ...ALIGN[index] }}
            >
              <span className={styles.stone}>
                <span className={styles.league}>Légua</span>
                <span className={styles.stoneLabel}>
                  {done ? '✓ ' : `${NUMERALS[index]} · `}
                  {label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
      <div className={styles.horseLane}>
        <div className={styles.horse} style={{ transform: `translateX(${POSITIONS[step - 1]})` }}>
          <Horse width={52} />
        </div>
      </div>
    </div>
  );
}
