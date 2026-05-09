import { Injectable } from '@nestjs/common';
import type { RequestContext } from '../../../../common/context/request-context';
import type { Example } from '../../domain/example.entity';

/**
 * Resource-level authorization beyond the static RBAC catalogue.
 *
 * Use the policy when "can the user X this resource right now?"
 * depends on resource state, ownership, or temporal conditions —
 * NOT just the user's role.
 *
 * Use `@RequirePermission()` for "does this role hold this permission
 * at all?" — those are coarse, role-based, and live in the
 * permission catalogue.
 *
 * The two layers compose:
 * - Permission gate (decorator) runs first.
 * - Policy is invoked from the use case once the resource is loaded.
 */
@Injectable()
export class ExamplePolicy {
  /**
   * Can the caller publish this specific example?
   *
   * Example rule: only the original author can publish in the first
   * 24 hours; anyone with `example:publish` can publish thereafter.
   */
  canPublish(_ctx: RequestContext, _example: Example): boolean {
    // Real modules implement this. Test-first per ADR-0009.
    return true;
  }
}
