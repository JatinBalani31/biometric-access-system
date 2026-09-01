import { auth } from './firebase.ts';

/**
 * Single path for every authenticated API call from the admin UI.
 *
 * Previously each component hand-wrote an `x-simulated-role` header, which the
 * server trusted with no credential — anyone could send it. Authentication now
 * rides on the Firebase ID token, and the server decides the caller's role by
 * verifying that token. The UI cannot assert a role any more; it can only prove
 * who it is.
 */

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly body?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Local sandbox escape hatch, matched by ALLOW_SIMULATED_AUTH on the server.
 *
 * Deliberately a runtime origin check rather than `import.meta.env.DEV`: a stray
 * NODE_ENV in `.env` can make that flag true inside a production build, which would
 * silently ship the bypass header to every visitor. A deployed origin is never
 * localhost, so this cannot be mis-compiled into the wrong answer.
 */
function isLocalhost(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
}

async function authHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;

  if (user) {
    // getIdToken() refreshes on its own once the cached token is close to expiry,
    // so a long-lived admin session keeps working without a re-login.
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  }

  if (isLocalhost()) {
    return { 'x-simulated-role': 'company_admin' };
  }

  return {};
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
}

export async function apiFetch<T = any>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;

  const merged: Record<string, string> = {
    ...(await authHeaders()),
    ...((headers as Record<string, string>) ?? {}),
  };

  if (body !== undefined) merged['Content-Type'] = 'application/json';

  const res = await fetch(path, {
    ...rest,
    headers: merged,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // 204 and other empty responses have no JSON to parse.
  const text = await res.text();
  const parsed = text ? safeJson(text) : null;

  if (!res.ok) {
    throw new ApiError(
      parsed?.error || `Request failed (HTTP ${res.status})`,
      res.status,
      parsed?.code,
      parsed
    );
  }

  return parsed as T;
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return { error: text.slice(0, 300) };
  }
}

/** Convenience wrappers so call sites read as intent rather than plumbing. */
export const api = {
  get: <T = any>(path: string) => apiFetch<T>(path),
  post: <T = any>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'POST', body }),
  patch: <T = any>(path: string, body?: unknown) => apiFetch<T>(path, { method: 'PATCH', body }),
  delete: <T = any>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
