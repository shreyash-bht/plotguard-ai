/**
 * Centralized backend URLs. Only this file reads the env vars; services import
 * from here. The default routes through the Next.js proxy (see next.config.ts),
 * which keeps browser requests same-origin (the backends send no CORS headers).
 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "/api/core";
