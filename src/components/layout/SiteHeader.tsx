import Link from 'next/link';
import { Suspense } from 'react';
import { loadNavigation } from '@/controllers/catalog.controller';
import { CartButton } from '@/components/cart/CartButton';
import { CartIsland } from '@/components/cart/CartIsland';
import { SearchBox } from './SearchBox';
import styles from './SiteHeader.module.css';

/**
 * Banner, shop sign, search, cart and section navigation. The navigation comes from a cached
 * loader, so it is part of every page's static shell; only the cart button streams in.
 */
export async function SiteHeader() {
  const sections = await loadNavigation();
  return (
    <>
      <a href="#conteudo" className={styles.skip}>
        Pular para o conteúdo
      </a>
      <div className={styles.banner}>
        Telegrapho: frete de <strong>burro grátis</strong> para todo o Império… digo, o País
      </div>
      <header className={styles.header}>
        <div className={styles.facade}>
          <div className={styles.bar}>
            <Link
              href="/"
              className={styles.sign}
              aria-label="Armazém Trote & Cia — página inicial"
            >
              <span className={styles.signName}>Armazém Trote &amp; Cia</span>
              <span className={styles.signTagline}>Secos &amp; Molhados · Desde 1887</span>
            </Link>
            <div className={styles.search}>
              <SearchBox />
            </div>
            <div className={styles.cart}>
              <Suspense fallback={<CartButton initialCart={null} />}>
                <CartIsland />
              </Suspense>
            </div>
          </div>
        </div>
        <nav aria-label="Seções do armazém" className={styles.nav}>
          <ul className={styles.navList}>
            <li>
              <Link href="/mercadorias" className={styles.navLink}>
                Todas
              </Link>
            </li>
            {sections.map((section) => (
              <li key={section.slug}>
                <Link href={`/secao/${section.slug}`} className={styles.navLink}>
                  {section.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
    </>
  );
}
