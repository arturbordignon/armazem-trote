import 'server-only';
import { sql } from 'drizzle-orm';
import { db } from '@/lib/db';

export async function pingDatabase(): Promise<void> {
  await db.execute(sql`SELECT 1`);
}
