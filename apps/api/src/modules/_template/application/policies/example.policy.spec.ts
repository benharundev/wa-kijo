/**
 * MANDATORY TEST-FIRST per ADR-0009.
 *
 * Authorization decisions are the most-tested code in any wa-kijo
 * module. Enumerate every (role × resource-state × temporal-condition)
 * triple before adding a policy method.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ExamplePolicy } from './example.policy';
import type { RequestContext } from '../../../../common/context/request-context';

const baseCtx: RequestContext = {
  requestId: 'req_test',
  userId: 'user_a',
  orgId: 'org_a',
  orgType: 'WORKSPACE',
  userRole: 'admin',
  globalRole: 'user',
};

describe('ExamplePolicy.canPublish', () => {
  let policy: ExamplePolicy;
  beforeEach(() => {
    policy = new ExamplePolicy();
  });

  it.todo('owner of the org can always publish');
  it.todo('author within 24h of creation can publish');
  it.todo('non-author within 24h of creation cannot publish, even if admin');
  it.todo('any admin/owner can publish after 24h');
  it.todo('member can never publish');
  it.todo('cannot publish an already-published example regardless of role');
  it.todo('cannot publish an archived example regardless of role');

  // Placeholder so the test file is not empty before the .todos are filled in.
  it('exists and exposes canPublish', () => {
    expect(typeof policy.canPublish).toBe('function');
    // ctx referenced so it is not unused in the lint sense:
    expect(baseCtx.orgId).toBe('org_a');
  });
});
