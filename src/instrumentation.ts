/**
 * Runs once when the server boots. Invalid configuration stops the process instead of
 * leaving a server up that answers every request with a 500.
 */
export async function register(): Promise<void> {
  // Written as a block (not an early return) so the bundler drops it from Edge builds.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    try {
      await import('@/lib/config');
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
  }
}
