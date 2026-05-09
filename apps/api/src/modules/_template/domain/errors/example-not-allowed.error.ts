/**
 * Module-specific domain error. Caught by use cases and translated
 * to HTTP errors at the presentation layer (typically 422 or 409).
 *
 * Domain errors should be granular — `ExampleNotAllowedError` is a
 * placeholder; in real modules prefer specific names like
 * `EmptyTitleError`, `AlreadyPublishedError`, `MaxItemsExceededError`.
 */
export class ExampleNotAllowedError extends Error {
  override readonly name = 'ExampleNotAllowedError';
  constructor(message: string) {
    super(message);
  }
}
