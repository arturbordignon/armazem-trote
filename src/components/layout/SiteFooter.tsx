import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={`${styles.footer} below-fold`}>
      <div className={styles.tiles} aria-hidden="true" />
      <div className={styles.street}>
        <div className={styles.plaque}>
          <span className={styles.name}>Armazém Trote &amp; Cia</span>
          <span className={styles.address}>
            Rua do Commercio, 12 · Ouro Fino, Minas · Fundado em 1887
          </span>
          <span className={styles.note}>
            Aberto do canto do gallo ao toque do sino. Projecto de portfólio — pagamentos e entregas
            fictícios.
          </span>
        </div>
      </div>
    </footer>
  );
}
