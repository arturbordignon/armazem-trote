import styles from './ProductPhoto.module.css';

export type PhotoSize = 'card' | 'detail' | 'thumb' | 'mini';

export function ProductPhoto({ name, size }: { name: string; size: PhotoSize }) {
  return (
    <span className={`${styles.plate} ${styles[size]}`} aria-hidden="true">
      {name.charAt(0)}
    </span>
  );
}
