/**
 * Content Security Policy. Funções puras (sem Next, sem `process.env`) para a política estrita do
 * checkout (nonce, via `proxy.ts`) e a política base das demais rotas (`next.config.ts`).
 */

import { TILE_ORIGIN } from "./map-tiles";

type Directive = readonly [name: string, ...values: string[]];

export type CspMode = "production" | "development";

/** Hosts de imagem usados pelo app (Unsplash direto no loader, avatares e tiles do mapa, via `TILE_ORIGIN`). */
export const IMAGE_HOSTS = [
  "https://images.unsplash.com",
  "https://i.pravatar.cc",
  TILE_ORIGIN,
] as const;

/** Política base (todas as rotas sem nonce): só o que não depende de renderização dinâmica. */
export const BASELINE_DIRECTIVES: readonly Directive[] = [
  ["frame-ancestors", "'none'"],
  ["object-src", "'none'"],
  ["base-uri", "'self'"],
  ["form-action", "'self'"],
];

export const serializeCsp = (directives: readonly Directive[]): string =>
  directives.map((directive) => directive.join(" ")).join("; ");

type BuildCspOptions = {
  /** Nonce único por request (base64). Só entra em `script-src` e `style-src*`. */
  nonce: string;
  /** URL da API (`NEXT_PUBLIC_API_URL`); só a origem (sem path) vai para `connect-src`. */
  apiOrigin: string;
  mode: CspMode;
};

const toOrigin = (url: string): string => new URL(url).origin;

/**
 * Política estrita do checkout. Produção: scripts só com nonce + `strict-dynamic`, sem
 * `unsafe-inline`. Desenvolvimento acrescenta o que o Next precisa no HMR (`unsafe-eval`, estilos
 * inline, `ws:`). `style-src-attr 'unsafe-inline'` existe porque o `next/image` emite
 * `style="color:transparent"` e nonce não vale para atributos.
 */
export const buildCsp = ({ nonce, apiOrigin, mode }: BuildCspOptions): string => {
  const isDev = mode === "development";
  const api = toOrigin(apiOrigin);
  const nonceSource = `'nonce-${nonce}'`;
  const styleSources = isDev ? ["'self'", "'unsafe-inline'"] : ["'self'", nonceSource];
  const directives: Directive[] = [
    ["default-src", "'self'"],
    ["script-src", "'self'", nonceSource, "'strict-dynamic'", ...(isDev ? ["'unsafe-eval'"] : [])],
    ["style-src", ...styleSources],
    ["style-src-elem", ...styleSources],
    ["style-src-attr", "'unsafe-inline'"],
    ["img-src", "'self'", "data:", "blob:", ...IMAGE_HOSTS],
    ["font-src", "'self'"],
    // Com `strict-dynamic` em `script-src`, o fallback de `worker-src` ignoraria `'self'` e o registro
    // do service worker numa página aberta em `/checkout` seria bloqueado.
    ["worker-src", "'self'"],
    ["manifest-src", "'self'"],
    ["connect-src", "'self'", api, ...(isDev ? ["ws:"] : [])],
    ["object-src", "'none'"],
    ["base-uri", "'self'"],
    ["form-action", "'self'"],
    ["frame-ancestors", "'none'"],
    ...(api.startsWith("https:") ? [["upgrade-insecure-requests"] as const] : []),
  ];
  return serializeCsp(directives);
};
