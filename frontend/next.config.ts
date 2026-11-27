import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

// The repo root contains its own package-lock.json, which makes Turbopack infer
// the wrong workspace root. Pin it to this directory.
const projectDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Backend origin override (server-only env, read when building the proxy table).
 * Keep the browser-facing NEXT_PUBLIC_API_BASE_URL as-is; only migrate this if
 * the core API lives on another host.
 */
const coreBackendOrigin = process.env.CORE_API_ORIGIN ?? "http://localhost:8080";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    root: projectDir,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        // All core endpoints, including auth, live under /api/v1.
        // Browser: /api/core/v1/* -> Spring: /api/v1/*
        // The AI service is internal-only: the browser never calls it directly;
        // chat is proxied by Spring at /api/v1/conversations/{id}/chat.
        source: "/api/core/:path*",
        destination: `${coreBackendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
