/**
 * Module-specific value object example.
 *
 * Status transitions are encoded here (not in the aggregate or use
 * case) so the rules are co-located with the value's definition.
 * Module-specific — does NOT belong in `@wa-kijo/booking-core`.
 */
export type ExampleStatusValue = 'draft' | 'published' | 'archived';

export class ExampleStatus {
  private constructor(public readonly value: ExampleStatusValue) {}

  static draft(): ExampleStatus {
    return new ExampleStatus('draft');
  }
  static published(): ExampleStatus {
    return new ExampleStatus('published');
  }
  static archived(): ExampleStatus {
    return new ExampleStatus('archived');
  }

  isDraft(): boolean {
    return this.value === 'draft';
  }
  isPublished(): boolean {
    return this.value === 'published';
  }
  isArchived(): boolean {
    return this.value === 'archived';
  }

  equals(other: ExampleStatus): boolean {
    return this.value === other.value;
  }
}
