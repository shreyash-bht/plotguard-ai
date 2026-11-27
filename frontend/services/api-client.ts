import { API_BASE_URL } from "@/lib/config";
import { useSessionStore } from "@/stores/session";

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const DEFAULT_TIMEOUT_MS = 30_000;

async function request<T>(base: string, path: string, init?: RequestInit): Promise<T> {
  // Read at request time (not module load) so hydration and re-registration are
  // respected. Cross-origin callers get no token; the core API is same-origin.
  const token = useSessionStore.getState().token;

  let response: Response;
  try {
    response = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: init?.signal ?? AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new ApiError("The request timed out. Please try again.", 0);
    }
    throw new ApiError(
      "Could not reach the server. Check that the backend is running.",
      0,
    );
  }

  if (response.status === 401) {
    // Token expired/invalid: drop the session so the guest boot can re-register
    // a fresh identity instead of retrying with a dead token.
    useSessionStore.getState().clearSession();
    throw new ApiError(
      "Your session expired. Reconnecting with a new guest session.",
      401,
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body: unknown = await response.json();
      if (body && typeof body === "object") {
        const record = body as Record<string, unknown>;
        if (typeof record.error === "string") {
          message = record.error;
        } else if (typeof record.detail === "string") {
          message = record.detail;
        }
      }
    } catch {
      // keep the generic message
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

export interface ApiClient {
  get<T>(path: string, signal?: AbortSignal): Promise<T>;
  post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T>;
  patch<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T>;
  delete(path: string, signal?: AbortSignal): Promise<void>;
}

function createClient(base: string): ApiClient {
  return {
    get: (path, signal) => request(base, path, { method: "GET", signal }),
    post: (path, body, signal) =>
      request(base, path, {
        method: "POST",
        body: JSON.stringify(body ?? {}),
        signal,
      }),
    patch: (path, body, signal) =>
      request(base, path, {
        method: "PATCH",
        body: JSON.stringify(body ?? {}),
        signal,
      }),
    delete: (path, signal) => request<void>(base, path, { method: "DELETE", signal }),
  };
}

/** Spring Boot core API — the only public backend entry point. */
export const coreApi = createClient(API_BASE_URL);
