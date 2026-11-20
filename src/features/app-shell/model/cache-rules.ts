import { localizePath, parsePublicPath } from "@/shared/i18n/paths";
import { TILE_ORIGIN } from "@/shared/lib/map-tiles";

/**
 * Estratégia de cache do service worker por **allowlist** de rotas: nada é guardado por padrão. A
 * regra é função pura (`cacheRuleFor`), testada aqui e usada pelo `app/sw.ts`.
 */

/** Rotas públicas (sem o prefixo de idioma): `:id` é um segmento qualquer. */
export const PUBLIC_ROUTES = [
  "/",
  "/search",
  "/hotel/:id",
  "/offline",
  "/favorites",
  "/compare",
] as const;

/**
 * Rotas privadas: nunca gravam nada. `/checkout` tem a CSP com nonce do request, `/confirmation/*`
 * e `/my-bookings` têm dado pessoal (nome, e-mail, telefone da reserva).
 */
export const PRIVATE_ROUTES = [
  "/checkout",
  "/confirmation",
  "/confirmation/:id",
  "/my-bookings",
] as const;

export type CacheName = "pages" | "pages-rsc" | "static" | "images" | "tiles";

export type CacheRule =
  /** O service worker não responde: o navegador faz o request normal (POST, API, desconhecido). */
  | { kind: "passthrough" }
  /** Sempre rede, nunca grava; offline, navegação mostra a página offline do idioma. */
  | { kind: "network-only"; offlinePath: string | null }
  | {
      kind: "network-first";
      cache: CacheName;
      timeoutSeconds: number;
      maxEntries: number;
      maxAgeSeconds: number;
      /** Página offline do idioma da URL (só para documentos). */
      offlinePath: string | null;
    }
  | {
      kind: "cache-first";
      cache: CacheName;
      maxEntries: number | null;
      maxAgeSeconds: number | null;
    };

export type CacheRequest = {
  url: string;
  method: string;
  /** `request.mode === "navigate"`: carga de documento. */
  isNavigation: boolean;
  headers: Pick<Headers, "get">;
  /** Origem da API (`NEXT_PUBLIC_API_URL`). */
  apiOrigin: string;
  /** Origem do app (`self.location.origin`). */
  appOrigin: string;
};

const DAY = 86_400;
const PASSTHROUGH: CacheRule = { kind: "passthrough" };
const UNSPLASH_ORIGIN = "https://images.unsplash.com";

const matchesRoute = (routes: readonly string[], path: string): boolean => {
  const clean = path.length > 1 ? path.replace(/\/$/, "") : path;
  return routes.some((route) => {
    if (!route.includes(":")) return route === clean;
    const pattern = route.split("/");
    const parts = clean.split("/");
    return (
      pattern.length === parts.length &&
      pattern.every((segment, index) =>
        segment.startsWith(":") ? Boolean(parts[index]) : segment === parts[index],
      )
    );
  });
};

const safeUrl = (value: string): URL | null => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const isStatic = (path: string): boolean => path.startsWith("/_next/static/");

/** `/confirmation/x`, `/checkout`, `/my-bookings` (e filhos), com ou sem `/en`. */
const isPrivate = (path: string): boolean =>
  matchesRoute(PRIVATE_ROUTES, path) ||
  PRIVATE_ROUTES.some((route) => !route.includes(":") && path.startsWith(`${route}/`));

/**
 * Decide como o service worker trata um request. Ordem (a primeira regra que casa vale):
 * 1. método ≠ GET → passthrough; 2. rota privada (documento ou RSC) → rede, sem gravar;
 * 3. API → passthrough (o dado offline vem do cache persistido do TanStack, uma fonte só);
 * 4. `/_next/static/**` → cache-first; 5. documento público → rede primeiro (3 s) com página offline;
 * 6. RSC público → rede primeiro; 7. imagens do Unsplash e 8. tiles do OSM → cache-first limitado;
 * 9. o resto → passthrough.
 */
export const cacheRuleFor = (request: CacheRequest): CacheRule => {
  if (request.method.toUpperCase() !== "GET") return PASSTHROUGH;
  const url = safeUrl(request.url);
  if (!url) return PASSTHROUGH;

  const sameOrigin = url.origin === request.appOrigin;
  if (sameOrigin) return sameOriginRule(url, request);
  if (url.origin === safeUrl(request.apiOrigin)?.origin) return PASSTHROUGH;
  if (url.origin === UNSPLASH_ORIGIN) {
    return { kind: "cache-first", cache: "images", maxEntries: 60, maxAgeSeconds: 7 * DAY };
  }
  if (url.origin === TILE_ORIGIN) {
    return { kind: "cache-first", cache: "tiles", maxEntries: 300, maxAgeSeconds: 7 * DAY };
  }
  return PASSTHROUGH;
};

const sameOriginRule = (url: URL, request: CacheRequest): CacheRule => {
  const { locale, path } = parsePublicPath(url.pathname);
  const isRsc = request.headers.get("RSC") === "1";
  const isDocument = request.isNavigation;
  const offlinePath = localizePath(locale, "/offline");

  if (isPrivate(path)) {
    return isDocument || isRsc
      ? { kind: "network-only", offlinePath: isDocument ? offlinePath : null }
      : PASSTHROUGH;
  }
  if (isStatic(url.pathname)) {
    return { kind: "cache-first", cache: "static", maxEntries: null, maxAgeSeconds: null };
  }
  if (!matchesRoute(PUBLIC_ROUTES, path)) return PASSTHROUGH;
  if (isDocument) {
    return {
      kind: "network-first",
      cache: "pages",
      timeoutSeconds: 3,
      maxEntries: 40,
      maxAgeSeconds: DAY,
      offlinePath,
    };
  }
  if (isRsc) {
    return {
      kind: "network-first",
      cache: "pages-rsc",
      timeoutSeconds: 3,
      maxEntries: 40,
      maxAgeSeconds: DAY,
      offlinePath: null,
    };
  }
  return PASSTHROUGH;
};
