import 'server-only';
import pino from 'pino';
import { config } from './config';
import { currentRequestContext } from './request-context';

const prettyInDevelopment =
  config.env === 'development'
    ? { transport: { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss.l' } } }
    : {};

/** Structured JSON logger. Every line logged while serving a request carries its request id. */
export const logger = pino({
  level: config.log.level,
  base: { service: 'armazem-trote' },
  redact: ['req.headers.cookie', '*.phone', '*.street', '*.paymentSignature'],
  mixin() {
    const context = currentRequestContext();
    return context ? { requestId: context.requestId } : {};
  },
  ...prettyInDevelopment,
});

export type Logger = typeof logger;
