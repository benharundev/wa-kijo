/**
 * MANDATORY before merge per ADR-0005 and ADR-0010:
 *
 *   Every repository ships with a cross-tenant access integration
 *   test. This file is the standardised shape — copy it, replace
 *   `Example` with your aggregate, and ensure all four scenarios
 *   pass against a real Postgres via Testcontainers.
 *
 * The `.itest.ts` extension marks integration tests; vitest's
 * integration config picks them up serially.
 */
import { describe, it } from 'vitest';

describe('ExampleRepository — tenant isolation', () => {
  it.todo('cannot read an Example owned by another organisation');
  it.todo('cannot update an Example owned by another organisation');
  it.todo('cannot soft-delete an Example owned by another organisation');
  it.todo('does not include an Example from another organisation in findAll results');
});
