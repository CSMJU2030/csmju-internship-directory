import path from "node:path";
import type { NextConfig } from "next";

/**
 * The frontend is the subsystem's only public origin. /api/* and the three
 * SSO endpoints (auth-contract 5) go on to the NestJS backend, so the callback
 * registered in Core Hub (http://localhost:3218/auth/callback), the state
 * cookie of /auth/login and the HttpOnly session cookie all live on the same
 * origin as these pages.
 *
 * next build bakes these rewrites into the build, so BACKEND_URL is read at
 * build time only: from .env.local in development, and from frontend/Dockerfile
 * (http://api:4000) in the image (standards docs/deployment.md 3.2).
 */
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:4218";

const nextConfig: NextConfig = {
  // The image ships only the traced standalone server (deployment.md 3 · DEP-04).
  output: "standalone",
  // pnpm keeps dependencies at the workspace root (the repo root), so tracing
  // has to start there or the standalone bundle misses them.
  outputFileTracingRoot: path.join(__dirname, ".."),
  poweredByHeader: false,
  // Every subsystem is a sibling *.jowave.com site, so a page there could frame
  // this one with the user's cookie (clickjacking delete/hide buttons).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // "ใกล้ฉัน" asks for the location on this site only.
          { key: "Permissions-Policy", value: "geolocation=(self), camera=(), microphone=()" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` },
      { source: "/auth/login", destination: `${BACKEND_URL}/auth/login` },
      { source: "/auth/callback", destination: `${BACKEND_URL}/auth/callback` },
      { source: "/auth/logout", destination: `${BACKEND_URL}/auth/logout` },
    ];
  },
};

export default nextConfig;
