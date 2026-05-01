import { SetMetadata } from '@nestjs/common';

/**
 * Mark a controller or route handler as public (no auth required).
 *
 * @example
 *   @Public()
 *   @Get('health')
 *   health() { ... }
 */
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
