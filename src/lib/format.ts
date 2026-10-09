// Display formatting shared by server and client components. Pure; no server imports.

const CENTS_PER_REAL = 100;

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const integer = new Intl.NumberFormat('pt-BR');
const oneDecimal = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** 8990 → "R$ 89,90" */
export function formatBRL(cents: number): string {
  return brl.format(cents / CENTS_PER_REAL);
}

/** 129000 → { reais: "1.290", cents: "00" }, for the engraved price tag. */
export function splitPrice(cents: number): { reais: string; cents: string } {
  return {
    reais: integer.format(Math.floor(cents / CENTS_PER_REAL)),
    cents: String(cents % CENTS_PER_REAL).padStart(2, '0'),
  };
}

/** 4.6 → "4,6" */
export function formatRating(rating: number): string {
  return oneDecimal.format(rating);
}

export function formatInteger(value: number): string {
  return integer.format(value);
}

/** "37540000" → "37540-000" */
export function formatCep(digits: string): string {
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

/** Pluralizes a Portuguese noun phrase: (1, "mercadoria") → "1 mercadoria". */
export function countLabel(count: number, singular: string, plural: string): string {
  return `${integer.format(count)} ${count === 1 ? singular : plural}`;
}
