import { type NextRequest, NextResponse } from "next/server";
import { env } from "@/shared/api/env";
import { LOCALE_COOKIE } from "@/shared/i18n/config";
import { isCheckoutPath, resolveLocaleRequest } from "@/shared/i18n/paths";
import { buildCsp } from "@/shared/lib/csp";

/** Nonce de 128 bits por request (base64); imprevisível e nunca reutilizado. */
const createNonce = (): string =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));

/** Prefetch do `next/link` não precisa de nonce (nem de CSP): não executa a página. */
const isPrefetch = (request: NextRequest): boolean =>
  request.headers.has("next-router-prefetch") || request.headers.get("purpose") === "prefetch";

/**
 * Política estrita com nonce só em `/checkout` (e `/en/checkout`): antes de coletar dados de
 * pagamento a página não aceita script inline nem de origem não listada. O nonce exige
 * renderização dinâmica, então as demais rotas ficam com a política base do `next.config.ts`.
 */
const strictHeaders = (request: NextRequest): { csp: string; requestHeaders: Headers } => {
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
  return { csp, requestHeaders };
};

/**
 * Proxy único: decide o idioma da URL (reescreve `/x` para `/pt-BR/x` e `/en/x` para `/en-US/x`,
 * redireciona o segmento interno e o cookie de escolha explícita) e, no checkout, aplica a CSP
 * com nonce na request reescrita e na resposta.
 */
export const proxy = (request: NextRequest): NextResponse => {
  const { pathname } = request.nextUrl;
  const resolution = resolveLocaleRequest({
    pathname,
    cookie: request.cookies.get(LOCALE_COOKIE)?.value,
  });
  const target = request.nextUrl.clone();
  target.pathname = resolution.pathname;

  if (resolution.action === "redirect") return NextResponse.redirect(target, resolution.status);
  if (!isCheckoutPath(pathname) || isPrefetch(request)) return NextResponse.rewrite(target);

  const { csp, requestHeaders } = strictHeaders(request);
  const response = NextResponse.rewrite(target, { request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  // O documento tem PII e campos de cartão: nada de cache compartilhado nem bfcache de rede.
  response.headers.set("Cache-Control", "private, no-store");
  return response;
};

/** Toda rota de página; fora ficam assets do Next, o SW, o manifest, os ícones e arquivos com extensão. */
export const config = {
  matcher: [
    "/((?!_next/|serwist(?:/|$)|manifest\\.webmanifest$|icon(?:/|$)|apple-icon(?:/|$)|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|.*\\..*).*)",
  ],
};
