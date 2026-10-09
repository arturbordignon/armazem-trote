// Postgres reports which constraint rejected a write; repositories translate the ones they
// expect into results, so callers never see driver errors or constraint names.

interface PostgresError {
  code?: string;
  constraint_name?: string;
}

/** Drizzle wraps driver errors in `cause`; the raw postgres.js error may also surface directly. */
function postgresError(error: unknown): PostgresError | undefined {
  if (typeof error !== 'object' || error === null) return undefined;
  const cause = (error as { cause?: unknown }).cause;
  return (typeof cause === 'object' && cause !== null ? cause : error) as PostgresError;
}

export function isConstraintViolation(error: unknown, constraint: string): boolean {
  return postgresError(error)?.constraint_name === constraint;
}
