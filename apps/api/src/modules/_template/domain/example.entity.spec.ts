/**
 * MANDATORY TEST-FIRST per ADR-0009.
 *
 * Aggregate invariants are the contract. Enumerate every path the
 * aggregate's state machine can take before adding a method to the
 * aggregate.
 *
 * Replace `it.todo` with real assertions as you implement your
 * module's aggregate. Empty `.todo`s in a real module are a
 * pre-merge blocker.
 */
import { describe, it, expect } from 'vitest';
import { Example } from './example.entity';
import { ExampleNotAllowedError } from './errors/example-not-allowed.error';

describe('Example — creation invariants', () => {
  it('rejects an empty title', () => {
    expect(() => Example.create({ id: 'cmg1', organizationId: 'org_a', title: '' })).toThrow(
      ExampleNotAllowedError,
    );
  });

  it('rejects a whitespace-only title', () => {
    expect(() => Example.create({ id: 'cmg1', organizationId: 'org_a', title: '   ' })).toThrow(
      ExampleNotAllowedError,
    );
  });

  it('creates with status=draft by default', () => {
    const ex = Example.create({ id: 'cmg1', organizationId: 'org_a', title: 'Hello' });
    expect(ex.status.isDraft()).toBe(true);
  });
});

describe('Example.publish — state transition invariants', () => {
  it('publishes a draft', () => {
    const ex = Example.create({ id: 'cmg1', organizationId: 'org_a', title: 'Hello' });
    ex.publish();
    expect(ex.status.isPublished()).toBe(true);
  });

  it.todo('rejects publishing an already-published example');

  it.todo('rejects publishing an archived example');

  it.todo('emits an example.published domain event when transitioning');
});
