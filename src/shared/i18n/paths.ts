import { DEFAULT_LOCALE, LOCALE_PREFIX, type Locale } from "./config";

/** As três páginas offline (variantes `public`, `checkout` e `bookings`), sem o prefixo de idioma. */
export const OFFLINE_ROUTES = ["/offline", "/offline/checkout", "/offline/bookings"] as const;

/** Páginas offline (pt-BR sem sufixo de idioma): as únicas rotas que ignoram o cookie de idioma. */
const isOfflineRoute = (pathname: string): boolean =>
  OFFLINE_ROUTES.some((route) => route === pathname);
const EN_PREFIX = LOCALE_PREFIX["en-US"];

/** Segmentos internos (`app/[locale]`): nunca são URL pública. */
const INTERNAL_SEGMENT: Readonly<Record<Locale, string>> = { "pt-BR": "/pt-BR", "en-US": "/en-US" };

type ParsedPath = { locale: Locale; path: string };

const startsWithSegment = (pathname: string, segment: string): boolean =>
  pathname === segment || pathname.startsWith(`${segment}/`);

const stripSegment = (pathname: string, segment: string): string => {
  const rest = pathname.slice(segment.length);
  return rest === "" || rest === "/" ? "/" : rest;
};

/** Separa `pathname` do resto (`?query#hash`) de uma URL relativa. */
const splitSuffix = (href: string): { pathname: string; suffix: string } => {
  const cut = href.search(/[?#]/);
  return cut === -1
    ? { pathname: href, suffix: "" }
    : { pathname: href.slice(0, cut), suffix: href.slice(cut) };
};

/**
 * Lê um caminho **público**: `/en/search` → `{ locale: "en-US", path: "/search" }`. Sem prefixo é
 * pt-BR; `/english` não é prefixo (só `/en` e `/en/...`).
 */
export const parsePublicPath = (pathname: string): ParsedPath =>
  startsWithSegment(pathname, EN_PREFIX)
    ? { locale: "en-US", path: stripSegment(pathname, EN_PREFIX) }
    : { locale: DEFAULT_LOCALE, path: pathname };

const isInternalHref = (href: string): boolean => href.startsWith("/") && !href.startsWith("//");

/**
 * Torna um link interno (`/search?x=1#a`) público no locale: pt-BR não muda, en-US ganha `/en`
 * (`/` vira `/en`). Links externos ou relativos passam intactos.
 */
export const localizePath = (locale: Locale, href: string): string => {
  if (!isInternalHref(href)) return href;
  const prefix = LOCALE_PREFIX[locale];
  if (prefix === "") return href;
  const { pathname, suffix } = splitSuffix(href);
  return `${pathname === "/" ? prefix : `${prefix}${pathname}`}${suffix}`;
};

/** Mesma página no outro idioma: troca o prefixo e preserva `query` e `hash`. */
export const switchLocalePath = (to: Locale, currentHref: string): string => {
  const { pathname, suffix } = splitSuffix(currentHref);
  return localizePath(to, `${parsePublicPath(pathname).path}${suffix}`);
};

/** `true` para `/checkout` e `/en/checkout` (carga de documento com CSP estrita e nonce). */
export const isCheckoutPath = (pathname: string): boolean => {
  const { path } = parsePublicPath(pathname);
  return path === "/checkout" || path.startsWith("/checkout/");
};

/** `alternates.languages` do metadata (hreflang): um link por locale e `x-default` em pt-BR. */
export const alternatesFor = (path: string): Record<string, string> => ({
  "pt-BR": localizePath("pt-BR", path),
  "en-US": localizePath("en-US", path),
  "x-default": localizePath(DEFAULT_LOCALE, path),
});

type LocaleRequest = {
  /** Só o caminho (a query é preservada por quem aplica a decisão). */
  pathname: string;
  /** Valor bruto do cookie `infotera-locale` (qualquer coisa que não seja um locale é ignorada). */
  cookie: string | undefined;
};

export type LocaleResolution =
  | { action: "rewrite"; locale: Locale; pathname: string }
  | { action: "redirect"; status: 307 | 308; pathname: string };

const redirectTo = (status: 307 | 308, pathname: string): LocaleResolution => ({
  action: "redirect",
  status,
  pathname,
});

const rewriteTo = (locale: Locale, publicPath: string): LocaleResolution => ({
  action: "rewrite",
  locale,
  pathname:
    publicPath === "/" ? INTERNAL_SEGMENT[locale] : `${INTERNAL_SEGMENT[locale]}${publicPath}`,
});

/**
 * Decisão do proxy para toda rota de página:
 * - `/pt-BR/...` e `/en-US/...` (segmento interno exposto) → 308 para a URL canônica;
 * - `/en/...` → reescreve para `/en-US/...`;
 * - sem prefixo com cookie `en-US` → 307 para `/en/...`; sem cookie (ou inválido) → reescreve para
 *   `/pt-BR/...`. `Accept-Language` é ignorado de propósito (a URL define o idioma).
 */
export const resolveLocaleRequest = ({ pathname, cookie }: LocaleRequest): LocaleResolution => {
  for (const locale of ["pt-BR", "en-US"] as const) {
    const internal = INTERNAL_SEGMENT[locale];
    if (startsWithSegment(pathname, internal)) {
      return redirectTo(308, localizePath(locale, stripSegment(pathname, internal)));
    }
  }
  const parsed = parsePublicPath(pathname);
  if (parsed.locale === "en-US") return rewriteTo("en-US", parsed.path);
  // A página offline é pré-cacheada pelo service worker na URL pt-BR: o cookie não a redireciona.
  if (cookie === "en-US" && !isOfflineRoute(pathname)) {
    return redirectTo(307, localizePath("en-US", pathname));
  }
  return rewriteTo("pt-BR", pathname);
};

/** As seis páginas offline (3 variantes × 2 idiomas), todas no precache do service worker. */
export const OFFLINE_PATHS: readonly string[] = (["pt-BR", "en-US"] as const).flatMap((locale) =>
  OFFLINE_ROUTES.map((route) => localizePath(locale, route)),
);
