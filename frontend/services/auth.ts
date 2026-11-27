import { coreApi } from "@/services/api-client";
import type { GuestSession } from "@/types/user";

/**
 * POST /api/v1/auth/guest-register.
 * Returns a bearer token plus a sanitized user. Callers persist both (see
 * `useSessionStore`); every conversation/message request requires the token.
 */
export function registerGuest(signal?: AbortSignal): Promise<GuestSession> {
  return coreApi.post<GuestSession>("/v1/auth/guest-register", {}, signal);
}
