// Always same-origin: in dev, Vite's dev server proxies /api to
// localhost:4000 (see vite.config.ts); in production, client/vercel.json
// rewrites /api on the Vercel domain to the Render backend. Neither the
// browser nor the access_token cookie ever sees the backend's real domain —
// which matters because Safari blocks cookies set across a genuine
// cross-site request (SameSite=None isn't enough for it), so routing
// everything through one origin sidesteps that instead of fighting it.
const API_BASE = "/api";

// AuthContext registers a handler here so a 401 from *any* call — not just
// the initial /me check — immediately drops the app back to the login page
// (e.g. the cookie expired mid-session) instead of surfacing as a confusing
// error toast wherever it happened to occur.
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    if (res.status === 401) onUnauthorized?.();

    let message = `Request failed with status ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body?.error) message = body.error;
    } catch {
      // response had no JSON body; fall back to the generic message
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    // Needed so the access_token cookie is sent/received even if the app is
    // ever served from a different origin than the API (same-origin fetches
    // already include cookies without this, but it's harmless there too).
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  return parseResponse<T>(res);
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path: string) => request<void>(path, { method: "DELETE" }),
  upload: async (path: string, file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append("file", file);
    // No Content-Type header here — the browser sets the multipart
    // boundary itself when the body is a FormData instance.
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    return parseResponse<{ url: string }>(res);
  },
};
