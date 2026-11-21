import path from "path";
import { fileURLToPath } from "url";
import type { NextConfig } from "next";

// The repo root contains its own package-lock.json, which makes Turbopack infer
// the wrong workspace root. Pin it to this directory.
const projectDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Backend origin overrides (server-only env, read when building the proxy table).
 * Keep the browser-facing NEXT_PUBLIC_* values as-is; only migrate these if the
 * backends live on another host.
 */
const coreBackendOrigin = process.env.CORE_API_ORIGIN ?? "http://localhost:8080";
const aiBackendOrigin = process.env.AI_API_ORIGIN ?? "http://localhost:8000";

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
        source: "/api/core/:path*",
        destination: `${coreBackendOrigin}/api/:path*`,
      },
      {
        // FastAPI AI service keeps /api/ai as its root_path; its routers are
        // versioned under /v1, so /api/ai/v1/* -> /api/ai/v1/*.
        source: "/api/ai/:path*",
        destination: `${aiBackendOrigin}/api/ai/:path*`,
      },
    ];
  },
};

export default nextConfig;
