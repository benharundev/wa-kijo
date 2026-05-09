/**
 * Aggregate root example.
 *
 * Demonstrates the canonical shape from ADR-0009:
 * - Constructor is private; static factories enforce invariants on
 *   creation.
 * - State transitions are methods on the aggregate, not on the use
 *   case. Use cases orchestrate; the aggregate enforces its own rules.
 * - The aggregate has zero awareness of NestJS, Prisma, or HTTP.
 */
import { ExampleNotAllowedError } from './errors/example-not-allowed.error';
import { ExampleStatus } from './value-objects/example-status.vo';

export class Example {
  private constructor(
    public readonly id: string,
    public readonly organizationId: string,
    public readonly title: string,
    private _status: ExampleStatus,
  ) {}

  static create(params: { id: string; organizationId: string; title: string }): Example {
    if (params.title.trim().length === 0) {
      throw new ExampleNotAllowedError('Title cannot be empty');
    }
    return new Example(params.id, params.organizationId, params.title, ExampleStatus.draft());
  }

  /** Hydrate from persistence. Bypasses creation invariants. */
  static rehydrate(params: {
    id: string;
    organizationId: string;
    title: string;
    status: ExampleStatus;
  }): Example {
    return new Example(params.id, params.organizationId, params.title, params.status);
  }

  get status(): ExampleStatus {
    return this._status;
  }

  publish(): void {
    if (!this._status.isDraft()) {
      throw new ExampleNotAllowedError(
        `Only draft examples can be published; current state: ${this._status.value}`,
      );
    }
    this._status = ExampleStatus.published();
  }
}
