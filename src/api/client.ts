const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5277";

console.warn("import.meta.env.VITE_API_BASE_URL: ", import.meta.env.VITE_API_BASE_URL);

const ACCESS_TOKEN_KEY = "gymchat_access_token";
const REFRESH_TOKEN_KEY = "gymchat_refresh_token";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshToken(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  // Coalesce concurrent 401s into a single refresh call instead of firing one per failed request.
  refreshInFlight ??= (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) return false;

      const data = (await response.json()) as { accessToken: string; refreshToken: string };
      storeTokens(data.accessToken, data.refreshToken);
      return true;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  skipAuth?: boolean;
}

/**
 * Thin fetch wrapper: attaches the bearer token, retries once after a transparent
 * refresh on 401, and throws ApiError with the response status for callers to handle.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, skipAuth = false } = options;

  const doFetch = async (): Promise<Response> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (!skipAuth) {
      const token = getAccessToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  };

  let response = await doFetch();

  if (response.status === 401 && !skipAuth) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      response = await doFetch();
    }
  }

  if (!response.ok) {
    let message = `Pedido falhou (${response.status})`;
    try {
      const errorBody = (await response.json()) as { error?: string; title?: string };
      message = errorBody.error ?? errorBody.title ?? message;
    } catch {
      // response had no JSON body - keep the generic message
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
