/** NestJS DI injection token for the Better Auth instance. */
export const BETTER_AUTH = Symbol('BETTER_AUTH');

/**
 * Opaque type for the Better Auth instance.
 * Using `any` here is intentional — Better Auth's return type is heavily
 * generic and varies with the exact options shape. Consumers that need
 * specific API methods (e.g., `auth.api.getSession`) should cast at the call
 * site rather than fight the generic variance.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type BetterAuthInstance = any;
