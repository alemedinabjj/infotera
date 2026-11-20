import { withSerwist } from "@serwist/turbopack";
import type { NextConfig } from "next";
import pkg from "./package.json";
import { BASELINE_DIRECTIVES, serializeCsp } from "./src/shared/lib/csp";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// `/checkout` e `/en/checkout` recebem a política estrita (com nonce) do `proxy.ts`; aqui ela sairia duplicada.
const BASELINE_CSP_SOURCE = "/((?!(?:en/)?checkout(?:/|$)).*)";

// Versão do build: `package.json` + commit (Vercel) ou carimbo do build local. Vira o `buster` do cache
// persistido e o sufixo dos caches do service worker. O carimbo vai para `process.env` para os
// workers do build (que carregam este arquivo de novo) herdarem o mesmo valor.
process.env.INFOTERA_BUILD_STAMP ??= `local-${Date.now().toString(36)}`;
const APP_VERSION = `${pkg.version}+${process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? process.env.INFOTERA_BUILD_STAMP}`;

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_VERSION: APP_VERSION },
  poweredByHeader: false,
  agentRules: false,
  // PPR: no 16.x é `cacheComponents` (F7c, Decisão 1). `partialPrefetching` evita o warning da doc.
  cacheComponents: true,
  partialPrefetching: true,
  // A única Server Action é a reserva: o maior envio possível (3 quartos, hóspedes, contato, cupom) fica
  // bem abaixo de 16 KB. O padrão (1 MB) só convidaria abuso.
  experimental: { serverActions: { bodySizeLimit: "64kb" } },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "i.pravatar.cc", pathname: "/**" },
    ],
  },
  headers: async () => [
    { source: "/:path*", headers: securityHeaders },
    // O navegador não pode guardar o service worker: a versão nova tem de ser vista no próximo registro.
    { source: "/serwist/:path*", headers: [{ key: "Cache-Control", value: "no-cache" }] },
    {
      source: BASELINE_CSP_SOURCE,
      headers: [{ key: "Content-Security-Policy", value: serializeCsp(BASELINE_DIRECTIVES) }],
    },
  ],
};

export default withSerwist(nextConfig);
