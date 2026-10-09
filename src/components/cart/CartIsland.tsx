import { loadCart } from '@/controllers/cart.controller';
import { CartButton } from './CartButton';

/** The per-visitor part of the header: reads the cart cookie, so it streams in after the shell. */
export async function CartIsland() {
  return <CartButton initialCart={await loadCart()} />;
}
