/**
 * Auth-aware fetch wrapper for TanStack Query.
 *
 * - Always sends `credentials: 'include'` so session cookies are forwarded.
 * - On 401: redirects to /sign-in (client-side) or throws (server-side).
 * - On non-OK: parses the API error shape { error: { code, message, fields } }
 *   and throws an ApiError.
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
      const body = (await res.json()) as {
        error?: { code?: string; message?: string; fields?: Record<string, string[]> };
      };
      code = body.error?.code ?? code;
      message = body.error?.message ?? message;
      fields = body.error?.fields;
    } catch {
      // body was not JSON — use defaults above
    }

    throw new ApiError(code, message, fields, res.status);
  }

  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}
