import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { GuestSession, GuestUser } from "@/types/user";

interface SessionState {
  user: GuestUser | null;
  /** Bearer token for the core API. Expires after 15 minutes (no refresh yet). */
  token: string | null;
  setSession: (session: GuestSession) => void;
  clearSession: () => void;
  /** Backwards-compatible alias used by the settings/sidebar UI. */
  clearUser: () => void;
}

/**
 * Guest identity + token. Both are persisted so refreshes reuse the same guest.
 * Sessions persisted by the old (token-less) version are discarded on hydrate:
 * the backend now requires a bearer token for every conversation/message call.
 */
export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setSession: (session) =>
        set({ user: session.user, token: session.access_token }),
      clearSession: () => set({ user: null, token: null }),
      clearUser: () => set({ user: null, token: null }),
    }),
    {
      name: "plotguard-session",
      version: 2,
      migrate: (persistedState, version) => {
        if (version < 2) {
          return { user: null, token: null } as SessionState;
        }
        return persistedState as SessionState;
      },
    },
  ),
);
