"use client";

import { useCallback, useEffect, useState } from "react";

import { registerGuest } from "@/services/auth";
import { useSessionStore } from "@/stores/session";
import type { GuestUser } from "@/types/user";

export type SessionStatus = "has-user" | "registering" | "failed";

interface SessionResult {
  user: GuestUser | null;
  status: SessionStatus;
  retry: () => void;
}

/**
 * In-flight registerGuest shared across every mount (StrictMode double-effects,
 * multiple tabs of the same page), so at most one guest is ever registered.
 * Cleared when settled so a 401-triggered logout can register a fresh guest.
 */
let inflight: Promise<GuestUser> | null = null;

function ensureGuest(): Promise<GuestUser> {
  const { user, token } = useSessionStore.getState();
  if (user && token) return Promise.resolve(user);
  if (!inflight) {
    inflight = registerGuest()
      .then((session) => {
        useSessionStore.getState().setSession(session);
        return session.user;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

/** Fires guest registration; used for implicit bootstrapping (sidebar). */
export function useGuestSession(): SessionResult {
  const user = useSessionStore((s) => s.user);
  const token = useSessionStore((s) => s.token);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (user && token) return;
    let alive = true;
    ensureGuest()
      .then(() => {
        // The store update re-renders with the user; nothing else to do.
        if (alive) setFailed(false);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [user, token, attempt]);

  // Derived: avoids synchronous setState inside the effect.
  const status: SessionStatus =
    user && token ? "has-user" : failed ? "failed" : "registering";

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { user, status, retry };
}
