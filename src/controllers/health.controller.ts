import 'server-only';
import { NextResponse, connection } from 'next/server';
import { getHealth } from '@/services/health.service';

const HTTP_OK = 200;
const HTTP_SERVICE_UNAVAILABLE = 503;

/** GET /api/health — 200 when Postgres and Redis answer, 503 otherwise. Never cached. */
export async function handleHealthCheck(): Promise<NextResponse> {
  await connection(); // always live: never prerendered or cached
  const report = await getHealth();
  return NextResponse.json(report, {
    status: report.status === 'ok' ? HTTP_OK : HTTP_SERVICE_UNAVAILABLE,
    headers: { 'Cache-Control': 'no-store' },
  });
}
