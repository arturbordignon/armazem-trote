import { ButtonLink } from '@/components/ui/Button';
import styles from './HomeSections.module.css';

/** "PROCURA-SE clientes com bom gosto": the GALINHA10 coupon promotion. */
export function WantedPoster() {
  return (
    <section aria-label="Promoção" className={`${styles.promo} below-fold`}>
      <div className={styles.promoGrid}>
        <div className={styles.poster}>
          <div className={styles.posterPaper}>
            <span className={styles.wanted}>PROCURA-SE</span>
            <span className={styles.wantedFor}>clientes com bom gosto</span>
            <div className={styles.portrait}>
              <div className={styles.portraitInner}>retrato: você</div>
            </div>
            <span className={styles.reward}>RECOMPENSA</span>
            <span className={styles.rewardAmount}>10% de desconto</span>
            <span className={styles.coupon}>
              Cupom <strong className={styles.couponCode}>GALINHA10</strong>
            </span>
          </div>
          <span aria-hidden="true" className={styles.nail} />
        </div>
        <div className={styles.promoText}>
          <h2 className={styles.promoTitle}>Vivo, e com fome de compras.</h2>
          <p className={styles.promoBody}>
            O delegado do armazém offerece recompensa a quem encher a primeira carroça. Use o cupom
            ao acertar a conta — vale até para o rádio que chegou do futuro.
          </p>
          <ButtonLink href="/mercadorias" variant="brass" className={styles.promoAction}>
            Encher a carroça
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
