import { describe, expect, it } from 'vitest';
import { sign, unsign } from '@/lib/signed-token';

const SECRET = 's'.repeat(32);
const ID = '3b0c1a52-1d3e-4c51-9a3e-0e5f6f7a8b9c';

describe('signed tokens', () => {
  it('round-trip the value', () => {
    expect(unsign(sign(ID, SECRET), SECRET)).toBe(ID);
  });

  it('reject a swapped value, a forged signature or another secret', () => {
    const token = sign(ID, SECRET);
    const signature = token.slice(token.lastIndexOf('.') + 1);
    expect(unsign(`00000000-0000-0000-0000-000000000000.${signature}`, SECRET)).toBeNull();
    expect(unsign(`${ID}.forged`, SECRET)).toBeNull();
    expect(unsign(token, 't'.repeat(32))).toBeNull();
    expect(unsign('no-signature', SECRET)).toBeNull();
    expect(unsign('', SECRET)).toBeNull();
  });
});
