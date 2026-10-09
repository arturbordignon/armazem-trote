import { formatInteger } from '@/lib/format';
import type { FreightDestination } from '@/models/freight.types';

/** "Destino: Belo Horizonte (MG) · 55 léguas (≈ 363 km) saindo de Ouro Fino" */
export function destinationLabel(destination: FreightDestination | null): string {
  if (!destination) return 'Informe o CEP para calcular as léguas.';
  const { city, uf, leagues, km } = destination;
  return `Destino: ${city} (${uf}) · ${formatInteger(leagues)} léguas (≈ ${formatInteger(km)} km) saindo de Ouro Fino`;
}

/** Types a CEP as the customer goes: digits only, hyphen after the fifth. */
export function maskCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}
