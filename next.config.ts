import type { NextConfig } from "next";
import { BASELINE_DIRECTIVES, serializeCsp } from "./src/shared/lib/csp";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// `/checkout` e `/en/checkout` recebem a política estrita (com nonce) do `proxy.ts`; aqui ela sairia duplicada.
const BASELINE_CSP_SOURCE = "/((?!(?:en/)?checkout(?:/|$)).*)";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  agentRules: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "i.pravatar.cc", pathname: "/**" },
    ],
  },
  headers: async () => [
    { source: "/:path*", headers: securityHeaders },
    {
      source: BASELINE_CSP_SOURCE,
      headers: [{ key: "Content-Security-Policy", value: serializeCsp(BASELINE_DIRECTIVES) }],
    },
  ],
};

export default nextConfig;
