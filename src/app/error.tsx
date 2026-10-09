'use client';

import { Button } from '@/components/ui/Button';
import heading from '@/components/ui/Heading.module.css';

/** Route-level error boundary: the shop stays standing, with a way to try again. */
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <section
      className={heading.container}
      style={{ paddingTop: 48, paddingBottom: 64, textAlign: 'center' }}
    >
      <span className={heading.kicker}>Telegrama interrompido</span>
      <h1 className={heading.pageTitle}>O armazém tropeçou</h1>
      <p style={{ fontSize: 19, fontStyle: 'italic', color: 'var(--ink-muted)' }}>
        Algo saiu do trilho deste lado do balcão. Tente de novo em instantes.
      </p>
      <Button onClick={reset}>Tentar de novo</Button>
    </section>
  );
}
