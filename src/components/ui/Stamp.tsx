import styles from './Stamp.module.css';

/** Red rubber stamp in a photo's corner ("Mais vendido", "Escolhido"). */
export function Stamp({
  children,
  size = 'small',
}: {
  children: string;
  size?: 'small' | 'large';
}) {
  return <span className={`${styles.stamp} ${styles[size]}`}>{children}</span>;
}
