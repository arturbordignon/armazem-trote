import Link from 'next/link';
import { countLabel } from '@/lib/format';
import type { HomePage } from '@/models/catalog.types';
import heading from '@/components/ui/Heading.module.css';
import styles from './HomeSections.module.css';

/** "Gaveteiro do Armazém": one drawer per section. */
export function SectionDrawers({ sections }: { sections: HomePage['sections'] }) {
  return (
    <section aria-labelledby="h-cats" className={`${heading.container} ${styles.drawersSection}`}>
      <div className={styles.centeredHeading}>
        <span className={heading.kicker}>Cada gaveta, uma secção</span>
        <h2 id="h-cats" className={heading.title}>
          Gaveteiro do Armazém
        </h2>
      </div>
      <div className={styles.cabinet}>
        <ul className={styles.drawers}>
          {sections.map((section) => (
            <li key={section.slug}>
              <Link href={`/secao/${section.slug}`} className={styles.drawer}>
                <span className={styles.label}>
                  <span className={styles.labelName}>{section.name}</span>
                  <span className={styles.labelCount}>
                    {countLabel(section.productCount, 'item', 'itens')}
                  </span>
                </span>
                <span aria-hidden="true" className={styles.pull} />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
