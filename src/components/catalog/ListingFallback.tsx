import heading from '@/components/ui/Heading.module.css';
import { ListingSkeleton } from './ListingSkeleton';
import styles from './Listing.module.css';

/** Static-shell placeholder for a listing: title (when known) over a shelf of empty tags. */
export function ListingFallback({ title }: { title?: string }) {
  return (
    <section className={`${heading.container} ${styles.page}`}>
      <div className={styles.header}>
        <h1 className={heading.pageTitle}>{title ?? ' '}</h1>
      </div>
      <ListingSkeleton />
    </section>
  );
}
