import { afterAll } from 'vitest';
import { closeConnections } from '@/lib/shutdown';

// Each test file runs in its own worker with its own pool and Redis connection; close them so
// the worker exits promptly.
afterAll(closeConnections);
