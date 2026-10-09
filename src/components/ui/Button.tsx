import Link, { type LinkProps } from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'red' | 'brass' | 'dark' | 'link' | 'knob';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface StyleProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

function classes({ variant = 'red', size = 'md', className }: StyleProps): string {
  const sized = variant === 'link' || variant === 'knob' ? '' : styles[size];
  return [styles.button, styles[variant], sized, className].filter(Boolean).join(' ');
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...props
}: StyleProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={classes({ variant, size, className })} {...props} />;
}

/** A link that looks like one of the shop's buttons. */
export function ButtonLink<Route extends string>({
  variant,
  size,
  className,
  children,
  ...props
}: StyleProps & LinkProps<Route> & { children: ReactNode }) {
  return (
    <Link className={classes({ variant, size, className })} {...props}>
      {children}
    </Link>
  );
}
