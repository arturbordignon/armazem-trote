import { ButtonLink } from '@/components/ui/Button';
import { CallCharreteButton } from './CallCharreteButton';
import { HeroCharrete } from './HeroCharrete';
import styles from './Hero.module.css';

/** The shop window with the charrete going by, and the "GRANDE Sortimento" notice. */
export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.grid}>
        <div className={styles.window}>
          <div className={styles.pane}>
            <svg
              viewBox="0 0 640 440"
              preserveAspectRatio="xMidYMax slice"
              aria-hidden="true"
              className={styles.landscape}
            >
              <circle cx="500" cy="110" r="40" fill="#F1DFA4" opacity=".9" />
              <path d="M0 270 Q110 200 240 250 T520 225 T640 240 V440 H0Z" fill="#B9AE8C" />
              <path d="M0 300 Q170 255 340 295 T640 285 V440 H0Z" fill="#8E9468" />
              <g stroke="#3B2416" strokeWidth={3}>
                <path d="M20 312 v-26 M70 308 v-26 M120 306 v-26 M170 306 v-26" />
                <path d="M14 294 H176 M14 302 H176" strokeWidth={2} />
              </g>
              <rect x="0" y="338" width="640" height="102" fill="#B4946A" />
              <path d="M0 338 H640" stroke="#6E5538" strokeWidth={2} />
              <path
                d="M0 372 Q160 366 320 374 T640 370 M0 404 Q160 398 320 406 T640 402"
                fill="none"
                stroke="#8C6E48"
                strokeWidth={3}
              />
            </svg>
            <HeroCharrete />
            <div aria-hidden="true" className={styles.glare} />
            <div aria-hidden="true" className={styles.mullionH} />
            <div aria-hidden="true" className={styles.mullionV} />
          </div>
          <div aria-hidden="true" className={styles.sill} />
        </div>

        <div className={styles.notice}>
          <span aria-hidden="true" className={`${styles.tack} ${styles.tackLeft}`} />
          <span aria-hidden="true" className={`${styles.tack} ${styles.tackRight}`} />
          <span className={styles.attention}>Attenção, freguezes!</span>
          <span aria-hidden="true" className={styles.flourish}>
            ❦
          </span>
          <h1 className={styles.headline}>
            <span className={styles.grande}>GRANDE</span>
            <span className={styles.sortimento}>Sortimento</span>
            <span className={styles.de}>de</span>
            <span className={styles.secos}>SECOS &amp; MOLHADOS</span>
          </h1>
          <span aria-hidden="true" className={styles.rule} />
          <p className={styles.lede}>
            Mercadorias finas entregues no ritmo do casco — de burro, cavallo ou charrete. Frete
            calculado em léguas.
          </p>
          <span className={styles.terms}>Preços módicos · Pagamento ao cocheiro</span>
          <div className={styles.actions}>
            <ButtonLink href="/mercadorias">Ver mercadorias</ButtonLink>
            <CallCharreteButton />
          </div>
        </div>
      </div>
      <div aria-hidden="true" className={styles.ledge}>
        <div className={styles.stone} />
        <div className={styles.shopfront} />
        <div className={styles.floor} />
      </div>
    </section>
  );
}
