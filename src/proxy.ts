import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/shared/api/env";
import { buildCsp } from "@/shared/lib/csp";

/** Nonce de 128 bits por request (base64); imprevisível e nunca reutilizado. */
const createNonce = (): string =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));

/**
 * Política estrita com nonce só em `/checkout`: antes de coletar dados de pagamento a página não
 * aceita script inline nem de origem não listada. O nonce exige renderização dinâmica, então as
 * demais rotas ficam de fora (política base do `next.config.ts`).
 */
export const proxy = (request: NextRequest): NextResponse => {
  const nonce = createNonce();
  const csp = buildCsp({
    nonce,
    apiOrigin: env.NEXT_PUBLIC_API_URL,
    mode: process.env.NODE_ENV === "development" ? "development" : "production",
  });

  // O Next lê o nonce da política enviada na request e o aplica nos scripts dele.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  // O documento tem PII e campos de cartão: nada de cache compartilhado nem bfcache de rede.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};

export const config = {
  matcher: [
    {
      source: "/checkout",
      // Prefetch do `next/link` não precisa de nonce.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
