import { ButtonLink } from '@/components/ui/Button';
import heading from '@/components/ui/Heading.module.css';

export default function NotFound() {
  return (
    <section
      className={heading.container}
      style={{ paddingTop: 48, paddingBottom: 64, textAlign: 'center' }}
    >
      <span className={heading.kicker}>Erro 404</span>
      <h1 className={heading.pageTitle}>Prateleira vazia</h1>
      <p style={{ fontSize: 19, fontStyle: 'italic', color: 'var(--ink-muted)' }}>
        Procuramos do paiol ao sótão e não achamos essa página. Talvez o burro tenha comido o
        endereço.
      </p>
      <ButtonLink href="/">Voltar ao armazém</ButtonLink>
    </section>
  );
}
