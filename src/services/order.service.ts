import 'server-only';
import { logger } from '@/lib/logger';
import { PAYMENT_OPTIONS } from '@/models/constants';
import type { OrderConfirmation } from '@/models/order.types';
import * as orderRepository from '@/repositories/order.repository';
import { formatBRL } from '@/lib/format';

type ConfirmationRow = NonNullable<
  Awaited<ReturnType<typeof orderRepository.findOrderConfirmation>>
>;

function toConfirmation(row: ConfirmationRow): OrderConfirmation {
  const { id, createdAt, ...rest } = row;
  return { ...rest, createdAt: createdAt.toISOString() };
}

/** The confirmation page ("TELEGRAMMA"). Looked up by the unguessable public id. */
export async function getOrderConfirmation(publicId: string): Promise<OrderConfirmation | null> {
  const row = await orderRepository.findOrderConfirmation({ publicId });
  return row ? toConfirmation(row) : null;
}

/** First name, as the cocheiro calls it at the gate. */
function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

/** The telegram text, in the shop's STOP-punctuated house style. Pure. */
export function renderOrderTelegram(order: OrderConfirmation): string {
  const lines = order.lines
    .map(
      (l) =>
        `${l.quantity}× ${l.productName}${l.optionValue ? ` (${l.optionValue})` : ''} ${formatBRL(l.lineTotalCents)}`,
    )
    .join(' STOP ');
  return [
    `TELEGRAMMA Nº ${order.number}`,
    `PREZADO(A) ${firstName(order.customerName).toUpperCase()} STOP`,
    `ENCOMENDA EMBARCADA NO LOMBO DO ${order.freightMethodName.toUpperCase()} RUMO A ${order.city.toUpperCase()} ${order.uf} STOP`,
    `PREVISÃO DE CHEGADA ${order.freightMinDays}–${order.freightMaxDays} DIAS (${order.leagues} LÉGUAS) STOP`,
    `${lines.toUpperCase()} STOP`,
    `TOTAL ${formatBRL(order.totalCents)} STOP PAGAMENTO: ${PAYMENT_OPTIONS[order.paymentMethod].label.toUpperCase()} STOP`,
  ].join('\n');
}

/**
 * Background job: "sends" the confirmation telegram. Nothing leaves the building in this
 * portfolio project, so sending means logging the rendered text.
 */
export async function sendOrderTelegram(orderId: number): Promise<string> {
  const row = await orderRepository.findOrderConfirmation({ id: orderId });
  if (!row) throw new Error(`Order ${orderId} not found for telegram`);
  const text = renderOrderTelegram(toConfirmation(row));
  logger.info({ orderId, number: row.number, telegram: text }, 'telegram sent (mock)');
  return text;
}
