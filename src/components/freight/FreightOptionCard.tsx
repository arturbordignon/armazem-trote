import { formatBRL } from '@/lib/format';
import type { FreightOption, RoadCondition } from '@/models/freight.types';
import { FreightStage } from './FreightStage';
import styles from './FreightOptionCard.module.css';

export function freightPriceLabel(cents: number): string {
  return cents === 0 ? 'Grátis' : formatBRL(cents);
}

export function etaLabel(minDays: number, maxDays: number): string {
  return `${minDays}–${maxDays} dias`;
}

/** "Chuva na estrada +2 dias", "Cavalo descansado −1 dia". */
function conditionLabel({ label, deltaDays }: RoadCondition): string {
  if (deltaDays === 0) return label;
  const days = Math.abs(deltaDays);
  return `${label} ${deltaDays > 0 ? '+' : '−'}${days} ${days === 1 ? 'dia' : 'dias'}`;
}

interface FreightOptionCardProps {
  option: FreightOption;
  selected: boolean;
  /** Bumped on each selection so the chosen animal sets off again. */
  playCount: number;
  onSelect: () => void;
}

export function FreightOptionCard({
  option,
  selected,
  playCount,
  onSelect,
}: FreightOptionCardProps) {
  const unavailable = option.unavailableReason !== null;
  return (
    <button
      type="button"
      className={styles.card}
      aria-pressed={selected}
      disabled={unavailable}
      onClick={onSelect}
    >
      <div className={styles.frame}>
        <FreightStage
          key={selected ? playCount : 'still'}
          method={option.code}
          play={selected && playCount > 0 ? 'always' : 'never'}
        />
      </div>
      <div className={styles.body}>
        <div className={styles.heading}>
          <span className={styles.name}>{option.name}</span>
          <span className={styles.price}>{freightPriceLabel(option.priceCents)}</span>
        </div>
        <span className={styles.tier}>
          {option.tier} · {etaLabel(option.minDays, option.maxDays)}
        </span>
        <span className={styles.description}>{option.description}</span>
        {option.roadConditions.length > 0 && (
          <div className={styles.conditions}>
            {option.roadConditions.map((condition) => (
              <span
                key={condition.label}
                className={`${styles.condition} ${condition.deltaDays > 0 ? styles.delay : styles.shortcut}`}
              >
                {conditionLabel(condition)}
              </span>
            ))}
          </div>
        )}
      </div>
      {selected && (
        <>
          <span className={styles.selectedFrame} aria-hidden="true" />
          <span className={styles.chosen}>Escolhido</span>
        </>
      )}
      {unavailable && <span className={styles.unavailable}>{option.unavailableReason}</span>}
    </button>
  );
}
