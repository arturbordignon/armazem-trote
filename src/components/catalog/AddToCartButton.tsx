'use client';

import { addItem, openDrawer, type LinePreview } from '@/components/cart/cart-store';
import { showToast } from '@/components/toast/toast-store';
import { Button } from '@/components/ui/Button';

/** "Adicionar à carroça" on a card: one unit of the default variant, then a telegram. */
export function AddToCartButton({ line, className }: { line: LinePreview; className?: string }) {
  const add = async () => {
    if (await addItem(line, 1)) {
      showToast({
        title: 'EMBARCADO',
        body: `${line.productName} foi para a carroça STOP`,
        action: { label: 'Ver carroça', run: openDrawer },
      });
    }
  };
  return (
    <Button size="sm" className={className} onClick={() => void add()}>
      Adicionar à carroça
    </Button>
  );
}
