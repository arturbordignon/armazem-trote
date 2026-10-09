import type { FreightMethodSummary } from '@/models/catalog.types';
import { FreightStage } from '@/components/freight/FreightStage';
import { etaLabel } from '@/components/freight/FreightOptionCard';
import heading from '@/components/ui/Heading.module.css';
import styles from './HomeSections.module.css';

/**
 * "Frete por Tracção Animal": each notice shows its animal at work while hovered or focused.
 * Pure CSS (see FreightStage) — this section ships no JavaScript.
 */
export function FreightExplainer({ methods }: { methods: readonly FreightMethodSummary[] }) {
  return (
    <section
      aria-labelledby="h-frete"
      className={`${heading.container} ${styles.freight} below-fold`}
    >
      <div className={styles.freightHead}>
        <div>
          <span className={heading.kicker}>Da cocheira à sua porteira</span>
          <h2 id="h-frete" className={`${heading.title} ${styles.freightTitle}`}>
            Frete por Tracção Animal
          </h2>
        </div>
        <p className={styles.freightHint}>
          Passe o mouse (ou o dedo) sobre o aviso para ver o animal trabalhar. Distância contada em
          léguas pelo seu CEP.
        </p>
      </div>
      <ul className={styles.notices}>
        {methods.map((method) => (
          // Focusable so keyboard and touch users can set the animal off too.
          <li key={method.code} className={styles.freightNotice} tabIndex={0} data-freight-hover>
            <div className={styles.stageFrame}>
              <FreightStage method={method.code} play="hover" />
            </div>
            <div className={styles.noticeBody}>
              <div className={styles.noticeHead}>
                <h3 className={styles.noticeName}>{method.name}</h3>
                <span className={styles.noticePrice}>{method.isFree ? 'Grátis' : 'por légua'}</span>
              </div>
              <span className={styles.noticeTier}>
                {method.tier} · {etaLabel(method.minDays, method.maxDays)}
              </span>
              <span className={styles.noticeText}>{method.description}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
