'use client';

import { useRouter } from 'next/navigation';
import { type KeyboardEvent, useEffect, useRef } from 'react';
import { formatBRL } from '@/lib/format';
import { Button } from '@/components/ui/Button';
import { closeDrawer, useCartState } from './cart-store';
import { LineItem } from './LineItem';
import styles from './CartDrawer.module.css';

const FOCUSABLE = 'button:not([disabled]), a[href], input, select, textarea';

/**
 * The mini cart. Renders straight from the client cart store (already loaded with the page),
 * so opening it costs no request. Modal: focus is trapped inside and restored on close.
 */
export function CartDrawer() {
  const router = useRouter();
  const { cart, drawerOpen } = useCartState();
  const crate = useRef<HTMLDivElement>(null);
  const opener = useRef<Element | null>(null);

  useEffect(() => {
    if (!drawerOpen) return;
    opener.current = document.activeElement;
    crate.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onEscape);
    return () => {
      window.removeEventListener('keydown', onEscape);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [drawerOpen]);

  if (!drawerOpen) return null;

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !crate.current) return;
    const focusable = [...crate.current.querySelectorAll<HTMLElement>(FOCUSABLE)];
    const first = focusable[0];
    const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };

  const go = (path: '/carroca' | '/encomenda') => {
    closeDrawer();
    router.push(path);
  };

  const empty = cart.lines.length === 0;
  return (
    <>
      <div className={styles.overlay} onClick={closeDrawer} aria-hidden="true" />
      <div
        ref={crate}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className={styles.crate}
        onKeyDown={trapFocus}
      >
        <div className={styles.head}>
          <div className={styles.titles}>
            <h2 id="drawer-title" className={styles.title}>
              CAIXOTE Nº 1887
            </h2>
            <span className={styles.stencil}>Frágil · Este lado p/ cima</span>
          </div>
          <Button
            variant="knob"
            className={styles.close}
            aria-label="Fechar carroça"
            onClick={closeDrawer}
          >
            ×
          </Button>
        </div>
        <div className={styles.contents}>
          {empty ? (
            <div className={styles.empty}>
              <span className={styles.emptyTitle}>Caixote vazio.</span>
              <span className={styles.emptyNote}>Até o burro está entediado.</span>
            </div>
          ) : (
            cart.lines.map((line) => <LineItem key={line.variantId} line={line} editable />)
          )}
        </div>
        <div className={styles.summary}>
          <div className={styles.subtotal}>
            <span className={styles.subtotalLabel}>Subtotal</span>
            <span className={styles.subtotalValue}>{formatBRL(cart.totals.subtotalCents)}</span>
          </div>
          <span className={styles.note}>Frete e cupom calculados na carroça.</span>
          <div className={styles.actions}>
            <Button variant="brass" className={styles.action} onClick={() => go('/carroca')}>
              Ver carroça
            </Button>
            <Button className={styles.action} disabled={empty} onClick={() => go('/encomenda')}>
              Finalizar
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
