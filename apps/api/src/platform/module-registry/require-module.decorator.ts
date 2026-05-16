import { SetMetadata } from '@nestjs/common';

/**
 * `@RequireModule('slug')` — gates a controller or handler on a
 * tenant having the named module enabled.
 *
 * Per ADR-0008 and `docs/api-conventions.md` § 8, requests to a
 * non-enabled module return **404 Not Found**, not 403 Forbidden —
 * we never disclose the existence of an installed-but-disabled
 * module to a tenant that can't use it.
 */
export const REQUIRE_MODULE_KEY = 'platform.require_module';

export const RequireModule = (slug: string): MethodDecorator & ClassDecorator =>
  SetMetadata(REQUIRE_MODULE_KEY, slug);
