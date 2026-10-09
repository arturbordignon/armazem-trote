import heading from './Heading.module.css';

/** Static-shell placeholder while a per-request page streams in. */
export function PageFallback({ title }: { title?: string }) {
  return (
    <section
      className={heading.container}
      style={{ paddingTop: 28, paddingBottom: 52 }}
      aria-busy="true"
    >
      {title && <h1 className={heading.pageTitle}>{title}</h1>}
      <div
        style={{
          marginTop: 22,
          height: 320,
          background: '#f3ead6',
          boxShadow: 'var(--framed-card)',
          animation: 'pulse 1.2s ease-in-out infinite',
        }}
      />
    </section>
  );
}
