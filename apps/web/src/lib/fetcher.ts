/**
 * Auth-aware fetch wrapper for TanStack Query, aligned with the API's
 * TransformInterceptor + HttpExceptionFilter envelopes.
 *
 * - Always sends `credentials: 'include'` so session cookies are forwarded.
 * - Unwraps `{ success: true, data: T }` and returns T.
 * - On non-OK: parses `{ success: false, error, message, statusCode }`
 *   and throws an ApiError.
 * - On 401: redirects to /sign-in (client-side) or throws (server-side).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string[]>,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  timestamp: string;
}

interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string;
  timestamp: string;
  path?: string;
  fields?: Record<string, string[]>;
}

export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  const res = await fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.location.href = '/sign-in';
    }
    throw new ApiError('UNAUTHORIZED', 'Session expired. Please sign in again.', undefined, 401);
  }

  if (!res.ok) {
    let code = 'UNKNOWN_ERROR';
    let message = `Request failed with status ${res.status}`;
    let fields: Record<string, string[]> | undefined;

    try {
      const body = (await res.json()) as Record<string, unknown>;

      // Standard envelope: { success: false, error: 'BAD_REQUEST', message: '...' }
      if (typeof body.error === 'string') {
        code = body.error;
        if (typeof body.message === 'string') message = body.message;
        if (body.fields && typeof body.fields === 'object') {
          fields = body.fields as Record<string, string[]>;
        }
      } else if (body.error && typeof body.error === 'object') {
        // Legacy nested shape: { error: { code, message, fields } }
        const nested = body.error as {
          code?: unknown;
          message?: unknown;
          fields?: Record<string, string[]>;
        };
        if (typeof nested.code === 'string') code = nested.code;
        if (typeof nested.message === 'string') message = nested.message;
        if (nested.fields) fields = nested.fields;
      }
    } catch {
      // body was not JSON — use defaults above
    }

    throw new ApiError(code, message, fields, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const body = (await res.json()) as ApiSuccessResponse<T> | T;

  // Unwrap the standard success envelope if present. Better Auth routes
  // at /api/auth/* don't use the envelope, so fall back to returning the
  // raw body when the envelope isn't present.
  if (
    body &&
    typeof body === 'object' &&
    'success' in body &&
    (body as ApiSuccessResponse<T>).success === true &&
    'data' in body
  ) {
    return (body as ApiSuccessResponse<T>).data;
  }

  return body as T;
}
