'use client';

import { Button } from '@/components/ui/Button';
import { callCharrete } from './hero-replay';

export function CallCharreteButton() {
  return (
    <Button variant="brass" onClick={callCharrete}>
      Chamar a charrete
    </Button>
  );
}
