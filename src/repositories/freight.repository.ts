import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { freightMethods } from '@/models/commerce.schema';

export function findActiveFreightMethods() {
  return db
    .select({
      code: freightMethods.code,
      name: freightMethods.name,
      tier: freightMethods.tier,
      description: freightMethods.description,
      basePriceCents: freightMethods.basePriceCents,
      pricePerLeagueCents: freightMethods.pricePerLeagueCents,
      includedWeightGrams: freightMethods.includedWeightGrams,
      pricePerExtraKgCents: freightMethods.pricePerExtraKgCents,
      minDays: freightMethods.minDays,
      maxDays: freightMethods.maxDays,
      leaguesPerExtraDay: freightMethods.leaguesPerExtraDay,
      carriesBulky: freightMethods.carriesBulky,
    })
    .from(freightMethods)
    .where(eq(freightMethods.isActive, true))
    .orderBy(freightMethods.position);
}
