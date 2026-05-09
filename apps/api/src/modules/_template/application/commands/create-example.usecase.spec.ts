/**
 * Use case tests are TEST-AFTER acceptable per ADR-0009.
 *
 * Mock the repository at the boundary; let the aggregate's own
 * (test-first) invariant tests cover the domain rules. This test
 * focuses on orchestration:
 * - Was the aggregate created?
 * - Was it persisted via the repository?
 * - (When wired) was the domain event published?
 * - Did persist-then-publish ordering hold?
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateExampleUseCase } from './create-example.usecase';
import type { RequestContext } from '../../../../common/context/request-context';

const ctx: RequestContext = {
  requestId: 'req_test',
  userId: 'user_a',
  orgId: 'org_a',
  orgType: 'WORKSPACE',
  userRole: 'admin',
  globalRole: 'user',
};

describe('CreateExampleUseCase', () => {
  let repo: { save: ReturnType<typeof vi.fn> };
  let usecase: CreateExampleUseCase;

  beforeEach(() => {
    repo = { save: vi.fn().mockResolvedValue(undefined) };
    usecase = new CreateExampleUseCase(repo as never);
  });

  it('persists the new aggregate', async () => {
    const example = await usecase.execute(ctx, { id: 'cmg1', title: 'Hello' });

    expect(repo.save).toHaveBeenCalledOnce();
    expect(repo.save).toHaveBeenCalledWith(ctx, example);
    expect(example.organizationId).toBe('org_a');
  });

  it.todo('publishes ExampleCreatedEvent after persistence');

  it.todo('does NOT publish the event if persistence fails');

  it.todo('rejects creation with an empty title (delegates to aggregate)');
});
