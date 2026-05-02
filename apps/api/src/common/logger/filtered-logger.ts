import type { LoggerService } from '@nestjs/common';
import { Logger } from 'nestjs-pino';

/**
 * Wraps the nestjs-pino Logger and suppresses the NestJS 11 + Fastify v5
 * `LegacyRouteConverter` warning:
 *
 *   "Unsupported route path: /api/v1/*"
 *
 * Root cause: NestJS registers internal middleware with a bare `*` wildcard.
 * Combined with the `/api/v1` global prefix this yields `/api/v1/*`, which
 * `LegacyRouteConverter` auto-converts to `{*path}` (correctly) and then
 * emits this informational warning. There is no application code to fix —
 * it is internal to @nestjs/core ≤11.1.19. Suppress until an upstream patch
 * silences it natively.
 */
export class FilteredLogger implements LoggerService {
  constructor(private readonly inner: Logger) {}

  log(message: unknown, ...args: unknown[]): void {
    this.inner.log(message as string, ...args);
  }

  error(message: unknown, ...args: unknown[]): void {
    this.inner.error(message as string, ...args);
  }

  warn(message: unknown, ...args: unknown[]): void {
    if (
      typeof message === 'string' &&
      message.includes('Unsupported route path')
    ) {
      return; // see class comment above
    }
    this.inner.warn(message as string, ...args);
  }

  debug(message: unknown, ...args: unknown[]): void {
    this.inner.debug?.(message as string, ...args);
  }

  verbose(message: unknown, ...args: unknown[]): void {
    this.inner.verbose?.(message as string, ...args);
  }

  fatal(message: unknown, ...args: unknown[]): void {
    this.inner.fatal?.(message as string, ...args);
  }
}
