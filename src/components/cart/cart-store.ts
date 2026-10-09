import { useSyncExternalStore } from 'react';
import {
  addToCartAction,
  applyCouponAction,
  chooseFreightAction,
  setDestinationAction,
  updateCartLineAction,
} from '@/controllers/cart.actions';
import type { ActionResult } from '@/controllers/actions';
import type { CartLine, CartView } from '@/models/cart.types';
import { EMPTY_CART, type FreightMethodCode, MAX_LINE_QUANTITY } from '@/models/constants';
import { showToast } from '@/components/toast/toast-store';

// The visitor's cart on the client. The server's last answer (`confirmed`) plus the changes
// still in flight (`pending`) gives what is shown: edits appear instantly, and every server
// response — which always carries the whole recomputed cart — replaces the guesswork.
// Next.js runs server actions one at a time, so responses arrive in the order they were sent.

/** What a product card or page already knows about a line before the server answers. */
export interface LinePreview {
  variantId: number;
  productSlug: string;
  productName: string;
  optionName: string | null;
  optionValue: string | null;
  unitPriceCents: number;
  isBulky: boolean;
}

type PendingChange =
  | { kind: 'add'; preview: LinePreview; quantity: number }
  | { kind: 'set'; variantId: number; quantity: number };

interface CartState {
  cart: CartView;
  hydrated: boolean;
  drawerOpen: boolean;
}

let confirmed: CartView = EMPTY_CART;
let pending: PendingChange[] = [];
let state: CartState = { cart: EMPTY_CART, hydrated: false, drawerOpen: false };
const listeners = new Set<() => void>();

function publish(patch: Partial<CartState> = {}): void {
  state = { ...state, ...patch, cart: pending.reduce(applyChange, confirmed) };
  listeners.forEach((listener) => listener());
}

function applyChange(cart: CartView, change: PendingChange): CartView {
  const variantId = change.kind === 'add' ? change.preview.variantId : change.variantId;
  const existing = cart.lines.find((line) => line.variantId === variantId);
  let lines: CartLine[];
  if (change.kind === 'add' && !existing) {
    lines = [...cart.lines, previewLine(change.preview, change.quantity)];
  } else {
    lines = cart.lines
      .map((line) => {
        if (line.variantId !== variantId) return line;
        const quantity = Math.min(
          MAX_LINE_QUANTITY,
          change.kind === 'add' ? line.quantity + change.quantity : change.quantity,
        );
        return { ...line, quantity, lineTotalCents: line.unitPriceCents * quantity };
      })
      .filter((line) => line.quantity > 0);
  }
  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const freightCents = cart.totals.freightCents;
  return {
    ...cart,
    lines,
    totals: {
      ...cart.totals,
      itemCount: lines.reduce((sum, line) => sum + line.quantity, 0),
      subtotalCents,
      totalCents: subtotalCents - cart.totals.discountCents + (freightCents ?? 0),
    },
  };
}

function previewLine(preview: LinePreview, quantity: number): CartLine {
  return {
    ...preview,
    quantity,
    lineTotalCents: preview.unitPriceCents * quantity,
    available: Number.POSITIVE_INFINITY,
    weightGrams: 0,
    addedAt: Date.now(),
  };
}

/** Runs a server action for `change`, showing it optimistically until the answer arrives. */
async function mutate(
  change: PendingChange | null,
  action: () => Promise<ActionResult<CartView>>,
): Promise<ActionResult<CartView>> {
  if (change) {
    pending = [...pending, change];
    publish();
  }
  let result: ActionResult<CartView>;
  try {
    result = await action();
  } catch {
    result = {
      ok: false,
      error: { code: 'internal', message: 'Sem sinal do telégrafo. Tente de novo.' },
    };
  }
  if (change) pending = pending.filter((p) => p !== change);
  if (result.ok) confirmed = result.data;
  publish();
  return result;
}

function refuse(message: string): void {
  showToast({ title: 'RECUSADO', body: `${message} STOP` });
}

// ---------------------------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------------------------

/** Seeds the store with the server-rendered cart once per page load. */
export function hydrateCart(cart: CartView): void {
  if (state.hydrated) return;
  confirmed = cart;
  publish({ hydrated: true });
}

/** After checkout the server cart is gone; mirror that locally. */
export function resetCart(): void {
  confirmed = EMPTY_CART;
  pending = [];
  publish({ drawerOpen: false });
}

export async function addItem(preview: LinePreview, quantity: number): Promise<boolean> {
  const result = await mutate({ kind: 'add', preview, quantity }, () =>
    addToCartAction({ variantId: preview.variantId, quantity }),
  );
  if (!result.ok) refuse(result.error.message);
  return result.ok;
}

export async function setQuantity(variantId: number, quantity: number): Promise<void> {
  const result = await mutate({ kind: 'set', variantId, quantity }, () =>
    updateCartLineAction({ variantId, quantity }),
  );
  if (!result.ok) refuse(result.error.message);
}

/** "riscar da caderneta", with a telegram offering to undo. */
export async function removeLine(line: LinePreview & { quantity: number }): Promise<void> {
  await setQuantity(line.variantId, 0);
  showToast({
    title: 'DEVOLVIDO',
    body: `${line.productName} voltou à prateleira STOP`,
    action: { label: 'Desfazer', run: () => void addItem(line, line.quantity) },
  });
}

export function applyCoupon(code: string): Promise<ActionResult<CartView>> {
  return mutate(null, () => applyCouponAction({ code }));
}

export function setDestination(cep: string): Promise<ActionResult<CartView>> {
  return mutate(null, () => setDestinationAction({ cep }));
}

export function chooseFreight(method: FreightMethodCode): Promise<ActionResult<CartView>> {
  return mutate(null, () => chooseFreightAction({ method }));
}

export function openDrawer(): void {
  publish({ drawerOpen: true });
}

export function closeDrawer(): void {
  publish({ drawerOpen: false });
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const SERVER_STATE: CartState = { cart: EMPTY_CART, hydrated: false, drawerOpen: false };

export function useCartState(): CartState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}
