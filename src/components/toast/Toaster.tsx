'use client';

import { Button } from '@/components/ui/Button';
import { dismissToast, useToasts } from './toast-store';
import styles from './Toaster.module.css';

/** Telegram slips in the corner. A polite live region, so screen readers hear each one. */
export function Toaster() {
  const toasts = useToasts();
  return (
    <div className={styles.region} aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} role="status" className={styles.toast}>
          <div className={styles.head}>
            <span className={styles.brand}>TELEGRAMMA</span>
            <span className={styles.title}>{toast.title}</span>
          </div>
          <div className={styles.body}>
            <span className={styles.text}>{toast.body}</span>
            {toast.action && (
              <Button
                variant="dark"
                size="sm"
                className={styles.action}
                onClick={() => {
                  toast.action?.run();
                  dismissToast(toast.id);
                }}
              >
                {toast.action.label}
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
